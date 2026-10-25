// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

import { z } from "zod";
import { defineTool } from "#src/tools/shared/tool-framework/define-tool.ts";

export const MAX_LISTEN_BARS = 64;

export const toolDefListen = defineTool("adj-listen", {
  title: "Listen",
  description:
    "Record N bars of the live mix (or one track) in real time and analyze it, or analyze an audio file. " +
    "Returns per-bar loudness, band balance, brightness, kick/hat-range hits, stereo correlation, " +
    "pitches, a key estimate and a spectrogram image. Recording takes as long as the bars play. " +
    "Use it to check a change by ear-proxy: capture, change, capture again, compare.",

  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
  },

  inputSchema: {
    bars: z.coerce
      .number()
      .int()
      .min(1)
      .max(MAX_LISTEN_BARS)
      .optional()
      .describe(
        "bars to record (default 8); with file, bars from its start (default all)",
      ),
    trackIndex: z.coerce
      .number()
      .int()
      .min(0)
      .optional()
      .describe("record this track's output instead of the master"),
    startTime: z
      .string()
      .optional()
      .describe(
        "bar|beat to play the arrangement from; omit to record what is playing now",
      ),
    startLocator: z
      .string()
      .optional()
      .describe("locator ID or name to play the arrangement from"),
    mute: z
      .string()
      .optional()
      .describe(
        "comma-separated track indexes to mute while recording (restored after); capture with and without to isolate a track",
      ),
    file: z
      .string()
      .optional()
      .describe(
        "absolute path of an audio file to analyze instead of recording (WAV/AIFF; other formats need ffmpeg)",
      ),
    tempo: z.coerce
      .number()
      .min(20)
      .max(999)
      .optional()
      .describe(
        "bar grid tempo for file analysis (default: the Live Set tempo)",
      ),
    spectrogram: z
      .boolean()
      .default(true)
      .describe("include a spectrogram image"),
    keep: z
      .boolean()
      .default(false)
      .describe(
        "keep the recording track and clip in the set (default: deleted after analysis)",
      ),
  },
});
