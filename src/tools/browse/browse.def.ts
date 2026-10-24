// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

import { z } from "zod";
import { defineTool } from "#src/tools/shared/tool-framework/define-tool.ts";

// Categories the Live Application.Browser exposes. Names must match the
// attribute names on the Python Browser instance — they are passed through
// verbatim to the bridge.
const CATEGORY_VALUES = [
  "instruments",
  "audio_effects",
  "midi_effects",
  "drums",
  "sounds",
  "samples",
  "clips",
  "current_project",
  "user_library",
  "user_folders",
  "packs",
  "plugins",
  "max_for_live",
] as const;

export const toolDefBrowse = defineTool("adj-browse", {
  title: "Browse",
  description:
    "Browse Ableton Live's Library and User Library tree. Returns category " +
    "roots, folder children, and loadable items with their stable browser " +
    "URIs. Pair the URI with adj-create-device to load by URI. user_folders " +
    "is Live's Places (your own sample libraries). Requires the " +
    "Live Browser Bridge — install with `npm run install:bridge`.",
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
  },
  inputSchema: {
    category: z
      .enum(CATEGORY_VALUES)
      .optional()
      .describe(
        "browser category root to enter; omit to list available categories",
      ),
    path: z
      .string()
      .optional()
      .describe(
        "slash-separated names walked under the category root (e.g., 'Synths/Operator')",
      ),
    search: z
      .string()
      .optional()
      .describe("case-insensitive substring filter applied to children"),
    recursive: z
      .boolean()
      .optional()
      .describe(
        "with search: match anywhere under path, not just direct children. Hits carry their folder path, plus bpm/key parsed from sample names (e.g. 'Bass_Loop_124_Fm.wav')",
      ),
    depth: z
      .number()
      .int()
      .min(1)
      .max(3)
      .optional()
      .describe("how many child levels to expand inline (default 1)"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(500)
      .optional()
      .describe("maximum number of top-level items to return (default 100)"),
  },
});
