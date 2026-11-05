// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

import { z } from "zod";
import { defineTool } from "#src/tools/shared/tool-framework/define-tool.ts";

export const toolDefContext = defineTool("adj-context", {
  title: "Context",
  description:
    "Read/write project memory as indexed facts or search configured sample folder for audio files.",

  annotations: {
    readOnlyHint: false,
    destructiveHint: true, // write is destructive
  },

  inputSchema: {
    action: z
      .enum(["read", "write", "forget", "search"])
      .describe(
        "read: fact index, or one fact with fact | write: create/replace one fact | forget: remove one fact | search: find audio samples",
      ),

    fact: z
      .string()
      .regex(/^[a-z0-9-]{1,40}$/)
      .optional()
      .describe(
        "kebab-case fact id (read one, write, forget); write default: notes",
      ),

    about: z
      .string()
      .max(120)
      .optional()
      .describe("one-line fact description (write; required for a new fact)"),

    content: z
      .string()
      .max(10_000)
      .optional()
      .describe("fact text (required for write)"),

    search: z
      .string()
      .optional()
      .describe("case-insensitive substring filter (search only)"),
  },
});
