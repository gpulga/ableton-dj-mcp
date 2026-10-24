// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Whether a start/end pair (loop brace or markers) must write its end first.
 * Live rejects a loop_start past loop_end and silently drops a start_marker
 * past end_marker, so a pair writes its start first unless the new start is at
 * or past the pair's current end. Each pair decides on its own, since the loop
 * brace and the markers can sit apart.
 * @param nextStart - Where the pair's start is going, or null if unchanged
 * @param currentEnd - Where the pair's end is now, or null if unknown
 * @returns True to write the end before the start
 */
export function endMovesFirst(
  nextStart: number | null,
  currentEnd: number | null,
): boolean {
  return nextStart != null && currentEnd != null && nextStart >= currentEnd;
}
