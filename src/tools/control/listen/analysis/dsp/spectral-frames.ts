// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

// Short-time spectral features of a mono signal: band power, brightness,
// onset strength in the kick and hat ranges, and a log-frequency spectrogram.
// Pitch content uses a separate long-window pass (see pitch-frames.ts).

import { at, framePowerSpectrum, hannWindow } from "./fft.ts";

export const FRAME_SIZE = 4096;
export const HOP_SIZE = 1024;
export const SPECTROGRAM_BINS = 128;
export const SPECTROGRAM_MIN_HZ = 30;
export const SPECTROGRAM_MAX_HZ = 16_000;

export const BANDS = [
  { name: "sub", lowHz: 20, highHz: 60 },
  { name: "bass", lowHz: 60, highHz: 250 },
  { name: "lowMid", lowHz: 250, highHz: 500 },
  { name: "mid", lowHz: 500, highHz: 2000 },
  { name: "presence", lowHz: 2000, highHz: 6000 },
  { name: "air", lowHz: 6000, highHz: 20_000 },
] as const;

export type BandName = (typeof BANDS)[number]["name"];

// Kick fundamentals and hat/shaker energy, for onset counting
const KICK_RANGE = { lowHz: 30, highHz: 150 };
const HAT_RANGE = { lowHz: 6000, highHz: 16_000 };

export interface SpectralFrames {
  sampleRate: number;
  frameCount: number;
  /** Frame centre time in seconds */
  times: Float64Array;
  /** Power per band per frame, indexed like BANDS */
  bandPower: Float64Array[];
  /** Spectral centroid in Hz per frame */
  centroid: Float64Array;
  /** Positive spectral flux in the kick range */
  kickFlux: Float64Array;
  /** Positive spectral flux in the hat range */
  hatFlux: Float64Array;
  /** Log-frequency power, SPECTROGRAM_BINS per frame */
  spectrogram: Float32Array[];
}

/**
 * Run the STFT over a mono signal and collect per-frame features
 * @param mono - Mono signal
 * @param sampleRate - Sample rate in Hz
 * @returns Per-frame features
 */
export function computeSpectralFrames(
  mono: Float32Array,
  sampleRate: number,
): SpectralFrames {
  const window = hannWindow(FRAME_SIZE);
  const frameCount = Math.max(1, Math.ceil(mono.length / HOP_SIZE));
  const binHz = sampleRate / FRAME_SIZE;
  const bandRanges = BANDS.map((band) => binRange(band, binHz));
  const kickBins = binRange(KICK_RANGE, binHz);
  const hatBins = binRange(HAT_RANGE, binHz);
  const logBinOf = logBinMap(binHz);

  const frames: SpectralFrames = {
    sampleRate,
    frameCount,
    times: new Float64Array(frameCount),
    bandPower: BANDS.map(() => new Float64Array(frameCount)),
    centroid: new Float64Array(frameCount),
    kickFlux: new Float64Array(frameCount),
    hatFlux: new Float64Array(frameCount),
    spectrogram: [],
  };

  let previous: Float64Array | null = null;

  for (let f = 0; f < frameCount; f++) {
    // Centre the first frame on sample 0 so frame times line up with the grid
    const start = f * HOP_SIZE - FRAME_SIZE / 2;
    const power = framePowerSpectrum(mono, start, window);

    frames.times[f] = (f * HOP_SIZE) / sampleRate;

    for (const [b, [lo, hi]] of bandRanges.entries()) {
      (frames.bandPower[b] as Float64Array)[f] = sumRange(power, lo, hi);
    }

    frames.centroid[f] = centroid(power, binHz);
    frames.kickFlux[f] = previous ? positiveFlux(power, previous, kickBins) : 0;
    frames.hatFlux[f] = previous ? positiveFlux(power, previous, hatBins) : 0;
    frames.spectrogram.push(logSpectrum(power, logBinOf));
    previous = power;
  }

  return frames;
}

/**
 * Inclusive-exclusive FFT bin range covering a frequency range
 * @param range - Frequency range
 * @param range.lowHz - Lower edge in Hz
 * @param range.highHz - Upper edge in Hz
 * @param binHz - Hz per bin
 * @returns [firstBin, endBin)
 */
export function binRange(
  range: { lowHz: number; highHz: number },
  binHz: number,
): [number, number] {
  const maxBin = FRAME_SIZE / 2 + 1;

  return [
    Math.min(maxBin, Math.ceil(range.lowHz / binHz)),
    Math.min(maxBin, Math.ceil(range.highHz / binHz)),
  ];
}

function sumRange(power: Float64Array, lo: number, hi: number): number {
  let sum = 0;

  for (let k = lo; k < hi; k++) sum += at(power, k);

  return sum;
}

function centroid(power: Float64Array, binHz: number): number {
  let weighted = 0;
  let total = 0;

  for (let k = 1; k < power.length; k++) {
    weighted += k * binHz * at(power, k);
    total += at(power, k);
  }

  return total > 0 ? weighted / total : 0;
}

function positiveFlux(
  power: Float64Array,
  previous: Float64Array,
  [lo, hi]: [number, number],
): number {
  let flux = 0;

  for (let k = lo; k < hi; k++) {
    const rise = Math.sqrt(at(power, k)) - Math.sqrt(at(previous, k));

    if (rise > 0) flux += rise;
  }

  return flux;
}

/**
 * Map each FFT bin to a log-spaced spectrogram row (-1 = outside range)
 * @param binHz - Hz per bin
 * @returns Row index per FFT bin
 */
function logBinMap(binHz: number): Int32Array {
  const map = new Int32Array(FRAME_SIZE / 2 + 1).fill(-1);
  const logMin = Math.log(SPECTROGRAM_MIN_HZ);
  const logSpan = Math.log(SPECTROGRAM_MAX_HZ) - logMin;

  for (let k = 1; k < map.length; k++) {
    const hz = k * binHz;

    if (hz >= SPECTROGRAM_MIN_HZ && hz < SPECTROGRAM_MAX_HZ) {
      map[k] = Math.floor(
        ((Math.log(hz) - logMin) / logSpan) * SPECTROGRAM_BINS,
      );
    }
  }

  return map;
}

function logSpectrum(power: Float64Array, logBinOf: Int32Array): Float32Array {
  const rows = new Float32Array(SPECTROGRAM_BINS);
  const counts = new Uint16Array(SPECTROGRAM_BINS);

  for (let k = 0; k < logBinOf.length; k++) {
    const row = logBinOf[k] ?? -1;

    if (row >= 0) {
      rows[row] = (rows[row] ?? 0) + at(power, k);
      counts[row] = (counts[row] ?? 0) + 1;
    }
  }

  // Low rows can fall between bins; borrow the nearest filled row below
  for (let row = 0; row < SPECTROGRAM_BINS; row++) {
    const count = counts[row] ?? 0;

    if (count > 0) {
      rows[row] = (rows[row] ?? 0) / count;
    } else if (row > 0) {
      rows[row] = rows[row - 1] ?? 0;
    }
  }

  return rows;
}
