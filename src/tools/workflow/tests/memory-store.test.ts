// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, it } from "vitest";
import {
  hasFactHeaders,
  parseMemory,
  serializeMemory,
} from "../memory-store.ts";

describe("memory-store", () => {
  it("reads unstructured text as the legacy notes fact", () => {
    expect(parseMemory("plain notes")).toStrictEqual([
      {
        id: "notes",
        about: "plain notes",
        lines: ["plain notes"],
        headed: false,
      },
    ]);
  });

  it("cuts the legacy description to the first line, 80 chars", () => {
    const [fact] = parseMemory(`\n${"x".repeat(100)}\nsecond line`);

    expect(fact?.about).toBe("x".repeat(80));
  });

  it("returns no facts for empty or blank memory", () => {
    expect(parseMemory("")).toStrictEqual([]);
    expect(parseMemory("\n  \n")).toStrictEqual([]);
  });

  it("splits facts at header lines", () => {
    const facts = parseMemory(
      "old text\n## bass: Bass sound\nReese, detuned\n## tempo: Tempo\n128",
    );

    expect(facts.map((f) => [f.id, f.about, f.lines])).toStrictEqual([
      ["notes", "old text", ["old text"]],
      ["bass", "Bass sound", ["Reese, detuned"]],
      ["tempo", "Tempo", ["128"]],
    ]);
  });

  it.each([
    [
      "three headers, blank lines and a non-header ## line",
      "## bass: Bass sound\nReese\n\n## not a header\n\n## drums: Drum kit\n## tempo: Tempo: fixed\n128\n",
    ],
    ["legacy text before headers", "old text\n\n## bass: Bass\nReese"],
    ["header with a blank line before the next", "## a: A\n\n## b: B"],
  ])("round-trips %s", (_, content) => {
    expect(serializeMemory(parseMemory(content))).toBe(content);
  });

  it("detects header lines", () => {
    expect(hasFactHeaders("plain\n## Not: a header")).toBe(false);
    expect(hasFactHeaders("plain\n## bass: Bass")).toBe(true);
  });
});
