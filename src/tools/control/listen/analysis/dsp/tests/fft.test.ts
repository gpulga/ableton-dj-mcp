// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, it } from "vitest";
import { sine } from "#src/tools/control/listen/tests/audio-test-helpers.ts";
import { at, fftInPlace, framePowerSpectrum, hannWindow } from "../fft.ts";

describe("fftInPlace", () => {
  it("turns an impulse into a flat spectrum", () => {
    const re = new Float64Array(8);
    const im = new Float64Array(8);

    re[0] = 1;
    fftInPlace(re, im);

    expect([...re]).toStrictEqual(Array.from({ length: 8 }, () => 1));
    expect(im.every((v) => Math.abs(v) < 1e-12)).toBe(true);
  });

  it("puts a cosine in its bin", () => {
    const n = 64;
    const re = Float64Array.from({ length: n }, (_, i) =>
      Math.cos((2 * Math.PI * 5 * i) / n),
    );
    const im = new Float64Array(n);

    fftInPlace(re, im);

    expect(re[5]).toBeCloseTo(n / 2, 6);
    expect(re[59]).toBeCloseTo(n / 2, 6);
    expect(Math.abs(at(re, 6))).toBeLessThan(1e-9);
  });

  it.each([0, 6])("rejects size %i", (size) => {
    expect(() =>
      fftInPlace(new Float64Array(size), new Float64Array(size)),
    ).toThrow("power of two");
  });
});

describe("hannWindow", () => {
  it("starts at zero and peaks in the middle", () => {
    const window = hannWindow(8);

    expect(window[0]).toBe(0);
    expect(window[4]).toBeCloseTo(1, 12);
  });
});

describe("framePowerSpectrum", () => {
  it("reads a full-scale sine near power 1 at its bin", () => {
    const rate = 4096;
    const signal = sine(256, 1, 1, rate);
    const power = framePowerSpectrum(signal, 0, hannWindow(1024));

    // 256 Hz at 4 Hz/bin
    expect(at(power, 64)).toBeCloseTo(1, 1);
    expect(at(power, 10)).toBeLessThan(1e-6);
  });

  it("zero-pads frames that run past either end", () => {
    const power = framePowerSpectrum(Float32Array.of(1, 1), -2, hannWindow(4));

    expect(power).toHaveLength(3);
  });
});

describe("at", () => {
  it("returns 0 out of range", () => {
    expect(at(Float32Array.of(2), 0)).toBe(2);
    expect(at(Float32Array.of(2), 5)).toBe(0);
  });
});
