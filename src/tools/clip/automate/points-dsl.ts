// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

// Parser for the adj-automate points string: comma- or newline-separated
// "<bar|beat>:<value>" pairs. "1|1" is clip time 0. A value is normalized 0..1,
// or a display value with a unit ("1200Hz", "1.2kHz", "-12dB", "25%", "250ms")
// that the bridge maps onto the param through Live's own labels.

import { MAX_AUTOMATION_POINTS } from "./shapes.ts";

export interface ParsedPoint {
  barBeat: string;
  /** Normalized 0..1, or a display value with a unit for the bridge to map */
  value: number | string;
}

const POINT_PATTERN = /^(\S+?)\s*:\s*(\S.*)$/;
const NORMALIZED_PATTERN = /^[\d.]+$/;
const DISPLAY_PATTERN =
  /^-?(?:\d+(?:\.\d*)?|\.\d+|inf)\s*(?:khz|hz|db|%|ms|s)$/i;

/**
 * Parse the points DSL into barBeat/value pairs.
 * @param input - e.g. "1|1:0, 9|1:1" or one pair per line
 * @returns Parsed points in input order
 * @throws On malformed entries, out-of-range values, or too many points
 */
export function parsePoints(input: string): ParsedPoint[] {
  const entries = input
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  if (entries.length === 0) {
    throw new Error("points is empty — expected '<bar|beat>:<value>' pairs");
  }

  if (entries.length > MAX_AUTOMATION_POINTS) {
    throw new Error(
      `too many points: ${entries.length} (max ${MAX_AUTOMATION_POINTS})`,
    );
  }

  return entries.map((entry) => parseEntry(entry));
}

/**
 * Parse a single "<bar|beat>:<value>" entry.
 * @param entry - Trimmed entry text
 * @returns Parsed point
 * @throws On bad format or value outside 0..1
 */
function parseEntry(entry: string): ParsedPoint {
  const match = POINT_PATTERN.exec(entry);

  if (!match) {
    throw new Error(
      `invalid point "${entry}" — expected '<bar|beat>:<value>' like '1|1:0.5'`,
    );
  }

  const barBeat = match[1] as string;
  const raw = (match[2] as string).trim();

  if (!barBeat.includes("|")) {
    throw new Error(
      `invalid point "${entry}" — position must be bar|beat like '9|1'`,
    );
  }

  if (DISPLAY_PATTERN.test(raw)) {
    return { barBeat, value: raw.replaceAll(/\s+/g, "") };
  }

  const value = Number.parseFloat(raw);

  if (
    !NORMALIZED_PATTERN.test(raw) ||
    Number.isNaN(value) ||
    value < 0 ||
    value > 1
  ) {
    throw new Error(
      `invalid point "${entry}" — value must be 0..1 or a value with a unit like '1200Hz', '-12dB', '25%'`,
    );
  }

  return { barBeat, value };
}
