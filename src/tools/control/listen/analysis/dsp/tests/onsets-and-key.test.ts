// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, it } from "vitest";
import { estimateKey } from "../key-estimate.ts";
import { pickOnsets } from "../onsets.ts";
import { PITCH_CLASS_NAMES } from "../pitch-frames.ts";

function times(count: number, step: number): Float64Array {
  return Float64Array.from({ length: count }, (_, i) => i * step);
}

describe("pickOnsets", () => {
  it("picks isolated peaks above the adaptive threshold", () => {
    const flux = new Float64Array(100);

    for (const f of [10, 30, 50, 70]) flux[f] = 5;
    flux[90] = 0.1; // below the floor

    const onsets = pickOnsets(flux, times(100, 0.02));

    expect(onsets).toHaveLength(4);
    for (const [i, t] of [0.2, 0.6, 1, 1.4].entries())
      expect(onsets[i]).toBeCloseTo(t, 9);
  });

  it("keeps the earliest of tied neighbours and enforces the minimum gap", () => {
    const flux = new Float64Array(40);

    flux[10] = 5;
    flux[11] = 5; // tie: later frame loses
    flux[13] = 4; // 30 ms after the first hit: too close

    expect(pickOnsets(flux, times(40, 0.01))).toStrictEqual([0.1]);
  });

  it("returns nothing for flat or silent curves", () => {
    expect(pickOnsets(new Float64Array(20), times(20, 0.02))).toStrictEqual([]);
    expect(
      pickOnsets(new Float64Array(20).fill(1), times(20, 0.02)),
    ).toStrictEqual([]);
  });
});

describe("estimateKey", () => {
  function chroma(notes: string[]): Float64Array {
    const vector = new Float64Array(12);

    for (const note of notes) {
      const pc = PITCH_CLASS_NAMES.indexOf(note as never);

      vector[pc] = (vector[pc] ?? 0) + 1;
    }

    return vector;
  }

  it("finds major and minor keys", () => {
    // Tonic weighted twice, as in real music
    expect(
      estimateKey(chroma(["C", "C", "E", "G", "D", "F", "A", "B"]))?.key,
    ).toBe("C major");
    expect(
      estimateKey(chroma(["A", "A", "C", "E", "B", "D", "F", "G", "E"]))?.key,
    ).toBe("A minor");
  });

  it("returns null for silence and handles flat input", () => {
    expect(estimateKey(new Float64Array(12))).toBeNull();
    expect(estimateKey(new Float64Array(12).fill(1))?.confidence).toBe(0);
  });
});
