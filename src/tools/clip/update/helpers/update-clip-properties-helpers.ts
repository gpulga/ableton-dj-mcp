// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

import { endMovesFirst } from "#src/tools/clip/helpers/clip-region-order.ts";

export interface ClipPropsToSet {
  name?: string;
  color?: string;
  signature_numerator?: number | null;
  signature_denominator?: number | null;
  looping?: boolean;
  loop_start?: number;
  loop_end?: number;
  start_marker?: number;
  end_marker?: number;
  legato?: boolean;
  muted?: boolean;
  [key: string]: string | number | boolean | null | undefined;
}

interface RegionWrites {
  start: number | null;
  end: number | null;
  startMarker: number | null;
  writesLoop: boolean;
  writesEndMarker: boolean;
  loopEndFirst: boolean;
  markerEndFirst: boolean;
}

/**
 * Add the region properties in an order Live accepts: ends that must move
 * first, then the starts, then the remaining ends
 * @param propsToSet - Properties object to modify
 * @param region - What to write and in which order
 */
function addRegionProperties(
  propsToSet: ClipPropsToSet,
  region: RegionWrites,
): void {
  const { start, end, startMarker, writesLoop, writesEndMarker } = region;

  const addEnds = (first: boolean): void => {
    if (end == null) return;

    if (writesLoop && region.loopEndFirst === first) {
      propsToSet.loop_end = end;
    }

    if (writesEndMarker && region.markerEndFirst === first) {
      propsToSet.end_marker = end;
    }
  };

  addEnds(true);

  if (writesLoop && start != null) {
    propsToSet.loop_start = start;
  }

  if (startMarker != null) {
    propsToSet.start_marker = startMarker;
  }

  addEnds(false);
}

export interface BuildClipPropertiesArgs {
  name?: string;
  color?: string;
  timeSignature?: string;
  timeSigNumerator: number;
  timeSigDenominator: number;
  startMarkerBeats: number | null;
  looping?: boolean;
  isLooping: boolean;
  startBeats: number | null;
  endBeats: number | null;
  currentLoopEnd: number | null;
  currentEndMarker: number | null;
  legato?: boolean;
  muted?: boolean;
}

/**
 * Build properties map for setAll
 * @param args - Property building arguments
 * @param args.name - Clip name
 * @param args.color - Clip color
 * @param args.timeSignature - Time signature string
 * @param args.timeSigNumerator - Time signature numerator
 * @param args.timeSigDenominator - Time signature denominator
 * @param args.startMarkerBeats - Start marker position in beats
 * @param args.looping - Whether looping is enabled
 * @param args.isLooping - Current looping state
 * @param args.startBeats - Start position in beats
 * @param args.endBeats - End position in beats
 * @param args.currentLoopEnd - Current loop end position in beats
 * @param args.currentEndMarker - Current end marker position in beats
 * @param args.legato - Clip keeps playing when re-launched during playback
 * @param args.muted - Mute individual clip (distinct from track mute)
 * @returns Properties object ready for clip.setAll()
 */
export function buildClipPropertiesToSet({
  name,
  color,
  timeSignature,
  timeSigNumerator,
  timeSigDenominator,
  startMarkerBeats,
  looping,
  isLooping,
  startBeats,
  endBeats,
  currentLoopEnd,
  currentEndMarker,
  legato,
  muted,
}: BuildClipPropertiesArgs): ClipPropsToSet {
  const propsToSet: ClipPropsToSet = {
    name: name,
    color: color,
    signature_numerator: timeSignature != null ? timeSigNumerator : null,
    signature_denominator: timeSignature != null ? timeSigDenominator : null,
  };

  const markerEndFirst = endMovesFirst(startMarkerBeats, currentEndMarker);
  const region: RegionWrites = {
    start: startBeats,
    end: endBeats,
    startMarker: startMarkerBeats,
    writesLoop: (isLooping || looping == null) && looping !== false,
    // A looping clip still moves end_marker when its start_marker is going
    // past it, or Live drops the start and playback begins at the old spot
    writesEndMarker: !isLooping || looping === false || markerEndFirst,
    loopEndFirst: endMovesFirst(startBeats, currentLoopEnd),
    markerEndFirst,
  };

  // The loop brace needs looping on, and Live ignores start_marker writes
  // that depend on the old mode, so turning looping off writes the markers
  // first and flips after; everything else flips first.
  if (looping === false) {
    addRegionProperties(propsToSet, region);
    propsToSet.looping = false;
  } else {
    propsToSet.looping = looping;
    addRegionProperties(propsToSet, region);
  }

  propsToSet.legato = legato;
  propsToSet.muted = muted;

  return propsToSet;
}
