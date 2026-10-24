// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

import { z } from "zod";
import { defineTool } from "#src/tools/shared/tool-framework/define-tool.ts";

export const toolDefCreateTrack = defineTool("adj-create-track", {
  title: "Create Track",
  description: "Create track(s).",
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
  },
  inputSchema: {
    trackIndex: z.coerce
      .number()
      .int()
      .min(-1)
      .optional()
      .describe("0-based index, -1 or omit to append"),
    count: z.coerce
      .number()
      .int()
      .min(1)
      .default(1)
      .describe("number to create"),
    name: z
      .string()
      .optional()
      .describe("name for all, or comma-separated for each"),
    color: z
      .string()
      .optional()
      .describe(
        "#RRGGBB for all, or comma-separated for each (cycles if fewer than count)",
      ),
    type: z.enum(["midi", "audio", "return"]).default("midi").describe("type"),
    mute: z.boolean().optional().describe("muted?"),
    solo: z.boolean().optional().describe("soloed?"),
    arm: z.boolean().optional().describe("record armed?"),
    convert: z
      .enum(["drums", "melody", "harmony", "simpler", "drum-rack"])
      .optional()
      .describe(
        "new track from the audio clip in fromClip, using Live's conversions: drums/melody/harmony = MIDI clip of its notes, simpler = sample in a Simpler, drum-rack = slices on Drum Rack pads. Other params are ignored. Needs the bridge",
      ),
    fromClip: z.coerce
      .string()
      .optional()
      .describe("with convert: audio clip id, or session slot 'track/scene'"),
  },

  smallModelModeConfig: {
    excludeParams: ["count", "mute", "solo", "arm", "convert", "fromClip"],
    descriptionOverrides: {
      name: "track name",
      color: "#RRGGBB",
    },
  },
});
