// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

import { abletonBeatsToBarBeatDuration } from "#src/notation/barbeat/time/barbeat-time.ts";
import { endMovesFirst } from "#src/tools/clip/helpers/clip-region-order.ts";
import { type MidiNote } from "#src/tools/clip/helpers/clip-result-helpers.ts";
import { formatSlot } from "#src/tools/shared/validation/position-parsing.ts";

export interface ClipPropertiesToSet {
  [key: string]: unknown; // Required for setAll() compatibility with Record<string, unknown>
  start_marker: number;
  loop_start: number;
  loop_end: number;
  end_marker: number;
  playing_position?: number;
  name?: string;
  color?: string;
  looping?: number;
  signature_numerator?: number;
  signature_denominator?: number;
}

/**
 * Builds the properties object to set on a clip
 * @param startBeats - Loop start position in beats
 * @param endBeats - Loop end position in beats
 * @param firstStartBeats - First playback start position in beats
 * @param looping - Whether the clip is looping
 * @param clipName - Clip name
 * @param color - Clip color in hex format
 * @param timeSigNumerator - Time signature numerator
 * @param timeSigDenominator - Time signature denominator
 * @param clipLength - Default clip length in beats (used when endBeats not specified)
 * @returns Clip properties to set
 */
export function buildClipProperties(
  startBeats: number | null,
  endBeats: number | null,
  firstStartBeats: number | null,
  looping: boolean | null,
  clipName: string | undefined,
  color: string | null,
  timeSigNumerator: number,
  timeSigDenominator: number,
  clipLength: number,
): ClipPropertiesToSet {
  // Use clipLength as default when endBeats not specified
  const start = startBeats ?? 0;
  const effectiveEnd = endBeats ?? clipLength;

  // A fresh clip spans 0..clipLength. Live rejects a loop_start past loop_end
  // and silently drops a start_marker past end_marker, so a start at or past
  // the fresh clip's end needs the ends moved first.
  const propsToSet: ClipPropertiesToSet = endMovesFirst(start, clipLength)
    ? {
        loop_end: effectiveEnd,
        end_marker: effectiveEnd,
        start_marker: start,
        loop_start: start,
      }
    : {
        start_marker: start,
        loop_start: start,
        loop_end: effectiveEnd,
        end_marker: effectiveEnd,
      };

  // Set playing_position (firstStart) only for looping clips
  if (looping && firstStartBeats != null) {
    propsToSet.playing_position = firstStartBeats;
  }

  // Optional properties
  if (clipName) {
    propsToSet.name = clipName;
  }

  if (color != null) {
    propsToSet.color = color;
  }

  if (looping != null) {
    propsToSet.looping = looping ? 1 : 0;
  }

  propsToSet.signature_numerator = timeSigNumerator;
  propsToSet.signature_denominator = timeSigDenominator;

  return propsToSet;
}

export interface ClipResultObject {
  id: string;
  slot?: string;
  trackIndex?: number;
  arrangementStart?: string | null;
  noteCount?: number;
  transformed?: number;
  length?: string;
}

/**
 * Builds the result object for a created clip
 * @param clip - LiveAPI clip object
 * @param trackIndex - Track index
 * @param view - View type (session or arrangement)
 * @param sceneIndex - Scene index for session clips
 * @param arrangementStart - Arrangement start in bar|beat format (explicit position)
 * @param notationString - Original notation string
 * @param notes - Array of MIDI notes
 * @param length - Original length parameter
 * @param timeSigNumerator - Clip time signature numerator
 * @param timeSigDenominator - Clip time signature denominator
 * @param sampleFile - Audio file path (for audio clips)
 * @param transformedCount - Number of notes matched by transform selectors
 * @returns Clip result object
 */
export function buildClipResult(
  clip: LiveAPI,
  trackIndex: number,
  view: string,
  sceneIndex: number | undefined,
  arrangementStart: string | null,
  notationString: string | null,
  notes: MidiNote[],
  length: string | null,
  timeSigNumerator: number,
  timeSigDenominator: number,
  sampleFile: string | null,
  transformedCount?: number,
): ClipResultObject {
  const clipResult: ClipResultObject = {
    id: clip.id,
  };

  // Add view-specific properties
  if (view === "session") {
    clipResult.slot = formatSlot(trackIndex, sceneIndex as number);
  } else {
    clipResult.trackIndex = trackIndex;
    clipResult.arrangementStart = arrangementStart;
  }

  // For MIDI clips: include noteCount if notes were provided
  if (notationString != null) {
    clipResult.noteCount = notes.length;

    if (transformedCount != null) {
      clipResult.transformed = transformedCount;
    }

    // Include calculated length if it wasn't provided as input parameter
    if (length == null) {
      const actualClipLength = clip.getProperty("length") as number;

      clipResult.length = abletonBeatsToBarBeatDuration(
        actualClipLength,
        timeSigNumerator,
        timeSigDenominator,
      );
    }
  }

  // For audio clips: include actual clip length from Live API
  if (sampleFile) {
    const actualClipLength = clip.getProperty("length") as number;

    clipResult.length = abletonBeatsToBarBeatDuration(
      actualClipLength,
      timeSigNumerator,
      timeSigDenominator,
    );
  }

  return clipResult;
}
