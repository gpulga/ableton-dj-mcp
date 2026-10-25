// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

import { z } from "zod";
import { MAX_CODE_LENGTH, MAX_SPLIT_POINTS } from "#src/tools/constants.ts";
import { defineTool } from "#src/tools/shared/tool-framework/define-tool.ts";

export const toolDefUpdateClip = defineTool("adj-update-clip", {
  title: "Update Clip",
  description: "Update clip(s), MIDI notes, and warp settings (audio clips).",

  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
  },

  inputSchema: {
    // Basic clip properties
    ids: z.coerce.string().describe("comma-separated clip ID(s) to update"),
    name: z
      .string()
      .optional()
      .describe(
        "name for all, or comma-separated for each (extras keep existing name)",
      ),
    color: z
      .string()
      .optional()
      .describe(
        "#RRGGBB for all, or comma-separated for each (cycles if fewer than ids)",
      ),
    timeSignature: z.string().optional().describe("N/D (4/4)"),

    // Clip region and loop settings
    start: z
      .string()
      .optional()
      .describe(
        "bar|beat position where loop/clip region begins; comma-separated for one per id",
      ),
    length: z
      .string()
      .optional()
      .describe(
        "duration in bar:beat (e.g., '4:0' = 4 bars); comma-separated for one per id",
      ),
    looping: z.boolean().optional().describe("enable looping for the clip"),

    legato: z
      .boolean()
      .optional()
      .describe("clip keeps playing when re-launched during playback"),
    muted: z
      .boolean()
      .optional()
      .describe("mute individual clip (distinct from track mute)"),
    velocityAmount: z.coerce
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe("scales all MIDI note velocities (MIDI clips only)"),
    duplicateLoop: z
      .boolean()
      .optional()
      .describe(
        "double the clip's loop length in-place (Live's Duplicate Loop)",
      ),

    firstStart: z
      .string()
      .optional()
      .describe(
        "bar|beat playback start (looping clips, when different from start); comma-separated for one per id",
      ),
    arrangementStart: z
      .string()
      .optional()
      .describe(
        "bar|beat position to move arrangement clip (arrangement clips only)",
      ),
    arrangementLength: z
      .string()
      .optional()
      .describe(
        "duration in bar:beat (e.g., '4:0' = 4 bars), arrangement clips only",
      ),
    toSlot: z.coerce
      .string()
      .optional()
      .describe("trackIndex/sceneIndex to move session clip (e.g., '2/3')"),
    split: z
      .string()
      .optional()
      .describe(
        `comma-separated song positions to split at, like arrangementStart (e.g., '33|1, 41|1'); each clip splits at the ones inside it - max ${MAX_SPLIT_POINTS} points, arrangement clips only`,
      ),

    // Audio clip parameters
    gainDb: z.coerce
      .number()
      .min(-70)
      .max(24)
      .optional()
      .describe("audio clip gain in decibels (ignored for MIDI)"),
    pitchShift: z.coerce
      .number()
      .min(-48)
      .max(48)
      .optional()
      .describe(
        "audio clip pitch shift in semitones, supports decimals (ignored for MIDI)",
      ),
    pitchFine: z.coerce
      .number()
      .min(-100)
      .max(100)
      .optional()
      .describe(
        "audio clip fine pitch in cents, independent of pitchShift's coarse semitones (ignored for MIDI)",
      ),
    ramMode: z
      .boolean()
      .optional()
      .describe(
        "load full audio into RAM, prevents seek glitches on short loops (ignored for MIDI)",
      ),

    warpMode: z
      .enum(["beats", "tones", "texture", "repitch", "complex", "pro"])
      .optional()
      .describe("audio clip warp mode (ignored for MIDI)"),
    warping: z
      .boolean()
      .optional()
      .describe("audio clip warping on/off (ignored for MIDI)"),

    // MIDI note parameters
    notes: z
      .string()
      .optional()
      .describe(
        "MIDI notes in bar|beat notation: [bar|beat] [v0-127] [t<dur>] [p0-1] note(s) - MIDI clips only",
      ),
    transforms: z
      .string()
      .optional()
      .describe("transform expressions (parameter: expression per line)"),
    noteUpdateMode: z
      .enum(["replace", "merge"])
      .optional()
      .default("merge")
      .describe(
        '"replace" (clear all notes first) or "merge" (overlay notes, v0 deletes)',
      ),
    ...(process.env.ENABLE_CODE_EXEC === "true"
      ? {
          code: z
            .string()
            .max(MAX_CODE_LENGTH)
            .optional()
            .describe(
              "JS function body: receives (notes, context), returns notes array (see Skills for properties)",
            ),
        }
      : {}),

    // Quantization parameters
    quantize: z.coerce
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe("quantization strength 0-1 (MIDI clips only)"),
    quantizeGrid: z
      .enum([
        "1/4",
        "1/8",
        "1/8T",
        "1/8+1/8T",
        "1/16",
        "1/16T",
        "1/16+1/16T",
        "1/32",
      ])
      .optional()
      .describe("note grid (required with quantize)"),
    quantizePitch: z
      .string()
      .optional()
      .describe("limit quantization to specific pitch (e.g., C3, D#4)"),

    // Warp marker parameters
    ...(process.env.ENABLE_WARP_MARKERS === "true"
      ? {
          warpOp: z
            .enum(["add", "move", "remove"])
            .optional()
            .describe(
              'warp marker operation: "add" (create at beat), "move" (shift by distance), "remove" (delete at beat)',
            ),
          warpBeatTime: z.coerce
            .number()
            .optional()
            .describe(
              "beat position from clip 1.1.1 (exact value from read-clip for move/remove, target for add)",
            ),
          warpSampleTime: z.coerce
            .number()
            .optional()
            .describe(
              "sample time in seconds (optional for add - omit to preserve timing)",
            ),
          warpDistance: z.coerce
            .number()
            .optional()
            .describe(
              "beats to shift (+forward, -backward) for move operation",
            ),
        }
      : {}),
  },

  smallModelModeConfig: {
    toolDescription: "Update clip(s) and MIDI notes",
    excludeParams: [
      "warpOp",
      "warpBeatTime",
      "warpSampleTime",
      "warpDistance",
      "quantizePitch",
      "firstStart",
      "transforms",
      "split",
      "code",
    ],
    descriptionOverrides: {
      name: "clip name",
      color: "#RRGGBB",
    },
  },
});
