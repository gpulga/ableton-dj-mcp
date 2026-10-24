// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

// adj-create-track with `convert`: build a new track from an audio clip using
// Live's own conversions (drums/melody/harmony to MIDI, Simpler, Drum Rack).
// Live.Conversions is Python-only, so this runs through the bridge; the clip's
// location comes from the v8 layer via adj-read-clip.

import {
  type AutomationClipRef,
  BridgeCallError,
  type BrowserBridgeClient,
  type ConvertClipResult,
  type ConvertKind,
  INSTALL_HINT,
} from "#src/mcp-server/browser-bridge-client.ts";
import { type CallLiveApiFunction } from "#src/mcp-server/create-mcp-server.ts";
import { type McpResponse } from "#src/mcp-server/max-api-adapter.ts";
import { barBeatToAbletonBeats } from "#src/notation/barbeat/time/barbeat-time.ts";
import {
  formatErrorResponse,
  formatSuccessResponse,
} from "#src/shared/mcp-response-utils.ts";
import { parseToolPayload } from "#src/tools/clip/automate/tool-payload.ts";
import { parseTimeSignature } from "#src/tools/shared/utils.ts";

/** Live builds the new track on a later tick, about a second for most clips */
const NEW_TRACK_POLL_MS = 250;
const NEW_TRACK_TIMEOUT_MS = 15_000;
const CONVERT_TIMEOUT_MS = 30_000;
const TRACK_IDS_TIMEOUT_MS = 1_500;

export interface ConvertTrackArgs {
  convert: ConvertKind;
  fromClip?: string;
}

interface ClipLocation {
  id?: string | null;
  type?: string;
  view?: "session" | "arrangement";
  slot?: string;
  trackIndex?: number | null;
  arrangementStart?: string;
}

interface WaitOptions {
  pollMs?: number;
  timeoutMs?: number;
}

/**
 * Handle adj-create-track with `convert`
 * @param bridge - Bridge client
 * @param next - v8 dispatcher, for reading the clip
 * @param args - Tool args
 * @param wait - Polling overrides (tests)
 * @returns The new track's index and the conversion kind
 */
export async function handleConvertClip(
  bridge: BrowserBridgeClient,
  next: CallLiveApiFunction,
  args: ConvertTrackArgs,
  wait: WaitOptions = {},
): Promise<McpResponse> {
  if (args.fromClip == null) {
    return formatErrorResponse(
      "createTrack failed: convert needs fromClip (a clip id or session slot like '0/3')",
    );
  }

  if (!(await bridge.ensureAlive())) {
    return formatErrorResponse(INSTALL_HINT);
  }

  const readArgs = args.fromClip.includes("/")
    ? { slot: args.fromClip }
    : { clipId: args.fromClip };
  const read = (await next("adj-read-clip", readArgs)) as McpResponse;

  if (read.isError) return read;

  try {
    const clip = parseToolPayload(read) as ClipLocation;
    const ref = await clipRef(next, clip, args.fromClip);
    const { trackIdsBefore } = await bridge.send<ConvertClipResult>(
      "convert_clip",
      { clip: ref, kind: args.convert },
      CONVERT_TIMEOUT_MS,
    );
    const trackIndex = await waitForNewTrack(bridge, trackIdsBefore, wait);

    return formatSuccessResponse({
      trackIndex,
      convert: args.convert,
      fromClip: args.fromClip,
    });
  } catch (err) {
    const reason =
      err instanceof BridgeCallError
        ? `[${err.code}] ${err.message}`
        : (err as Error).message;

    return formatErrorResponse(`createTrack convert failed: ${reason}`);
  }
}

/**
 * Bridge address of the clip: its slot in Session, its start in Arrangement
 * @param next - v8 dispatcher, for the song's time signature
 * @param clip - adj-read-clip payload
 * @param fromClip - What the caller passed, for messages
 * @returns Clip ref the bridge resolves
 */
async function clipRef(
  next: CallLiveApiFunction,
  clip: ClipLocation,
  fromClip: string,
): Promise<AutomationClipRef> {
  if (clip.id == null) {
    throw new Error(`no clip at ${fromClip}`);
  }

  if (clip.type !== "audio") {
    throw new Error(
      `only an audio clip can be converted (${fromClip} is ${clip.type})`,
    );
  }

  if (clip.view === "arrangement" && clip.trackIndex != null) {
    // arrangementStart is in the song's time signature
    const liveSet = parseToolPayload(
      (await next("adj-read-live-set", {})) as McpResponse,
    ) as { timeSignature?: string };
    const { numerator, denominator } = parseTimeSignature(
      liveSet.timeSignature ?? "4/4",
    );

    return {
      trackIndex: clip.trackIndex,
      arrangementStartBeats: barBeatToAbletonBeats(
        clip.arrangementStart ?? "1|1",
        numerator,
        denominator,
      ),
    };
  }

  const [trackIndex, sceneIndex] = (clip.slot ?? "")
    .split("/")
    .map((part) => Number.parseInt(part));

  if (
    trackIndex == null ||
    sceneIndex == null ||
    Number.isNaN(trackIndex) ||
    Number.isNaN(sceneIndex)
  ) {
    throw new Error(`could not locate clip ${fromClip}`);
  }

  return { trackIndex, sceneIndex };
}

/**
 * Poll the Set's tracks until one appears that wasn't there before
 * @param bridge - Bridge client
 * @param before - Track ids before the conversion
 * @param wait - Polling interval and timeout
 * @param wait.pollMs - Milliseconds between polls
 * @param wait.timeoutMs - Milliseconds before giving up
 * @returns Index of the new track
 */
async function waitForNewTrack(
  bridge: BrowserBridgeClient,
  before: string[],
  { pollMs = NEW_TRACK_POLL_MS, timeoutMs = NEW_TRACK_TIMEOUT_MS }: WaitOptions,
): Promise<number> {
  const known = new Set(before);
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, pollMs));

    const { trackIds } = await bridge.send<{ trackIds: string[] }>(
      "track_ids",
      {},
      TRACK_IDS_TIMEOUT_MS,
    );
    const index = trackIds.findIndex((id) => !known.has(id));

    if (index !== -1) return index;
  }

  throw new Error(
    "Live started the conversion but no new track appeared; check Live for a dialog or error",
  );
}
