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
import { analyzeAudio, findJumps } from "../analyze-audio.ts";
import { type BarRow, powerToDb, stereoCorrelation } from "../bar-analysis.ts";

// 120 BPM in 4/4: 2 s bars, 0.5 s beats
const OPTIONS = { tempo: 120, beatsPerBar: 4 };

/**
 * 8 bars: a quiet A pad for 4 bars, then kicks on every beat and a louder pad
 * @returns Mono signal
 */
function buildUpTrack(): Float32Array {
  const pad = Float32Array.from(sine(220, 16, 0.3), (v, i) =>
    i < 8 * TEST_RATE ? v * 0.2 : v,
  );
  const kicks = bursts(
    grid(0.5, 8).map((t) => t + 8),
    55,
    16,
  );

  return mix(pad, kicks);
}

function column(rows: string[], name: string): string[] {
  const index = (rows[0] ?? "").split(" ").indexOf(name);

  return rows.slice(1).map((row) => row.split(" ")[index] ?? "");
}

describe("analyzeAudio", () => {
  const track = buildUpTrack();
  const { report, spectrogramPng } = analyzeAudio(
    { sampleRate: TEST_RATE, channels: [track, track] },
    OPTIONS,
  );

  it("reports one row per bar on the tempo grid", () => {
    expect(report.summary).toMatchObject({ bars: 8, tempo: 120, seconds: 16 });
    expect(report.bars).toHaveLength(9);
    expect(column(report.bars, "bar")).toStrictEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
    ]);
  });

  it("counts kick-range hits per bar and flags the build", () => {
    expect(column(report.bars, "kick")).toStrictEqual([
      "0",
      "0",
      "0",
      "0",
      "4",
      "4",
      "4",
      "4",
    ]);
    expect(report.jumps).toStrictEqual([expect.stringMatching(/^bar 5: \+/)]);
    expect(report.summary.kickHits).toBe(16);
  });

  it("finds pitch, bass note, key and mono correlation", () => {
    expect(column(report.bars, "pitches")[0]).toBe("A");
    expect(column(report.bars, "bassNote")[0]).toBe("A");
    expect(column(report.bars, "corr")[0]).toBe("1");
    expect(String(report.summary.key)).toMatch(/^A (major|minor)/);
    expect(spectrogramPng?.subarray(1, 4).toString("ascii")).toBe("PNG");
  });

  it("trims to the requested bars and can skip the image", () => {
    const result = analyzeAudio(
      { sampleRate: TEST_RATE, channels: [track] },
      { ...OPTIONS, bars: 2, spectrogram: false },
    );

    expect(result.report.summary.bars).toBe(2);
    expect(result.spectrogramPng).toBeNull();
  });

  it("groups long analyses into 4-bar phrases", () => {
    // 999 BPM: ~0.24 s bars, so 16 s is more than 64 bars
    const result = analyzeAudio(
      { sampleRate: TEST_RATE, channels: [track] },
      { ...OPTIONS, tempo: 999, spectrogram: false },
    );

    expect(result.report.summary.rowsPerPhrase).toBe("4 bars per row");
    expect(column(result.report.bars, "bar").slice(0, 3)).toStrictEqual([
      "1",
      "5",
      "9",
    ]);
  });

  it("detects tempo and the first beat for files", () => {
    const pulses = bursts(
      grid(60 / 124, 12).map((t) => t + 0.1),
      55,
      12,
    );
    const result = analyzeAudio(
      { sampleRate: TEST_RATE, channels: [pulses] },
      { ...OPTIONS, detectTempo: true, spectrogram: false },
    );

    expect(result.report.summary.tempo).toBeCloseTo(124, 0);
    expect(result.report.summary.tempoDetected).toBe(true);
    expect(result.report.summary.gridStartSeconds).toBeCloseTo(0.1, 1);
  });

  it("falls back to the given tempo when no pulse is found", () => {
    const result = analyzeAudio(
      { sampleRate: TEST_RATE, channels: [sine(440, 4)] },
      { ...OPTIONS, detectTempo: true, spectrogram: false },
    );

    expect(result.report.summary.tempo).toBe(120);
    expect(result.report.summary.tempoDetected).toBeUndefined();
  });

  it("handles silence and rejects empty audio", () => {
    const silent = analyzeAudio(
      { sampleRate: TEST_RATE, channels: [new Float32Array(TEST_RATE * 2)] },
      { ...OPTIONS, spectrogram: false },
    );

    expect(silent.report.summary.key).toBeNull();
    expect(column(silent.report.bars, "pitches")).toStrictEqual(["-"]);
    expect(() =>
      analyzeAudio({ sampleRate: TEST_RATE, channels: [] }, OPTIONS),
    ).toThrow("audio is empty");
  });
});

describe("findJumps", () => {
  it("reports rises and drops of 3 LU or more", () => {
    const rows = [-20, -16, -16.5, -25].map(
      (lufs, i) => ({ bar: i + 1, lufs }) as BarRow,
    );

    expect(findJumps(rows)).toStrictEqual(["bar 2: +4 LU", "bar 4: -8.5 LU"]);
  });
});

describe("bar helpers", () => {
  it("measures stereo correlation", () => {
    const tone = sine(440, 0.1);
    const inverted = tone.map((v) => -v);

    expect(stereoCorrelation([tone, tone], 0, tone.length)).toBeCloseTo(1, 6);
    expect(stereoCorrelation([tone, inverted], 0, tone.length)).toBeCloseTo(
      -1,
      6,
    );
    expect(stereoCorrelation([tone], 0, tone.length)).toBe(1);
    expect(
      stereoCorrelation([new Float32Array(4), new Float32Array(4)], 0, 4),
    ).toBe(1);
  });

  it("converts power to dB", () => {
    expect(powerToDb(1)).toBe(0);
    expect(powerToDb(0)).toBe(-120);
  });
});
