// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, it } from "vitest";
import {
  bursts,
  grid,
  mix,
  sine,
  TEST_RATE,
} from "#src/tools/control/listen/tests/audio-test-helpers.ts";
import { at } from "../fft.ts";
import { pickOnsets } from "../onsets.ts";
import { computePitchFrames, topPitchClasses } from "../pitch-frames.ts";
import {
  BANDS,
  binRange,
  computeSpectralFrames,
  SPECTROGRAM_BINS,
} from "../spectral-frames.ts";
import { estimateTempo } from "../tempo-estimate.ts";

const MID = BANDS.findIndex((band) => band.name === "mid");
const SUB = BANDS.findIndex((band) => band.name === "sub");

function meanOf(values: Float64Array | undefined): number {
  if (values == null) return 0;

  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

describe("computeSpectralFrames", () => {
  it("puts a 1 kHz tone in the mid band with a ~1 kHz centroid", () => {
    const frames = computeSpectralFrames(sine(1000, 1), TEST_RATE);

    expect(frames.spectrogram).toHaveLength(frames.frameCount);
    expect(frames.spectrogram[0]).toHaveLength(SPECTROGRAM_BINS);
    expect(meanOf(frames.bandPower[MID])).toBeGreaterThan(
      meanOf(frames.bandPower[SUB]) * 1000,
    );
    expect(at(frames.centroid, 10)).toBeGreaterThan(900);
    expect(at(frames.centroid, 10)).toBeLessThan(1100);
  });

  it("shows kick-range hits as onsets in the kick flux", () => {
    const hits = [0.25, 0.75, 1.25, 1.75];
    const frames = computeSpectralFrames(bursts(hits, 60, 2), TEST_RATE);
    const onsets = pickOnsets(frames.kickFlux, frames.times);

    expect(onsets).toHaveLength(4);
    for (const [i, t] of onsets.entries())
      expect(Math.abs(t - (hits[i] ?? 0))).toBeLessThan(0.06);
  });

  it("handles silence (zero centroid) and clamps bin ranges", () => {
    const frames = computeSpectralFrames(new Float32Array(100), TEST_RATE);

    expect(frames.frameCount).toBe(1);
    expect(frames.centroid[0]).toBe(0);
    expect(binRange({ lowHz: 20_000, highHz: 40_000 }, 10)).toStrictEqual([
      2000, 2049,
    ]);
  });
});

describe("computePitchFrames", () => {
  it("finds the pitch classes of a chord and its bass note", () => {
    const chord = mix(
      sine(110, 2, 0.3), // A2
      sine(261.63, 2, 0.3), // C4
      sine(329.63, 2, 0.3), // E4
    );
    const frames = computePitchFrames(chord, TEST_RATE);
    const middle = frames.chroma[Math.floor(frames.frameCount / 2)];
    const bass = frames.bassChroma[Math.floor(frames.frameCount / 2)];

    expect(topPitchClasses(middle as Float64Array, 3).sort()).toStrictEqual([
      "A",
      "C",
      "E",
    ]);
    expect(topPitchClasses(bass as Float64Array, 1, 1)).toStrictEqual(["A"]);
  });

  it("returns no pitch classes for silence", () => {
    expect(topPitchClasses(new Float64Array(12), 3)).toStrictEqual([]);
  });
});

describe("estimateTempo", () => {
  const FRAME_RATE = 100;

  function pulses(bpm: number, seconds: number, offset = 0): Float64Array {
    const strength = new Float64Array(seconds * FRAME_RATE);

    for (const t of grid(60 / bpm, seconds)) {
      const f = Math.round((t + offset) * FRAME_RATE);

      if (f < strength.length) strength[f] = 1;
    }

    return strength;
  }

  it("finds a steady pulse and its phase", () => {
    const estimate = estimateTempo(pulses(124, 60, 0.2), FRAME_RATE);

    expect(estimate?.bpm).toBeCloseTo(124, 0);
    expect(estimate?.firstBeatSeconds).toBeCloseTo(0.2, 1);
  });

  it("looks for the beat inside 85-175 BPM", () => {
    expect(estimateTempo(pulses(90, 60), FRAME_RATE)?.bpm).toBeCloseTo(90, 0);
    // 62 BPM has no pulse inside the range
    expect(estimateTempo(pulses(62, 60), FRAME_RATE)).toBeNull();
  });

  it("gives up on short or pulseless input", () => {
    expect(estimateTempo(pulses(124, 1), FRAME_RATE)).toBeNull();
    expect(estimateTempo(new Float64Array(6000), FRAME_RATE)).toBeNull();
  });

  it("skips refinement when the excerpt is too short for it", () => {
    expect(estimateTempo(pulses(120, 4), FRAME_RATE)?.bpm).toBeCloseTo(120, 0);
  });
});
