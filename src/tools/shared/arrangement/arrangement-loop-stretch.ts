// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

// Lengthen a looping session clip into the arrangement as one clip (#350).
// The Live API can't stretch an arrangement clip's end, but an arrangement
// clip keeps its span when its loop is shortened afterwards, and
// duplicate_clip_to_arrangement makes a clip as long as the source's loop. So:
// stretch the source loop to the target length, duplicate, then put both
// loops back. Warp markers and clip envelopes come along with the duplicate.

import { toLiveApiId } from "#src/tools/shared/utils.ts";

/**
 * Whether a clip can be laid into the arrangement as one long loop
 * @param clip - Source clip
 * @returns True for a looping session clip
 */
export function canStretchLoop(clip: LiveAPI): boolean {
  return (
    (clip.getProperty("is_arrangement_clip") as number) !== 1 &&
    (clip.getProperty("looping") as number) > 0
  );
}

/**
 * Duplicate a looping session clip into the arrangement as one clip that
 * repeats its loop for the whole length
 * @param sourceClip - Looping session clip
 * @param track - Track to place the clip on
 * @param position - Arrangement position in beats
 * @param length - Arrangement length in beats
 * @returns The new arrangement clip
 */
export function duplicateAsOneLoop(
  sourceClip: LiveAPI,
  track: LiveAPI,
  position: number,
  length: number,
): LiveAPI {
  const loopStart = sourceClip.getProperty("loop_start") as number;
  const loopEnd = sourceClip.getProperty("loop_end") as number;
  const startMarker = sourceClip.getProperty("start_marker") as number;
  // The duplicate plays from the start marker to the loop end before it loops
  const playFrom = Math.max(loopStart, startMarker);

  sourceClip.set("loop_end", playFrom + length);

  let newClip: LiveAPI;

  try {
    const result = track.call(
      "duplicate_clip_to_arrangement",
      toLiveApiId(sourceClip.id),
      position,
    ) as [string, string | number];

    newClip = LiveAPI.from(result);
  } finally {
    sourceClip.set("loop_end", loopEnd);
  }

  newClip.set("loop_end", loopEnd);

  return newClip;
}
