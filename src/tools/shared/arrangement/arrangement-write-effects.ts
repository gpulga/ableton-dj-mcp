// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

// What a write to the arrangement did to the clips already on the track. Live
// makes room by deleting, trimming or splitting them and reports none of it,
// so the track is scanned before the write and compared after (#350).

import { abletonBeatsToBarBeat } from "#src/notation/barbeat/time/barbeat-time.ts";
import { livePath } from "#src/shared/live-api-path-builders.ts";
import * as console from "#src/shared/v8-max-console.ts";

const EPSILON = 0.001;

interface ClipSpan {
  id: string;
  start: number;
  end: number;
}

export interface TrackSnapshot {
  trackIndex: number;
  clips: ClipSpan[];
}

/**
 * Scan a track's arrangement clips before a write
 * @param trackIndex - Track about to be written to
 * @returns The clips and their spans
 */
export function snapshotArrangementTrack(trackIndex: number): TrackSnapshot {
  return { trackIndex, clips: scanTrack(trackIndex) };
}

/**
 * Warn about each clip that was on the track before the write and that the
 * write deleted, shortened or split. Clips the write itself created or moved
 * are left out: they describe themselves in the result.
 * @param before - Snapshot from before the write
 * @param written - Ids of the clips the write created or moved
 * @returns The messages that were warned
 */
export function warnArrangementWriteEffects(
  before: TrackSnapshot,
  written: readonly string[],
): string[] {
  const ours = new Set(written);
  const wasThere = new Set(before.clips.map((clip) => clip.id));
  const after = scanTrack(before.trackIndex);
  const nowById = new Map(after.map((clip) => [clip.id, clip]));
  // A new id inside an old span is what Live kept of that clip: the tail of a
  // split, or the rest after a front trim
  const remnants = after.filter(
    (clip) => !ours.has(clip.id) && !wasThere.has(clip.id),
  );
  const at = positionFormatter(before.trackIndex);
  const messages: string[] = [];

  for (const was of before.clips) {
    if (ours.has(was.id)) continue;

    const effect = effectOnClip(was, nowById.get(was.id), remnants, at);

    if (effect != null) messages.push(effect);
  }

  for (const message of messages) {
    console.warn(message);
  }

  return messages;
}

/**
 * What the write did to one clip that was already there
 * @param was - Its span before
 * @param now - Its span after, or undefined when its id is gone
 * @param remnants - New clips neither the write nor the snapshot accounts for
 * @param at - Formats a beat position as "bar|beat on track N"
 * @returns The effect, or undefined when the clip was left alone
 */
function effectOnClip(
  was: ClipSpan,
  now: ClipSpan | undefined,
  remnants: readonly ClipSpan[],
  at: (beats: number) => string,
): string | undefined {
  const inside = remnants.filter(
    (clip) =>
      clip.start > was.start + EPSILON && clip.start < was.end - EPSILON,
  );

  if (now == null) {
    // A front trim re-creates what is left under a new id, ending where the
    // old clip ended
    const rest = inside.find((clip) => Math.abs(clip.end - was.end) <= EPSILON);

    return rest == null
      ? `arrangement write overwrote the clip at ${at(was.start)}`
      : `arrangement write shortened the clip at ${at(was.start)}; it now starts at ${at(rest.start)}`;
  }

  const tail = inside[0];

  if (tail != null) {
    return `arrangement write split the clip at ${at(was.start)}; its tail is now a separate clip at ${at(tail.start)}`;
  }

  if (
    Math.abs(now.start - was.start) > EPSILON ||
    Math.abs(now.end - was.end) > EPSILON
  ) {
    return `arrangement write shortened the clip at ${at(was.start)}`;
  }

  return undefined;
}

/**
 * @param trackIndex - Track to scan
 * @returns Its arrangement clips with their spans
 */
function scanTrack(trackIndex: number): ClipSpan[] {
  return LiveAPI.from(livePath.track(trackIndex))
    .getChildren("arrangement_clips")
    .map((clip) => ({
      id: clip.id,
      start: clip.getProperty("start_time") as number,
      end: clip.getProperty("end_time") as number,
    }));
}

/**
 * @param trackIndex - Track the positions are on
 * @returns Formatter for "bar|beat on track N" in the song's time signature
 */
function positionFormatter(trackIndex: number): (beats: number) => string {
  const liveSet = LiveAPI.from(livePath.liveSet);
  const numerator = liveSet.getProperty("signature_numerator") as number;
  const denominator = liveSet.getProperty("signature_denominator") as number;

  return (beats) =>
    `${abletonBeatsToBarBeat(beats, numerator, denominator)} on track ${trackIndex}`;
}
