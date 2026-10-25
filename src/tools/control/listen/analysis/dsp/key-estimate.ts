// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

// Key estimate from summed chroma, correlated against Krumhansl-Kessler
// major/minor profiles in all 12 rotations.

import { at } from "./fft.ts";
import { PITCH_CLASS_NAMES } from "./pitch-frames.ts";

const MAJOR_PROFILE = [
  6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88,
];
const MINOR_PROFILE = [
  6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17,
];

export interface KeyEstimate {
  key: string;
  /** Profile correlation of the winner, -1..1 */
  confidence: number;
}

/**
 * Estimate the key of a chroma vector
 * @param chroma - 12 summed pitch-class magnitudes
 * @returns Best key, or null for silence
 */
export function estimateKey(chroma: Float64Array): KeyEstimate | null {
  if (!chroma.some((value) => value > 0)) return null;

  let best: KeyEstimate = { key: "", confidence: Number.NEGATIVE_INFINITY };

  for (let tonic = 0; tonic < 12; tonic++) {
    for (const [mode, profile] of [
      ["major", MAJOR_PROFILE],
      ["minor", MINOR_PROFILE],
    ] as const) {
      const r = correlation(chroma, profile, tonic);

      if (r > best.confidence) {
        best = {
          key: `${PITCH_CLASS_NAMES[tonic] as string} ${mode}`,
          confidence: r,
        };
      }
    }
  }

  return best;
}

function correlation(
  chroma: Float64Array,
  profile: readonly number[],
  tonic: number,
): number {
  const rotated = Array.from(
    { length: 12 },
    (_, i) => profile[(i - tonic + 12) % 12] ?? 0,
  );
  const meanX = chroma.reduce((s, v) => s + v, 0) / 12;
  const meanY = rotated.reduce((s, v) => s + v, 0) / 12;
  let xy = 0;
  let xx = 0;
  let yy = 0;

  for (let i = 0; i < 12; i++) {
    const dx = at(chroma, i) - meanX;
    const dy = (rotated[i] ?? 0) - meanY;

    xy += dx * dy;
    xx += dx * dx;
    yy += dy * dy;
  }

  return xx > 0 ? xy / Math.sqrt(xx * yy) : 0;
}
