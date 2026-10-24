// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

// Dispatcher wrapper that intercepts browser-aware tool calls and forwards
// them to the Python sidecar over UDP. Other tool calls pass straight through
// to the existing v8 LiveAPI dispatcher.

import { formatErrorResponse } from "#src/shared/mcp-response-utils.ts";
import { handleAutomate } from "#src/tools/clip/automate/automate-handler.ts";
import {
  type ConvertTrackArgs,
  handleConvertClip,
} from "#src/tools/track/create/convert-clip-handler.ts";
import {
  BridgeCallError,
  type BrowserBridgeClient,
  INSTALL_HINT,
} from "./browser-bridge-client.ts";
import { type CallLiveApiFunction } from "./create-mcp-server.ts";
import { type McpResponse } from "./max-api-adapter.ts";

interface BrowseToolArgs {
  category?: string;
  path?: string;
  search?: string;
  depth?: number;
  limit?: number;
}

interface CreateDeviceArgs {
  deviceName?: string;
  path?: string;
  name?: string;
  browserUri?: string;
  focus?: boolean;
}

/**
 * Wrap the v8 dispatcher with bridge-aware handling for browser tools.
 *
 * @param next - Underlying call (forwards to Max v8 over Max API)
 * @param bridge - Browser bridge client (lazy: ping is deferred until use)
 * @returns Wrapped dispatcher with the same callable signature
 */
export function makeBridgeDispatcher(
  next: CallLiveApiFunction,
  bridge: BrowserBridgeClient,
): CallLiveApiFunction {
  const dispatch = async (tool: string, args: object): Promise<object> => {
    if (tool === "adj-browse") {
      return await handleBrowse(bridge, args);
    }

    if (tool === "adj-automate") {
      return await handleAutomate(bridge, next, args);
    }

    if (tool === "adj-create-track" && "convert" in args && args.convert) {
      return await handleConvertClip(bridge, next, args as ConvertTrackArgs);
    }

    if (tool === "adj-create-device") {
      const cdArgs = args as CreateDeviceArgs;

      if (cdArgs.browserUri) {
        return await handleCreateDeviceBrowserUri(bridge, next, cdArgs);
      }
    }

    return await next(tool, args);
  };

  return async (tool: string, args: object): Promise<object> => {
    const result = await dispatch(tool, args);

    if (!READ_ONLY_TOOLS.has(tool)) {
      await closeUndoStep(bridge);
    }

    return result;
  };
}

// Tools that never change the Live Set, so they don't close an undo step
const READ_ONLY_TOOLS = new Set([
  "adj-connect",
  "adj-browse",
  "adj-guide",
  "adj-context",
  "adj-select",
  "adj-read-live-set",
  "adj-read-track",
  "adj-read-scene",
  "adj-read-clip",
  "adj-read-device",
]);

/**
 * Make the tool call just finished one undo step. Live merges every change
 * since the last closed step, so without this Cmd/Ctrl+Z undoes everything
 * since the user last touched Live. Needs the bridge; a no-op without it.
 * @param bridge - Browser bridge client
 */
async function closeUndoStep(bridge: BrowserBridgeClient): Promise<void> {
  try {
    if (await bridge.isAliveCached()) {
      await bridge.endUndoStep();
    }
  } catch {
    // Undo grouping is best-effort; never fail the tool call over it
  }
}

async function handleBrowse(
  bridge: BrowserBridgeClient,
  args: BrowseToolArgs,
): Promise<McpResponse> {
  if (!(await bridge.ensureAlive())) {
    return formatErrorResponse(INSTALL_HINT);
  }

  try {
    const result = await bridge.browse(args);

    return successPayload(result);
  } catch (err) {
    return formatErrorResponse(formatBridgeError("browse", err));
  }
}

async function handleCreateDeviceBrowserUri(
  bridge: BrowserBridgeClient,
  next: CallLiveApiFunction,
  args: CreateDeviceArgs,
): Promise<McpResponse> {
  if (!args.path) {
    return formatErrorResponse(
      "createDevice failed: path is required when using browserUri",
    );
  }

  if (!(await bridge.ensureAlive())) {
    return formatErrorResponse(INSTALL_HINT);
  }

  // Pre-select the target track via the v8 layer so the bridge's load_item
  // lands in the right place. selected_track is the only handle the browser
  // API accepts for routing the load - a device index isn't needed (and
  // often doesn't exist yet, since browserUri loads are usually inserting a
  // brand new device), so parse just the leading track index out of the path.
  const trackIndex = parseTrackIndex(args.path);

  if (trackIndex === null) {
    return formatErrorResponse(
      `createDevice failed: could not parse a track index from path "${args.path}"`,
    );
  }

  const selectArgs: Record<string, unknown> = { trackIndex };
  const selectResult = (await next("adj-select", selectArgs)) as McpResponse;

  if (selectResult.isError) return selectResult;

  // Drum-kit compound: caller passed deviceName=Drum Rack + browserUri. Insert
  // the rack first, then load the kit into the now-focused rack.
  if (args.deviceName) {
    const insertArgs: Record<string, unknown> = {
      deviceName: args.deviceName,
      path: args.path,
    };

    if (args.name != null) insertArgs.name = args.name;
    const insertResult = (await next(
      "adj-create-device",
      insertArgs,
    )) as McpResponse;

    if (insertResult.isError) return insertResult;
  }

  try {
    const result = await bridge.loadItem({ uri: args.browserUri ?? "" });

    return successPayload(result);
  } catch (err) {
    return formatErrorResponse(formatBridgeError("load_item", err));
  }
}

/**
 * Extract the track index from a device-insertion path like "t1" or
 * "t1/d0/c0". Returns null if the path doesn't start with "t<digits>".
 * @param path - Device-insertion path (e.g. "t0", "t1/d0")
 * @returns Parsed track index, or null if unparseable
 */
function parseTrackIndex(path: string): number | null {
  const match = /^t(\d+)/.exec(path);

  if (!match) return null;

  return Number(match[1]);
}

function successPayload(value: unknown): McpResponse {
  return {
    content: [{ type: "text", text: JSON.stringify(value) }],
  };
}

function formatBridgeError(op: string, err: unknown): string {
  if (err instanceof BridgeCallError) {
    return `Bridge ${op} failed [${err.code}]: ${err.message}`;
  }

  if (err instanceof Error) {
    return `Bridge ${op} failed: ${err.message}`;
  }

  return `Bridge ${op} failed: ${String(err)}`;
}
