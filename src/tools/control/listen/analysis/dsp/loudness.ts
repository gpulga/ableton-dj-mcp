// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

// ITU-R BS.1770-4 loudness: K-weighting, gated integrated loudness, loudness
// range (EBU Tech 3342), and 4x oversampled true peak.

import { at } from "./fft.ts";

interface Biquad {
  b0: number;
  b1: number;
  b2: number;
  a1: number;
  a2: number;
}

const BLOCK_SECONDS = 0.4;
const SHORT_TERM_SECONDS = 3;
const STEP_SECONDS = 0.1;
const ABSOLUTE_GATE_LUFS = -70;
const LUFS_OFFSET = -0.691;

export const SILENCE_DB = -120;

/**
 * Apply the BS.1770 K-weighting pre-filter (high shelf + high pass)
 * @param samples - One channel
 * @param sampleRate - Sample rate in Hz
 * @returns Filtered copy
 */
export function kWeight(
  samples: Float32Array,
  sampleRate: number,
): Float32Array {
  return applyBiquad(
    applyBiquad(samples, shelfFilter(sampleRate)),
    highPassFilter(sampleRate),
  );
}

/**
 * Convert a summed channel mean square to LUFS
 * @param meanSquare - Sum over channels of K-weighted mean square
 * @returns Loudness in LUFS (SILENCE_DB for silence)
 */
export function meanSquareToLufs(meanSquare: number): number {
  return meanSquare > 0
    ? LUFS_OFFSET + 10 * Math.log10(meanSquare)
    : SILENCE_DB;
}

/**
 * Sum of per-channel mean squares over a sample range
 * @param channels - K-weighted channels
 * @param start - First sample
 * @param end - Sample after the last
 * @returns Summed mean square
 */
export function channelMeanSquare(
  channels: Float32Array[],
  start: number,
  end: number,
): number {
  const length = end - start;

  if (length <= 0) return 0;

  let sum = 0;

  for (const channel of channels) {
    let acc = 0;

    for (let i = start; i < end; i++) {
      const sample = channel[i] ?? 0;

      acc += sample * sample;
    }

    sum += acc / length;
  }

  return sum;
}

/**
 * Integrated loudness with absolute and relative gating
 * @param weighted - K-weighted channels
 * @param sampleRate - Sample rate in Hz
 * @returns Integrated loudness in LUFS
 */
export function integratedLoudness(
  weighted: Float32Array[],
  sampleRate: number,
): number {
  const blocks = blockMeanSquares(weighted, sampleRate, BLOCK_SECONDS);

  return gatedMean(blocks, -10);
}

/**
 * Loudness range: spread between the 10th and 95th percentile of gated
 * short-term loudness
 * @param weighted - K-weighted channels
 * @param sampleRate - Sample rate in Hz
 * @returns Loudness range in LU
 */
export function loudnessRange(
  weighted: Float32Array[],
  sampleRate: number,
): number {
  const blocks = blockMeanSquares(weighted, sampleRate, SHORT_TERM_SECONDS);
  const absoluteGated = blocks.filter(
    (ms) => meanSquareToLufs(ms) > ABSOLUTE_GATE_LUFS,
  );

  if (absoluteGated.length === 0) return 0;

  const relativeGate = meanSquareToLufs(average(absoluteGated)) - 20;
  const loudness = absoluteGated
    .map((ms) => meanSquareToLufs(ms))
    .filter((lufs) => lufs > relativeGate)
    .sort((a, b) => a - b);

  return percentile(loudness, 0.95) - percentile(loudness, 0.1);
}

/**
 * True peak via 4x oversampling (windowed-sinc interpolation)
 * @param channels - Raw (unweighted) channels
 * @returns Highest inter-sample peak in dBTP
 */
export function truePeakDb(channels: Float32Array[]): number {
  const taps = interpolationTaps();
  let samplePeak = 0;

  for (const channel of channels) {
    for (let i = 0; i < channel.length; i++) {
      samplePeak = Math.max(samplePeak, Math.abs(at(channel, i)));
    }
  }

  // Inter-sample overshoot is a few dB at most, so only samples within
  // CANDIDATE_RATIO of the sample peak can set the true peak
  const threshold = samplePeak * CANDIDATE_RATIO;
  let peak = samplePeak;

  for (const channel of channels) {
    for (let i = 0; i < channel.length; i++) {
      if (
        Math.abs(at(channel, i)) < threshold &&
        Math.abs(at(channel, i + 1)) < threshold
      ) {
        continue;
      }

      for (const phase of taps) {
        let acc = 0;

        for (let k = 0; k < phase.length; k++) {
          acc += at(phase, k) * at(channel, i - k + TAP_CENTER);
        }

        peak = Math.max(peak, Math.abs(acc));
      }
    }
  }

  return amplitudeToDb(peak);
}

/**
 * Convert linear amplitude to dB
 * @param amplitude - Linear amplitude
 * @returns dB (SILENCE_DB for zero)
 */
export function amplitudeToDb(amplitude: number): number {
  return amplitude > 0
    ? Math.max(SILENCE_DB, 20 * Math.log10(amplitude))
    : SILENCE_DB;
}

const TAP_COUNT = 16;
// -6 dB
const CANDIDATE_RATIO = 0.5;
const TAP_CENTER = TAP_COUNT / 2;
const OVERSAMPLE = 4;

function interpolationTaps(): Float64Array[] {
  const phases: Float64Array[] = [];

  for (let p = 1; p < OVERSAMPLE; p++) {
    const fraction = p / OVERSAMPLE;
    const phase = new Float64Array(TAP_COUNT);

    for (let k = 0; k < TAP_COUNT; k++) {
      const x = k - TAP_CENTER + fraction;
      const sinc = Math.sin(Math.PI * x) / (Math.PI * x);
      const hann = 0.5 + 0.5 * Math.cos((Math.PI * x) / (TAP_CENTER + 1));

      phase[k] = sinc * hann;
    }

    phases.push(phase);
  }

  return phases;
}

function blockMeanSquares(
  weighted: Float32Array[],
  sampleRate: number,
  seconds: number,
): number[] {
  const length = weighted[0]?.length ?? 0;
  const step = Math.round(STEP_SECONDS * sampleRate);
  const segmentsPerBlock = Math.round(seconds / STEP_SECONDS);
  const blockSize = segmentsPerBlock * step;

  // Shorter than one block: measure what there is
  if (length < blockSize) {
    return length > 0 ? [channelMeanSquare(weighted, 0, length)] : [];
  }

  // Blocks overlap; sum each 100 ms segment once and slide over them
  const segments: number[] = [];

  for (let start = 0; start + step <= length; start += step) {
    segments.push(channelMeanSquare(weighted, start, start + step) * step);
  }

  const blocks: number[] = [];
  let energy = 0;

  for (let i = 0; i < segments.length; i++) {
    energy += segments[i] ?? 0;

    if (i >= segmentsPerBlock) energy -= segments[i - segmentsPerBlock] ?? 0;
    if (i >= segmentsPerBlock - 1) blocks.push(energy / blockSize);
  }

  return blocks;
}

function gatedMean(blocks: number[], relativeOffset: number): number {
  const absoluteGated = blocks.filter(
    (ms) => meanSquareToLufs(ms) > ABSOLUTE_GATE_LUFS,
  );

  if (absoluteGated.length === 0) return SILENCE_DB;

  const relativeGate =
    meanSquareToLufs(average(absoluteGated)) + relativeOffset;
  const gated = absoluteGated.filter(
    (ms) => meanSquareToLufs(ms) > relativeGate,
  );

  return meanSquareToLufs(average(gated));
}

function average(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / Math.max(1, values.length);
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;

  const index = Math.min(
    sorted.length - 1,
    Math.round(p * (sorted.length - 1)),
  );

  return sorted[index] ?? 0;
}

function shelfFilter(sampleRate: number): Biquad {
  const fc = 1681.974_450_955_533;
  const gainDb = 3.999_843_853_973_347;
  const q = 0.707_175_236_955_419_6;
  const k = Math.tan((Math.PI * fc) / sampleRate);
  const vh = 10 ** (gainDb / 20);
  const vb = vh ** 0.499_666_774_154_541_6;
  const a0 = 1 + k / q + k * k;

  return {
    b0: (vh + (vb * k) / q + k * k) / a0,
    b1: (2 * (k * k - vh)) / a0,
    b2: (vh - (vb * k) / q + k * k) / a0,
    a1: (2 * (k * k - 1)) / a0,
    a2: (1 - k / q + k * k) / a0,
  };
}

function highPassFilter(sampleRate: number): Biquad {
  const fc = 38.135_470_876_024_44;
  const q = 0.500_327_037_323_877_3;
  const k = Math.tan((Math.PI * fc) / sampleRate);
  const a0 = 1 + k / q + k * k;

  return {
    b0: 1,
    b1: -2,
    b2: 1,
    a1: (2 * (k * k - 1)) / a0,
    a2: (1 - k / q + k * k) / a0,
  };
}

function applyBiquad(
  input: Float32Array,
  { b0, b1, b2, a1, a2 }: Biquad,
): Float32Array {
  const output = new Float32Array(input.length);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;

  for (let i = 0; i < input.length; i++) {
    const x = at(input, i);
    const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;

    output[i] = y;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
  }

  return output;
}
