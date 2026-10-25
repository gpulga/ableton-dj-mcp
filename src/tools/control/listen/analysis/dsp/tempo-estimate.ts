// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

// Tempo and beat phase from an onset-strength curve, for analyzing audio
// files whose tempo is unknown. Tuned for steady-tempo dance music.

import { at } from "./fft.ts";

// Search range doubles as the octave prior: dance music sits inside it
const MIN_BPM = 85;
const MAX_BPM = 175;
// Refine over growing spans so a one-frame lag error becomes a small tempo
// error; each step's window stays narrower than the gap to the next beat
const REFINE_SPANS = [2, 4, 8, 16];
const REFINE_WINDOW = 2;

export interface TempoEstimate {
  bpm: number;
  /** Seconds from the file start to the first beat of the grid */
  firstBeatSeconds: number;
}

/**
 * Estimate tempo and beat phase
 * @param strength - Onset strength per frame
 * @param frameRate - Frames per second
 * @returns Tempo estimate, or null when there is no steady pulse
 */
export function estimateTempo(
  strength: Float64Array,
  frameRate: number,
): TempoEstimate | null {
  const envelope = centered(strength);
  const minLag = Math.floor((60 * frameRate) / MAX_BPM);
  const maxLag = Math.ceil((60 * frameRate) / MIN_BPM);

  if (envelope.length < maxLag * 4) return null;

  let bestLag = 0;
  let bestScore = 0;

  for (let lag = minLag; lag <= maxLag; lag++) {
    const score = autocorrelation(envelope, lag);

    if (score > bestScore) {
      bestScore = score;
      bestLag = lag;
    }
  }

  if (bestLag === 0) return null;

  const beatLag = REFINE_SPANS.reduce(
    (lag, beats) => refineLag(envelope, lag, beats),
    bestLag,
  );
  const bpm = (60 * frameRate) / beatLag;
  const beatFrames = (60 * frameRate) / bpm;

  return {
    bpm: Math.round(bpm * 10) / 10,
    firstBeatSeconds: beatPhase(strength, beatFrames) / frameRate,
  };
}

function centered(strength: Float64Array): Float64Array {
  const mean = strength.reduce((sum, v) => sum + v, 0) / strength.length;

  return strength.map((v) => Math.max(0, v - mean));
}

function autocorrelation(envelope: Float64Array, lag: number): number {
  let sum = 0;

  for (let i = lag; i < envelope.length; i++) {
    sum += at(envelope, i) * at(envelope, i - lag);
  }

  return sum / (envelope.length - lag);
}

/**
 * Sharpen a beat lag by locating the autocorrelation peak `beats` beats
 * away, with parabolic interpolation between frames
 * @param envelope - Onset envelope
 * @param beatLag - Current (fractional) beat lag in frames
 * @param beats - How many beats away to look
 * @returns Refined fractional beat lag in frames
 */
function refineLag(
  envelope: Float64Array,
  beatLag: number,
  beats: number,
): number {
  const target = Math.round(beatLag * beats);

  if (target + REFINE_WINDOW + 1 >= envelope.length / 2) return beatLag;

  let best = target;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (let lag = target - REFINE_WINDOW; lag <= target + REFINE_WINDOW; lag++) {
    const score = autocorrelation(envelope, lag);

    if (score > bestScore) {
      bestScore = score;
      best = lag;
    }
  }

  const left = autocorrelation(envelope, best - 1);
  const right = autocorrelation(envelope, best + 1);
  const curvature = left - 2 * bestScore + right;
  const offset = curvature < 0 ? (0.5 * (left - right)) / curvature : 0;

  return (best + offset) / beats;
}

/**
 * Frame offset (within one beat) where onsets line up best with the grid
 * @param strength - Onset strength per frame
 * @param beatFrames - Beat length in frames
 * @returns First beat position in frames
 */
function beatPhase(strength: Float64Array, beatFrames: number): number {
  let bestPhase = 0;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (let phase = 0; phase < beatFrames; phase++) {
    let score = 0;

    for (let t = phase; t < strength.length; t += beatFrames) {
      score += at(strength, Math.round(t));
    }

    if (score > bestScore) {
      bestScore = score;
      bestPhase = phase;
    }
  }

  return bestPhase;
}
