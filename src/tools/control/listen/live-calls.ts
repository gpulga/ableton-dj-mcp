// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

// Calling v8 tools from Node and reading their payloads.

import { type CallLiveApiFunction } from "#src/mcp-server/create-mcp-server.ts";
import { type McpResponse } from "#src/mcp-server/max-api-adapter.ts";
import { parseToolPayload } from "#src/tools/clip/automate/tool-payload.ts";

export const PLAYBACK = "adj-playback";
export const UPDATE_TRACK = "adj-update-track";

/**
 * Call a v8 tool and parse its payload, throwing on tool errors
 * @param next - v8 dispatcher
 * @param tool - Tool name
 * @param args - Tool args (Zod defaults are not applied on this path)
 * @returns Parsed payload
 */
export async function call<T = Record<string, unknown>>(
  next: CallLiveApiFunction,
  tool: string,
  args: Record<string, unknown>,
): Promise<T> {
  const response = (await next(tool, args)) as McpResponse;

  if (response.isError) {
    throw new Error(
      `${tool} failed: ${response.content.map((c) => c.text).join(" ")}`,
    );
  }

  // Max errors arrive as extra "WARNING: ..." items after the payload
  const payload = response.content.filter(
    (item) => !item.text.startsWith("WARNING:"),
  );

  return parseToolPayload({ content: payload }) as T;
}

/**
 * Wait
 * @param ms - Milliseconds
 * @returns Resolves after the delay
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
