// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

// Parsing helpers for tool responses returned by the v8 dispatcher. The
// adapter serializes results as strict JSON when the jsonOutput config is on,
// but defaults to a compact JS literal with unquoted keys — both must parse.

import { type McpResponse } from "#src/mcp-server/max-api-adapter.ts";

/**
 * Parse a tool response payload, tolerating both output modes.
 * @param response - MCP response from the v8 layer
 * @returns Parsed payload object
 */
export function parseToolPayload(response: McpResponse): unknown {
  const text = extractText(response);

  try {
    return JSON.parse(text);
  } catch {
    return JSON.parse(quoteCompactLiteralKeys(text));
  }
}

/**
 * Extract the last text content item (warnings are prepended as extra items).
 * @param response - MCP response
 * @returns Text of the payload item
 */
function extractText(response: McpResponse): string {
  const item = response.content.at(-1);

  if (item?.type !== "text") {
    throw new Error("unexpected tool response shape");
  }

  return item.text;
}

/**
 * Convert compact JS literal syntax to JSON by quoting bare keys. Walks the
 * string tracking JSON-escaped string state, so keys inside string values are
 * never touched.
 * @param text - Compact literal text (unquoted keys, JSON-escaped strings)
 * @returns JSON-parseable text
 */
export function quoteCompactLiteralKeys(text: string): string {
  let out = "";
  let inString = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i] as string;

    if (inString) {
      out += ch;

      if (ch === "\\") {
        out += text[++i] ?? "";
      } else if (ch === '"') {
        inString = false;
      }

      continue;
    }

    if (ch === '"') {
      inString = true;
      out += ch;

      continue;
    }

    out += ch;

    if (ch === "{" || ch === ",") {
      const key = /^[A-Za-z_$][\w$]*(?=:)/.exec(text.slice(i + 1));

      if (key) {
        out += `"${key[0]}"`;
        i += key[0].length;
      }
    }
  }

  return out;
}
