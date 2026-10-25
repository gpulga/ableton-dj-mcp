// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

// Pitch-class (chroma) content over time. Uses a long window so low notes
// resolve to the right semitone; time resolution is coarse (~1/6 s).

import { at, framePowerSpectrum, hannWindow } from "./fft.ts";

export const PITCH_FRAME_SIZE = 16_384;
export const PITCH_HOP_SIZE = 8192;

export const PITCH_CLASS_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

const CHROMA_RANGE = { lowHz: 55, highHz: 4000 };
const BASS_RANGE = { lowHz: 30, highHz: 250 };

export interface PitchFrames {
  frameCount: number;
  /** Frame centre time in seconds */
  times: Float64Array;
  /** 12 magnitudes per frame over the full melodic range */
  chroma: Float64Array[];
  /** 12 magnitudes per frame over the bass range */
  bassChroma: Float64Array[];
}

/**
 * Compute chroma frames for a mono signal
 * @param mono - Mono signal
 * @param sampleRate - Sample rate in Hz
 * @returns Chroma per frame
 */
export function computePitchFrames(
  mono: Float32Array,
  sampleRate: number,
): PitchFrames {
  const window = hannWindow(PITCH_FRAME_SIZE);
  const frameCount = Math.max(1, Math.ceil(mono.length / PITCH_HOP_SIZE));
  const binHz = sampleRate / PITCH_FRAME_SIZE;
  const pitchClassOf = pitchClassMap(binHz);
  const chromaBins = binsFor(CHROMA_RANGE, binHz);
  const bassBins = binsFor(BASS_RANGE, binHz);
  const frames: PitchFrames = {
    frameCount,
    times: new Float64Array(frameCount),
    chroma: [],
    bassChroma: [],
  };

  for (let f = 0; f < frameCount; f++) {
    const start = f * PITCH_HOP_SIZE - PITCH_FRAME_SIZE / 2;
    const power = framePowerSpectrum(mono, start, window);

    frames.times[f] = (f * PITCH_HOP_SIZE) / sampleRate;
    frames.chroma.push(foldToChroma(power, pitchClassOf, chromaBins));
    frames.bassChroma.push(foldToChroma(power, pitchClassOf, bassBins));
  }

  return frames;
}

/**
 * Strongest pitch classes in a chroma vector
 * @param chroma - 12 magnitudes
 * @param count - How many to return
 * @param minShare - Drop classes weaker than this share of the strongest
 * @returns Pitch class names, strongest first
 */
export function topPitchClasses(
  chroma: Float64Array,
  count: number,
  minShare = 0.5,
): string[] {
  const max = Math.max(...chroma);

  if (!(max > 0)) return [];

  return [...chroma.keys()]
    .filter((pc) => at(chroma, pc) >= max * minShare)
    .sort((a, b) => at(chroma, b) - at(chroma, a))
    .slice(0, count)
    .map((pc) => PITCH_CLASS_NAMES[pc] as string);
}

function binsFor(
  range: { lowHz: number; highHz: number },
  binHz: number,
): [number, number] {
  return [Math.ceil(range.lowHz / binHz), Math.ceil(range.highHz / binHz)];
}

function pitchClassMap(binHz: number): Int8Array {
  const map = new Int8Array(PITCH_FRAME_SIZE / 2 + 1);

  for (let k = 1; k < map.length; k++) {
    const midi = Math.round(12 * Math.log2((k * binHz) / 440) + 69);

    map[k] = ((midi % 12) + 12) % 12;
  }

  return map;
}

function foldToChroma(
  power: Float64Array,
  pitchClassOf: Int8Array,
  [lo, hi]: [number, number],
): Float64Array {
  const chroma = new Float64Array(12);

  for (let k = lo; k < hi; k++) {
    const pc = pitchClassOf[k] ?? 0;

    chroma[pc] = at(chroma, pc) + Math.sqrt(at(power, k));
  }

  return chroma;
}
