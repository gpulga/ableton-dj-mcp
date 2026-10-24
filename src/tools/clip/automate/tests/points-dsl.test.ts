// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, it } from "vitest";

import { parsePoints } from "../points-dsl.ts";
import { MAX_AUTOMATION_POINTS } from "../shapes.ts";

describe("parsePoints", () => {
  it("parses comma-separated pairs", () => {
    expect(parsePoints("1|1:0, 9|1:1")).toStrictEqual([
      { barBeat: "1|1", value: 0 },
      { barBeat: "9|1", value: 1 },
    ]);
  });

  it("parses newline-separated pairs with fractional values", () => {
    expect(parsePoints("1|1:0.25\n5|3.5:0.75")).toStrictEqual([
      { barBeat: "1|1", value: 0.25 },
      { barBeat: "5|3.5", value: 0.75 },
    ]);
  });

  it("allows whitespace around the colon", () => {
    expect(parsePoints("1|1 : 0.5")).toStrictEqual([
      { barBeat: "1|1", value: 0.5 },
    ]);
  });

  it("rejects empty input", () => {
    expect(() => parsePoints("  , ")).toThrow(/points is empty/);
  });

  it("rejects entries without a colon", () => {
    expect(() => parsePoints("1|1 0.5")).toThrow(/invalid point/);
  });

  it("rejects positions without a bar|beat separator", () => {
    expect(() => parsePoints("5:0.5")).toThrow(/must be bar\|beat/);
  });

  it("rejects values above 1", () => {
    expect(() => parsePoints("1|1:1.5")).toThrow(/must be 0\.\.1 or a value/);
  });

  it("keeps display values with units for the bridge to map", () => {
    expect(
      parsePoints("1|1:1200Hz, 5|1:1.2 kHz, 9|1:-12dB, 13|1:25%, 17|1:250ms"),
    ).toStrictEqual([
      { barBeat: "1|1", value: "1200Hz" },
      { barBeat: "5|1", value: "1.2kHz" },
      { barBeat: "9|1", value: "-12dB" },
      { barBeat: "13|1", value: "25%" },
      { barBeat: "17|1", value: "250ms" },
    ]);
  });

  it("rejects a negative value without a unit", () => {
    expect(() => parsePoints("1|1:-12")).toThrow(/invalid point/);
  });

  it("rejects non-numeric values", () => {
    expect(() => parsePoints("1|1:high")).toThrow(/invalid point/);
  });

  it("rejects too many points", () => {
    const entries = Array.from(
      { length: MAX_AUTOMATION_POINTS + 1 },
      (_, i) => `${i + 1}|1:0.5`,
    );

    expect(() => parsePoints(entries.join(","))).toThrow(/too many points/);
  });
});
