// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

// Onset picking on a spectral flux curve: local maxima above an adaptive
// threshold, at least MIN_GAP_SECONDS apart.

import { at } from "./fft.ts";

const MEDIAN_RADIUS = 8;
const PEAK_RADIUS = 2;
const THRESHOLD_SCALE = 1.5;
// Fraction of the loudest flux peak a hit must reach (ignores bleed/noise)
const FLOOR_SHARE = 0.1;
const MIN_GAP_SECONDS = 0.08;

/**
 * Find onset times in a flux curve
 * @param flux - Onset strength per frame
 * @param times - Frame times in seconds
 * @returns Onset times in seconds
 */
export function pickOnsets(flux: Float64Array, times: Float64Array): number[] {
  const floor = Math.max(...flux, 0) * FLOOR_SHARE;
  const onsets: number[] = [];

  if (!(floor > 0)) return onsets;

  for (let f = 0; f < flux.length; f++) {
    const value = at(flux, f);
    const time = at(times, f);

    if (
      value > floor &&
      value > localMedian(flux, f) * THRESHOLD_SCALE &&
      isLocalMax(flux, f) &&
      time - (onsets.at(-1) ?? Number.NEGATIVE_INFINITY) >= MIN_GAP_SECONDS
    ) {
      onsets.push(time);
    }
  }

  return onsets;
}

function localMedian(flux: Float64Array, f: number): number {
  const lo = Math.max(0, f - MEDIAN_RADIUS);
  const hi = Math.min(flux.length, f + MEDIAN_RADIUS + 1);
  const window = [...flux.subarray(lo, hi)].sort((a, b) => a - b);

  return window[Math.floor(window.length / 2)] ?? 0;
}

function isLocalMax(flux: Float64Array, f: number): boolean {
  const value = at(flux, f);

  for (let d = -PEAK_RADIUS; d <= PEAK_RADIUS; d++) {
    const neighbour = f + d;

    if (d === 0 || neighbour < 0 || neighbour >= flux.length) continue;

    // Ties go to the earliest frame
    if (d < 0 ? at(flux, neighbour) >= value : at(flux, neighbour) > value) {
      return false;
    }
  }

  return true;
}
