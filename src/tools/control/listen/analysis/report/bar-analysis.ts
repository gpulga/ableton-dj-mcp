// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

// Folds frame features into one row per bar: loudness, band balance,
// brightness, kick/hat hit counts, stereo width and pitch content.

import { at } from "#src/tools/control/listen/analysis/dsp/fft.ts";
import {
  amplitudeToDb,
  channelMeanSquare,
  meanSquareToLufs,
  SILENCE_DB,
} from "#src/tools/control/listen/analysis/dsp/loudness.ts";
import {
  type PitchFrames,
  topPitchClasses,
} from "#src/tools/control/listen/analysis/dsp/pitch-frames.ts";
import {
  BANDS,
  type SpectralFrames,
} from "#src/tools/control/listen/analysis/dsp/spectral-frames.ts";

export interface BarGrid {
  /** Seconds per bar */
  barSeconds: number;
  barCount: number;
  /** Bars per row (row numbers count real bars) */
  barsPerRow?: number;
}

export interface BarRow {
  bar: number;
  lufs: number;
  peakDb: number;
  /** Band power in dB, indexed like BANDS */
  bandsDb: number[];
  centroidHz: number;
  kickHits: number;
  hatHits: number;
  /** L/R correlation: 1 mono, 0 wide, <0 phase problems */
  correlation: number;
  pitches: string[];
  bassNote: string | null;
}

export interface BarInputs {
  raw: Float32Array[];
  weighted: Float32Array[];
  sampleRate: number;
  spectral: SpectralFrames;
  pitch: PitchFrames;
  kickOnsets: number[];
  hatOnsets: number[];
}

/**
 * Build per-bar rows
 * @param inputs - Signals and frame features
 * @param grid - Bar grid
 * @returns One row per bar
 */
export function analyzeBars(inputs: BarInputs, grid: BarGrid): BarRow[] {
  const rows: BarRow[] = [];

  for (let bar = 0; bar < grid.barCount; bar++) {
    const startSec = bar * grid.barSeconds;
    const endSec = startSec + grid.barSeconds;

    rows.push(
      analyzeBar(inputs, bar * (grid.barsPerRow ?? 1) + 1, startSec, endSec),
    );
  }

  return rows;
}

function analyzeBar(
  inputs: BarInputs,
  bar: number,
  startSec: number,
  endSec: number,
): BarRow {
  const { raw, weighted, sampleRate, spectral, pitch } = inputs;
  const start = Math.floor(startSec * sampleRate);
  const end = Math.min(raw[0]?.length ?? 0, Math.floor(endSec * sampleRate));
  const frames = frameIndexes(spectral.times, startSec, endSec);
  const pitchFrames = frameIndexes(pitch.times, startSec, endSec);
  const chroma = sumVectors(pitch.chroma, pitchFrames);
  const bassChroma = sumVectors(pitch.bassChroma, pitchFrames);

  return {
    bar,
    lufs: meanSquareToLufs(channelMeanSquare(weighted, start, end)),
    peakDb: amplitudeToDb(peakOf(raw, start, end)),
    bandsDb: BANDS.map((_, b) =>
      powerToDb(meanOf(spectral.bandPower[b], frames)),
    ),
    centroidHz: meanOf(spectral.centroid, frames),
    kickHits: countWithin(inputs.kickOnsets, startSec, endSec),
    hatHits: countWithin(inputs.hatOnsets, startSec, endSec),
    correlation: stereoCorrelation(raw, start, end),
    pitches: topPitchClasses(chroma, 3),
    bassNote: topPitchClasses(bassChroma, 1, 1)[0] ?? null,
  };
}

/**
 * Convert power to dB
 * @param power - Linear power
 * @returns dB (SILENCE_DB for zero)
 */
export function powerToDb(power: number): number {
  return power > 0 ? Math.max(SILENCE_DB, 10 * Math.log10(power)) : SILENCE_DB;
}

/**
 * L/R correlation over a sample range
 * @param raw - Channels (mono input counts as fully correlated)
 * @param start - First sample
 * @param end - Sample after the last
 * @returns Correlation in -1..1 (1 for silence or mono)
 */
export function stereoCorrelation(
  raw: Float32Array[],
  start: number,
  end: number,
): number {
  const [left, right] = raw;

  if (left == null || right == null) return 1;

  let lr = 0;
  let ll = 0;
  let rr = 0;

  for (let i = start; i < end; i++) {
    const l = at(left, i);
    const r = at(right, i);

    lr += l * r;
    ll += l * l;
    rr += r * r;
  }

  return ll > 0 && rr > 0 ? lr / Math.sqrt(ll * rr) : 1;
}

function frameIndexes(
  times: Float64Array,
  startSec: number,
  endSec: number,
): number[] {
  const indexes: number[] = [];

  for (let f = 0; f < times.length; f++) {
    const t = at(times, f);

    if (t >= startSec && t < endSec) indexes.push(f);
  }

  return indexes;
}

function meanOf(values: Float64Array | undefined, indexes: number[]): number {
  if (values == null || indexes.length === 0) return 0;

  return indexes.reduce((sum, f) => sum + at(values, f), 0) / indexes.length;
}

function sumVectors(vectors: Float64Array[], indexes: number[]): Float64Array {
  const sum = new Float64Array(12);

  for (const f of indexes) {
    const vector = vectors[f];

    if (vector == null) continue;
    for (let i = 0; i < 12; i++) sum[i] = at(sum, i) + at(vector, i);
  }

  return sum;
}

function peakOf(channels: Float32Array[], start: number, end: number): number {
  let peak = 0;

  for (const channel of channels) {
    for (let i = start; i < end; i++)
      peak = Math.max(peak, Math.abs(at(channel, i)));
  }

  return peak;
}

function countWithin(
  times: number[],
  startSec: number,
  endSec: number,
): number {
  return times.filter((t) => t >= startSec && t < endSec).length;
}
