// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, it } from "vitest";
import { sine } from "#src/tools/control/listen/tests/audio-test-helpers.ts";
import {
  amplitudeToDb,
  channelMeanSquare,
  integratedLoudness,
  kWeight,
  loudnessRange,
  meanSquareToLufs,
  SILENCE_DB,
  truePeakDb,
} from "../loudness.ts";

const RATE = 48_000;

function weighted(channels: Float32Array[]): Float32Array[] {
  return channels.map((channel) => kWeight(channel, RATE));
}

describe("integratedLoudness", () => {
  it("reads a -20 dBFS 1 kHz stereo sine as about -20 LUFS", () => {
    const tone = sine(1000, 3, 0.1, RATE);
    const lufs = integratedLoudness(weighted([tone, tone]), RATE);

    expect(lufs).toBeGreaterThan(-20.5);
    expect(lufs).toBeLessThan(-19.5);
  });

  it("gates out silence", () => {
    const silence = new Float32Array(RATE * 2);

    expect(integratedLoudness(weighted([silence]), RATE)).toBe(SILENCE_DB);
  });

  it("measures audio shorter than one block", () => {
    const tone = sine(1000, 0.2, 0.1, RATE);

    expect(integratedLoudness(weighted([tone, tone]), RATE)).toBeGreaterThan(
      -21,
    );
    expect(integratedLoudness([new Float32Array(0)], RATE)).toBe(SILENCE_DB);
  });
});

describe("loudnessRange", () => {
  it("is ~0 for a steady tone and large for quiet/loud halves", () => {
    const steady = sine(1000, 8, 0.1, RATE);
    const dynamic = Float32Array.from(sine(1000, 16, 0.3, RATE), (v, i) =>
      i < 8 * RATE ? v / 10 : v,
    );

    expect(loudnessRange(weighted([steady]), RATE)).toBeLessThan(0.5);
    expect(loudnessRange(weighted([dynamic]), RATE)).toBeGreaterThan(15);
  });

  it("is 0 for silence", () => {
    expect(loudnessRange(weighted([new Float32Array(RATE * 4)]), RATE)).toBe(0);
  });
});

describe("truePeakDb", () => {
  it("finds the inter-sample peak of a quarter-rate sine", () => {
    // Samples land at ±0.707 while the waveform peaks at 1.0
    const tone = sine(RATE / 4, 0.1, 1, RATE, Math.PI / 4);

    expect(amplitudeToDb(Math.max(...tone))).toBeCloseTo(-3, 0);
    expect(truePeakDb([tone])).toBeGreaterThan(-0.5);
  });

  it("is SILENCE_DB for silence", () => {
    expect(truePeakDb([new Float32Array(10)])).toBe(SILENCE_DB);
  });
});

describe("helpers", () => {
  it("converts levels", () => {
    expect(amplitudeToDb(1)).toBe(0);
    expect(amplitudeToDb(0)).toBe(SILENCE_DB);
    expect(amplitudeToDb(1e-9)).toBe(SILENCE_DB);
    expect(meanSquareToLufs(0)).toBe(SILENCE_DB);
    expect(meanSquareToLufs(1)).toBeCloseTo(-0.691, 3);
  });

  it("sums channel mean squares over a range", () => {
    const ones = Float32Array.of(1, 1, 1, 1);

    expect(channelMeanSquare([ones, ones], 0, 4)).toBe(2);
    expect(channelMeanSquare([ones], 2, 2)).toBe(0);
  });
});
