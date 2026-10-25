// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

// The compact clip summary adj-duplicate returns for each clip it creates.

import { abletonBeatsToBarBeat } from "#src/notation/barbeat/time/barbeat-time.ts";
import { livePath } from "#src/shared/live-api-path-builders.ts";
import { formatSlot } from "#src/tools/shared/validation/position-parsing.ts";

export interface MinimalClipInfo {
  id: string;
  slot?: string;
  trackIndex?: number;
  arrangementStart?: string;
  name?: string;
}

/**
 * Get minimal clip information for result objects
 * @param clip - The clip to get info from
 * @param omitFields - Optional fields to omit from result
 * @returns Minimal clip info object
 */
export function getMinimalClipInfo(
  clip: LiveAPI,
  omitFields: string[] = [],
): MinimalClipInfo {
  const isArrangementClip =
    (clip.getProperty("is_arrangement_clip") as number) > 0;

  if (isArrangementClip) {
    const trackIndex = clip.trackIndex;

    if (trackIndex == null) {
      throw new Error(
        `getMinimalClipInfo failed: could not determine trackIndex for clip (path="${clip.path}")`,
      );
    }

    const arrangementStartBeats = clip.getProperty("start_time") as number;
    // Convert to bar|beat format using song time signature
    const liveSet = LiveAPI.from(livePath.liveSet);
    const timeSigNum = liveSet.getProperty("signature_numerator") as number;
    const timeSigDenom = liveSet.getProperty("signature_denominator") as number;
    const arrangementStart = abletonBeatsToBarBeat(
      arrangementStartBeats,
      timeSigNum,
      timeSigDenom,
    );

    const result: MinimalClipInfo = {
      id: clip.id,
    };

    if (!omitFields.includes("trackIndex")) {
      result.trackIndex = trackIndex;
    }

    if (!omitFields.includes("arrangementStart")) {
      result.arrangementStart = arrangementStart;
    }

    return result;
  }

  const trackIndex = clip.trackIndex;
  const sceneIndex = clip.sceneIndex;

  if (trackIndex == null || sceneIndex == null) {
    throw new Error(
      `getMinimalClipInfo failed: could not determine trackIndex/sceneIndex for clip (path="${clip.path}")`,
    );
  }

  const result: MinimalClipInfo = {
    id: clip.id,
  };

  if (!omitFields.includes("slot")) {
    result.slot = formatSlot(trackIndex, sceneIndex);
  }

  return result;
}
