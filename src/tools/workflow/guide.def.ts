// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

import { z } from "zod";
import { GUIDE_TOPIC_NAMES } from "#src/skills/guides.ts";
import { defineTool } from "#src/tools/shared/tool-framework/define-tool.ts";

export const toolDefGuide = defineTool("adj-guide", {
  title: "Guide",
  description:
    "Genre and production guidance on demand. adj-connect lists the topics; fetch one before that kind of work.",

  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
  },

  inputSchema: {
    topic: z.enum(GUIDE_TOPIC_NAMES).describe("guide topic"),
  },
});
