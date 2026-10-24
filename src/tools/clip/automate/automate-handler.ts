// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

// Node-side orchestration for adj-automate. Clip envelope write/read APIs are
// Python-remote-script-only (absent from the M4L LOM whitelist), so all
// envelope work forwards to the bridge; clip metadata comes from the v8 layer
// via next("adj-read-clip"). See
// docs/findings/dev/device/clip-envelope-api-python-only.md.

import {
  type AutomationClipRef,
  type AutomationTarget,
  BridgeCallError,
  type BrowserBridgeClient,
  INSTALL_HINT,
} from "#src/mcp-server/browser-bridge-client.ts";
import { type CallLiveApiFunction } from "#src/mcp-server/create-mcp-server.ts";
import { type McpResponse } from "#src/mcp-server/max-api-adapter.ts";
import {
  abletonBeatsToBarBeat,
  barBeatToAbletonBeats,
  timeSigToAbletonBeatsPerBar,
} from "#src/notation/barbeat/time/barbeat-time.ts";
import {
  formatErrorResponse,
  formatSuccessResponse,
} from "#src/shared/mcp-response-utils.ts";
import { parseDevicePathSegments } from "./device-path-segments.ts";
import { parsePoints } from "./points-dsl.ts";
import {
  type AutomationRecipe,
  generateRecipePoints,
  RECIPE_TARGET_RULES,
} from "./recipes.ts";
import {
  type AutomationPoint as BridgePoint,
  type AutomationShape,
  densify,
} from "./shapes.ts";
import { parseToolPayload } from "./tool-payload.ts";

export interface AutomateToolArgs {
  action?: "write" | "read" | "clear" | "clear-all";
  clipId?: string;
  slot?: string;
  devicePath?: string;
  paramName?: string;
  points?: string;
  shape?: AutomationShape;
  recipe?: AutomationRecipe;
  clear?: boolean;
}

interface ClipInfo {
  ref: AutomationClipRef;
  timeSigNumerator: number;
  timeSigDenominator: number;
  startBeats: number;
  endBeats: number;
}

interface ReadClipPayload {
  id?: string | null;
  view?: "session" | "arrangement";
  slot?: string;
  timeSignature?: string;
  start?: string;
  end?: string;
}

const STALE_BRIDGE_HINT =
  "Bridge is outdated and missing the automation ops. Rerun " +
  "`npm run install:bridge`, restart Live, and re-enable the control surface.";

/**
 * Handle an adj-automate tool call end to end.
 * @param bridge - UDP client for the Python bridge
 * @param next - Underlying v8 dispatcher for clip metadata reads
 * @param args - Tool arguments (already Zod-validated at the MCP layer)
 * @returns MCP response with the bridge result or a formatted error
 */
export async function handleAutomate(
  bridge: BrowserBridgeClient,
  next: CallLiveApiFunction,
  args: AutomateToolArgs,
): Promise<McpResponse> {
  const action = args.action ?? "write";

  if (!(await bridge.ensureAlive())) {
    return formatErrorResponse(INSTALL_HINT);
  }

  try {
    const clipInfo = await resolveClipInfo(next, args);

    if (isErrorResponse(clipInfo)) return clipInfo;

    return await runAction(bridge, action, args, clipInfo);
  } catch (err) {
    return formatErrorResponse(formatAutomateError(err));
  }
}

/**
 * Narrow a resolveClipInfo result to the passthrough error case.
 * @param value - Clip info or an error response to surface verbatim
 * @returns True when the value is an MCP error response
 */
function isErrorResponse(value: ClipInfo | McpResponse): value is McpResponse {
  return "content" in value;
}

/**
 * Dispatch the resolved call to the right bridge op.
 * @param bridge - UDP client for the Python bridge
 * @param action - Validated tool action
 * @param args - Tool arguments
 * @param clipInfo - Resolved clip reference and timing
 * @returns MCP success response
 */
async function runAction(
  bridge: BrowserBridgeClient,
  action: NonNullable<AutomateToolArgs["action"]>,
  args: AutomateToolArgs,
  clipInfo: ClipInfo,
): Promise<McpResponse> {
  if (action === "clear-all") {
    return formatSuccessResponse(
      await bridge.automationClear({ clip: clipInfo.ref }),
    );
  }

  const target = resolveTarget(args, clipInfo);

  if (action === "clear") {
    return formatSuccessResponse(
      await bridge.automationClear({ clip: clipInfo.ref, target }),
    );
  }

  if (action === "read") {
    const result = await bridge.automationRead({ clip: clipInfo.ref, target });

    return formatSuccessResponse({
      ...result,
      points: result.points.map(
        ([timeBeats, value]) =>
          `${abletonBeatsToBarBeat(timeBeats, clipInfo.timeSigNumerator, clipInfo.timeSigDenominator)}:${round(value)}`,
      ),
    });
  }

  const anchors =
    args.recipe == null
      ? await resolveAnchorValues(bridge, clipInfo, target, args)
      : undefined;
  const points = buildWritePoints(args, clipInfo, anchors);

  return formatSuccessResponse(
    await bridge.automationWrite({
      clip: clipInfo.ref,
      target,
      points,
      clearFirst: args.clear === true,
      // Read back how Live labels the points the caller gave
      echo: anchors?.map(([, value]) => value),
    }),
  );
}

/**
 * The points DSL as anchors with normalized values, mapping display values
 * ("1200Hz", "-12dB") through the param's own labels on the bridge
 * @param bridge - UDP client for the Python bridge
 * @param clipInfo - Resolved clip timing
 * @param target - Parameter the points are for
 * @param args - Tool arguments
 * @returns Anchors in Ableton beats with normalized values
 */
async function resolveAnchorValues(
  bridge: BrowserBridgeClient,
  clipInfo: ClipInfo,
  target: AutomationTarget,
  args: AutomateToolArgs,
): Promise<BridgePoint[]> {
  if (args.points == null) {
    throw new Error("points (or recipe) is required for write");
  }

  const parsed = parsePoints(args.points);
  const displays = parsed
    .map((point) => point.value)
    .filter((value): value is string => typeof value === "string");
  const mapped =
    displays.length > 0
      ? await bridge.automationValues({
          clip: clipInfo.ref,
          target,
          displays,
        })
      : [];
  let next = 0;

  return parsed.map(({ barBeat, value }) => [
    barBeatToAbletonBeats(
      barBeat,
      clipInfo.timeSigNumerator,
      clipInfo.timeSigDenominator,
    ),
    typeof value === "string" ? (mapped[next++] as number) : value,
  ]);
}

/**
 * Resolve clip location and timing via the v8 layer.
 * @param next - Underlying v8 dispatcher
 * @param args - Tool arguments carrying clipId or slot
 * @returns Clip info, or the error response to surface verbatim
 */
async function resolveClipInfo(
  next: CallLiveApiFunction,
  args: AutomateToolArgs,
): Promise<ClipInfo | McpResponse> {
  if (args.clipId == null && args.slot == null) {
    throw new Error("either clipId or slot is required");
  }

  const readArgs: Record<string, unknown> = { include: ["timing"] };

  if (args.clipId != null) readArgs.clipId = args.clipId;
  else readArgs.slot = args.slot;

  const response = (await next("adj-read-clip", readArgs)) as McpResponse;

  if (response.isError) return response;

  const payload = parseToolPayload(response) as ReadClipPayload;

  if (payload.id == null) {
    throw new Error(`no clip at slot ${args.slot}`);
  }

  const [timeSigNumerator, timeSigDenominator] = parseTimeSignature(
    payload.timeSignature,
  );

  const ref = resolveClipRef(payload);

  return {
    ref,
    timeSigNumerator,
    timeSigDenominator,
    startBeats: barBeatToAbletonBeats(
      payload.start ?? "1|1",
      timeSigNumerator,
      timeSigDenominator,
    ),
    endBeats: barBeatToAbletonBeats(
      payload.end ?? "1|1",
      timeSigNumerator,
      timeSigDenominator,
    ),
  };
}

/**
 * Build the bridge clip ref from the read-clip payload.
 * @param payload - Parsed read-clip response
 * @returns Bridge-addressable clip reference
 */
function resolveClipRef(payload: ReadClipPayload): AutomationClipRef {
  if (payload.view === "arrangement") {
    // Verified in Live 12.4.3: automation_envelope raises "Not a session
    // clip" for arrangement clips even from the Python API.
    throw new Error(
      "automation envelopes are only supported on session clips — Live's API rejects arrangement clips",
    );
  }

  if (payload.slot == null) {
    throw new Error("session clip is missing its slot");
  }

  const [trackIndex, sceneIndex] = payload.slot
    .split("/")
    .map((part) => Number.parseInt(part));

  if (
    trackIndex == null ||
    sceneIndex == null ||
    Number.isNaN(trackIndex) ||
    Number.isNaN(sceneIndex)
  ) {
    throw new Error(`could not parse clip slot "${payload.slot}"`);
  }

  return { trackIndex, sceneIndex };
}

/**
 * Resolve the automation target from devicePath/paramName or recipe defaults.
 * @param args - Tool arguments
 * @param clipInfo - Resolved clip info (for track matching)
 * @returns Bridge parameter target
 */
function resolveTarget(
  args: AutomateToolArgs,
  clipInfo: ClipInfo,
): AutomationTarget {
  if (args.devicePath != null) {
    if (!args.paramName) {
      throw new Error("paramName is required when devicePath is set");
    }

    const segments = parseDevicePathSegments(args.devicePath);

    if (segments.trackIndex !== clipInfo.ref.trackIndex) {
      throw new Error(
        `devicePath track t${segments.trackIndex} does not match the clip's track t${clipInfo.ref.trackIndex}`,
      );
    }

    return {
      kind: "device",
      chain: segments.chain,
      paramName: args.paramName,
    };
  }

  if (args.paramName) return parseMixerParamName(args.paramName);

  return defaultTargetForRecipe(args.recipe);
}

/**
 * Map a mixer parameter name to a bridge target.
 * @param paramName - "Volume", "Pan"/"Panning", or "Send A"/"Send B"/...
 * @returns Mixer target
 */
function parseMixerParamName(paramName: string): AutomationTarget {
  const name = paramName.trim().toLowerCase();

  if (name === "volume") return { kind: "mixer", param: "volume" };

  if (name === "pan" || name === "panning") {
    return { kind: "mixer", param: "panning" };
  }

  const sendMatch = /^send\s+([a-l])$/.exec(name);

  if (sendMatch) {
    const letter = sendMatch[1] as string;

    return {
      kind: "mixer",
      param: "send",
      sendIndex: letter.charCodeAt(0) - "a".charCodeAt(0),
    };
  }

  throw new Error(
    `unknown mixer param "${paramName}" — use 'Volume', 'Pan', or 'Send A'..'Send L', or set devicePath for device params`,
  );
}

/**
 * Pick the documented default target for a recipe, or refuse to guess.
 * @param recipe - Recipe name when provided
 * @returns Mixer target for defaulting recipes
 */
function defaultTargetForRecipe(recipe?: AutomationRecipe): AutomationTarget {
  const rule = recipe == null ? undefined : RECIPE_TARGET_RULES[recipe];

  if (rule === "mixer-volume") return { kind: "mixer", param: "volume" };

  if (rule === "send-a") return { kind: "mixer", param: "send", sendIndex: 0 };

  if (rule === "explicit") {
    throw new Error(
      `recipe "${recipe}" requires an explicit devicePath + paramName (it never guesses which parameter to sweep)`,
    );
  }

  throw new Error("paramName is required (or devicePath + paramName)");
}

/**
 * Produce the final point run for a write: recipe or points anchors + shape.
 * @param args - Tool arguments
 * @param clipInfo - Resolved clip timing for conversions
 * @param anchors - Points DSL anchors with normalized values (non-recipe)
 * @returns Points in Ableton beats with normalized values
 */
function buildWritePoints(
  args: AutomateToolArgs,
  clipInfo: ClipInfo,
  anchors: BridgePoint[] | undefined,
): BridgePoint[] {
  if (args.recipe != null || anchors == null) {
    return generateRecipePoints(
      args.recipe as AutomationRecipe,
      clipInfo.startBeats,
      clipInfo.endBeats,
      timeSigToAbletonBeatsPerBar(
        clipInfo.timeSigNumerator,
        clipInfo.timeSigDenominator,
      ),
    );
  }

  for (let i = 1; i < anchors.length; i++) {
    const current = anchors[i] as BridgePoint;
    const previous = anchors[i - 1] as BridgePoint;

    if (current[0] <= previous[0]) {
      throw new Error("points must be in ascending bar|beat order");
    }
  }

  return densify(anchors, args.shape ?? "linear");
}

/**
 * Parse a "N/D" time signature string.
 * @param timeSignature - e.g. "4/4"; defaults to 4/4 when missing
 * @returns [numerator, denominator]
 */
function parseTimeSignature(timeSignature?: string): [number, number] {
  if (timeSignature == null) return [4, 4];

  const match = /^(\d+)\/(\d+)$/.exec(timeSignature);

  if (!match) {
    throw new Error(`could not parse time signature "${timeSignature}"`);
  }

  return [
    Number.parseInt(match[1] as string),
    Number.parseInt(match[2] as string),
  ];
}

/**
 * Format any thrown error, mapping bridge errors to actionable hints.
 * @param err - Thrown value
 * @returns User-facing error message
 */
function formatAutomateError(err: unknown): string {
  if (err instanceof BridgeCallError) {
    if (err.code === "INVALID_ARGS" && err.message.includes("unknown op")) {
      return STALE_BRIDGE_HINT;
    }

    return `Bridge automation failed [${err.code}]: ${err.message}`;
  }

  if (err instanceof Error) return `automate failed: ${err.message}`;

  return `automate failed: ${String(err)}`;
}

/**
 * Round a normalized value for compact read output.
 * @param value - Normalized 0..1 value
 * @returns Value rounded to 3 decimal places
 */
function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
