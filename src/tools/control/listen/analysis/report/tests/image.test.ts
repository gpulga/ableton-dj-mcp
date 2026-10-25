// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { SPECTROGRAM_BINS } from "#src/tools/control/listen/analysis/dsp/spectral-frames.ts";
import { crc32, encodePng } from "../png-encoder.ts";
import { colorFor, renderSpectrogram } from "../spectrogram-image.ts";

interface PngInfo {
  width: number;
  height: number;
  pixels: Buffer;
}

function readPng(png: Buffer): PngInfo {
  expect([...png.subarray(0, 8)]).toStrictEqual([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);

  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  const idatLength = png.readUInt32BE(33);
  const pixels = inflateSync(png.subarray(41, 41 + idatLength));

  return { width, height, pixels };
}

describe("encodePng", () => {
  it("writes a valid RGB PNG", () => {
    const png = encodePng(2, 1, Uint8Array.of(255, 0, 0, 0, 0, 255));
    const { width, height, pixels } = readPng(png);

    expect([width, height]).toStrictEqual([2, 1]);
    expect([...pixels]).toStrictEqual([0, 255, 0, 0, 0, 0, 255]);
    expect(png.subarray(-8, -4).toString("ascii")).toBe("IEND");
  });

  it("rejects a pixel buffer of the wrong size", () => {
    expect(() => encodePng(2, 2, new Uint8Array(3))).toThrow(
      "expected 12 RGB bytes, got 3",
    );
  });

  it("computes the standard CRC-32", () => {
    expect(crc32(Buffer.from("IEND", "ascii"))).toBe(0xae_42_60_82);
    expect(crc32(Buffer.from("123456789", "ascii"))).toBe(0xcb_f4_39_26);
  });
});

describe("renderSpectrogram", () => {
  function frames(count: number, level: number): Float32Array[] {
    return Array.from({ length: count }, () =>
      new Float32Array(SPECTROGRAM_BINS).fill(level),
    );
  }

  it("draws one column per frame up to 1024, two pixels per row", () => {
    const small = readPng(renderSpectrogram(frames(10, 1), 0.1, 0.5));
    const large = readPng(renderSpectrogram(frames(3000, 1), 0.01, 1));

    expect([small.width, small.height]).toStrictEqual([
      10,
      SPECTROGRAM_BINS * 2,
    ]);
    expect(large.width).toBe(1024);
  });

  it("marks bar boundaries with lighter columns", () => {
    // 8 quiet frames of 0.25 s, 1 s bars: boundaries after frames 3 and 7
    const quiet = frames(8, 1e-6);

    (quiet[0] as Float32Array)[0] = 1; // sets the top of the range
    const { pixels, width } = readPng(renderSpectrogram(quiet, 0.25, 1));
    const rowBytes = width * 3 + 1;
    const red = (x: number): number => pixels[rowBytes * 10 + 1 + x * 3] ?? 0;

    expect(red(3)).toBeGreaterThan(red(2));
    expect(red(0)).toBe(red(1));
  });
});

describe("colorFor", () => {
  it("clamps to the ramp ends", () => {
    expect(colorFor(-1)).toStrictEqual([0, 0, 4]);
    expect(colorFor(2)).toStrictEqual([252, 255, 165]);
    expect(colorFor(0.5)).not.toStrictEqual(colorFor(0.6));
  });
});
