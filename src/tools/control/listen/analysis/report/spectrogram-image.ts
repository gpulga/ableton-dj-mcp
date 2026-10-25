// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

// Renders the log-frequency spectrogram as a PNG with bar lines, so a model
// that reads images can see the arrangement and frequency content.

import {
  SPECTROGRAM_BINS,
  SPECTROGRAM_MAX_HZ,
  SPECTROGRAM_MIN_HZ,
} from "#src/tools/control/listen/analysis/dsp/spectral-frames.ts";
import { encodePng } from "./png-encoder.ts";

const MAX_WIDTH = 1024;
const ROW_HEIGHT = 2;
const DYNAMIC_RANGE_DB = 80;
const GUIDE_FREQUENCIES_HZ = [100, 1000, 10_000];

// Dark purple -> red -> yellow, roughly perceptually ordered
const COLOR_STOPS: [number, number, number][] = [
  [0, 0, 4],
  [60, 15, 110],
  [150, 40, 105],
  [225, 90, 45],
  [250, 190, 40],
  [252, 255, 165],
];

export const SPECTROGRAM_LEGEND =
  "Spectrogram: x = time (thin line every bar, bright line every 4 bars), " +
  `y = frequency on a log scale ${SPECTROGRAM_MIN_HZ} Hz (bottom) to ${SPECTROGRAM_MAX_HZ / 1000} kHz (top), ` +
  "faint horizontal guides at 100 Hz, 1 kHz and 10 kHz. Brighter = louder, " +
  `${DYNAMIC_RANGE_DB} dB range.`;

/**
 * Render a spectrogram PNG
 * @param spectrogram - Log-frequency power per frame
 * @param frameSeconds - Seconds between frames
 * @param barSeconds - Seconds per bar
 * @returns PNG bytes
 */
export function renderSpectrogram(
  spectrogram: Float32Array[],
  frameSeconds: number,
  barSeconds: number,
): Buffer {
  const width = Math.max(1, Math.min(MAX_WIDTH, spectrogram.length));
  const height = SPECTROGRAM_BINS * ROW_HEIGHT;
  const columns = downsampleColumns(spectrogram, width);
  const topDb = Math.max(...columns.map((column) => Math.max(...column)));
  const rgb = new Uint8Array(width * height * 3);
  const secondsPerColumn = (spectrogram.length * frameSeconds) / width;
  const guideRows = new Set(GUIDE_FREQUENCIES_HZ.map((hz) => rowForHz(hz)));

  for (let x = 0; x < width; x++) {
    const barLine = barLineStrength(x, secondsPerColumn, barSeconds);
    const column = columns[x] as Float32Array;

    for (let row = 0; row < SPECTROGRAM_BINS; row++) {
      const level =
        ((column[row] ?? 0) - (topDb - DYNAMIC_RANGE_DB)) / DYNAMIC_RANGE_DB;
      let color = colorFor(level);

      if (barLine > 0) color = blend(color, [255, 255, 255], barLine);
      else if (guideRows.has(row)) color = blend(color, [255, 255, 255], 0.12);

      for (let dy = 0; dy < ROW_HEIGHT; dy++) {
        // Row 0 is the lowest frequency, drawn at the bottom
        const y = height - 1 - (row * ROW_HEIGHT + dy);

        rgb.set(color, (y * width + x) * 3);
      }
    }
  }

  return encodePng(width, height, rgb);
}

function downsampleColumns(
  spectrogram: Float32Array[],
  width: number,
): Float32Array[] {
  const columns: Float32Array[] = [];
  const perColumn = spectrogram.length / width;

  for (let x = 0; x < width; x++) {
    const from = Math.floor(x * perColumn);
    const to = Math.max(from + 1, Math.floor((x + 1) * perColumn));
    const column = new Float32Array(SPECTROGRAM_BINS).fill(-Infinity);

    for (let f = from; f < to; f++) {
      const frame = spectrogram[f] as Float32Array;

      for (let row = 0; row < SPECTROGRAM_BINS; row++) {
        const db = 10 * Math.log10((frame[row] ?? 0) + 1e-12);

        column[row] = Math.max(column[row] ?? -Infinity, db);
      }
    }

    columns.push(column);
  }

  return columns;
}

function barLineStrength(
  x: number,
  secondsPerColumn: number,
  barSeconds: number,
): number {
  const startBar = Math.floor((x * secondsPerColumn) / barSeconds);
  const endBar = Math.floor(((x + 1) * secondsPerColumn) / barSeconds);

  if (x === 0 || endBar === startBar) return 0;

  return endBar % 4 === 0 ? 0.7 : 0.3;
}

function rowForHz(hz: number): number {
  const logMin = Math.log(SPECTROGRAM_MIN_HZ);
  const span = Math.log(SPECTROGRAM_MAX_HZ) - logMin;

  return Math.floor(((Math.log(hz) - logMin) / span) * SPECTROGRAM_BINS);
}

/**
 * Map a 0..1 level onto the colour ramp
 * @param level - Normalized level (clamped)
 * @returns RGB triple
 */
export function colorFor(level: number): [number, number, number] {
  const clamped = Math.min(1, Math.max(0, level));
  const position = clamped * (COLOR_STOPS.length - 1);
  const index = Math.min(COLOR_STOPS.length - 2, Math.floor(position));

  return blend(
    COLOR_STOPS[index] as [number, number, number],
    COLOR_STOPS[index + 1] as [number, number, number],
    position - index,
  );
}

function blend(
  a: [number, number, number],
  b: [number, number, number],
  amount: number,
): [number, number, number] {
  return [
    Math.round(a[0] + (b[0] - a[0]) * amount),
    Math.round(a[1] + (b[1] - a[1]) * amount),
    Math.round(a[2] + (b[2] - a[2]) * amount),
  ];
}
