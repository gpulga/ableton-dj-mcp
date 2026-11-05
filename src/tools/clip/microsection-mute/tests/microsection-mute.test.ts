// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyTransforms } from "#src/notation/transform/transform-evaluator.ts";
import { type NoteEvent } from "#src/notation/types.ts";
import { updateClip } from "#src/tools/clip/update/update-clip.ts";
import {
  buildTransforms,
  microsectionMute,
  parseMicrosections,
} from "../microsection-mute.ts";

vi.mock(import("#src/tools/clip/update/update-clip.ts"), () => ({
  updateClip: vi.fn(),
}));

describe("parseMicrosections", () => {
  it("parses a 4-microsection arc", () => {
    const input = `
      1-2: Eb1, F#1
      3-4: F#1
      5-6:
      7-8: Eb1, F#1, G#1
    `;

    const parsed = parseMicrosections(input);

    expect(parsed).toHaveLength(4);

    expect(parsed[0]).toMatchObject({
      barStart: 1,
      barEnd: 2,
      pitches: ["Eb1", "F#1"],
    });

    expect(parsed[1]).toMatchObject({
      barStart: 3,
      barEnd: 4,
      pitches: ["F#1"],
    });

    expect(parsed[2]).toMatchObject({
      barStart: 5,
      barEnd: 6,
      pitches: [],
    });

    expect(parsed[3]).toMatchObject({
      barStart: 7,
      barEnd: 8,
      pitches: ["Eb1", "F#1", "G#1"],
    });
  });

  it("treats 'all' as a whole-clip mute (pitches=null)", () => {
    const parsed = parseMicrosections("1-4: all");

    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.pitches).toBeNull();
  });

  it("accepts MIDI note numbers as pitches", () => {
    const parsed = parseMicrosections("1-2: 39, 54");

    expect(parsed[0]?.pitches).toStrictEqual(["39", "54"]);
  });

  it("supports single-bar ranges (barStart == barEnd)", () => {
    const parsed = parseMicrosections("3-3: F#1");

    expect(parsed[0]).toMatchObject({ barStart: 3, barEnd: 3 });
  });

  it("strips inline comments and skips comment-only lines", () => {
    const input = `
      # this is a comment line, should be ignored
      1-2: Eb1   # mute clap during intro
      3-4: F#1
    `;

    const parsed = parseMicrosections(input);

    expect(parsed).toHaveLength(2);
    expect(parsed[0]?.pitches).toStrictEqual(["Eb1"]);
  });

  it("ignores empty lines and extra whitespace", () => {
    const parsed = parseMicrosections("\n\n  1-2:   Eb1  ,  F#1  \n\n");

    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.pitches).toStrictEqual(["Eb1", "F#1"]);
  });

  it("throws when a line has no colon", () => {
    expect(() => parseMicrosections("1-2 Eb1")).toThrow(/missing ':'/);
  });

  it("throws when bar range has no dash", () => {
    expect(() => parseMicrosections("12: Eb1")).toThrow(
      /missing '-' separator/,
    );
  });

  it("throws when barStart is not a positive integer", () => {
    expect(() => parseMicrosections("0-2: Eb1")).toThrow(/positive integer/);
    expect(() => parseMicrosections("abc-2: Eb1")).toThrow(/positive integer/);
  });

  it("throws when barEnd < barStart", () => {
    expect(() => parseMicrosections("4-2: Eb1")).toThrow(
      /barEnd must be >= barStart/,
    );
  });
});

describe("buildTransforms", () => {
  it("emits one transform per pitch with bar-range velocity = 0", () => {
    const parsed = parseMicrosections("1-2: Eb1, F#1");

    expect(buildTransforms(parsed)).toStrictEqual([
      "Eb1 1|1-2|4.999: velocity = 0",
      "F#1 1|1-2|4.999: velocity = 0",
    ]);
  });

  it("emits a single whole-clip transform when pitches is 'all'", () => {
    const parsed = parseMicrosections("7-8: all");

    expect(buildTransforms(parsed)).toStrictEqual([
      "7|1-8|4.999: velocity = 0",
    ]);
  });

  it("emits no transform for an empty pitch list (peak microsection)", () => {
    const parsed = parseMicrosections("5-6:");

    expect(buildTransforms(parsed)).toStrictEqual([]);
  });

  it("combines all microsections in order", () => {
    const input = `
      1-2: Eb1
      3-4: F#1
      5-6:
      7-8: all
    `;

    const transforms = buildTransforms(parseMicrosections(input));

    expect(transforms).toStrictEqual([
      "Eb1 1|1-2|4.999: velocity = 0",
      "F#1 3|1-4|4.999: velocity = 0",
      "7|1-8|4.999: velocity = 0",
    ]);
  });

  it("uses 4.999 as end-beat to cover the full final bar", () => {
    const transforms = buildTransforms(parseMicrosections("1-1: C3"));

    expect(transforms[0]).toMatch(/-1\|4\.999:/);
  });
});

describe("buildTransforms in any meter", () => {
  const meters = [
    [4, 4],
    [3, 4],
    [5, 4],
    [7, 4],
    [6, 8],
  ] as const;

  /**
   * Mute bar 2 of a 3-bar clip with one note per beat
   * @param numerator - Time signature numerator
   * @param denominator - Time signature denominator
   * @returns 0-based beat indexes of the notes that keep a velocity
   */
  function survivingBeats(numerator: number, denominator: number): number[] {
    const beat = 4 / denominator;
    const notes: NoteEvent[] = Array.from(
      { length: numerator * 3 },
      (_, i) => ({
        pitch: 60,
        start_time: i * beat,
        duration: 0.25,
        velocity: 100,
        probability: 1,
        velocity_deviation: 0,
      }),
    );
    const transforms = buildTransforms(parseMicrosections("2-2: all"));

    applyTransforms(notes, transforms.join("\n"), numerator, denominator);

    return notes
      .filter((n) => n.velocity > 0)
      .map((n) => Math.round(n.start_time / beat));
  }

  it.each(meters)(
    "mutes all of bar 2 and nothing else in %i/%i",
    (numerator, denominator) => {
      const bar1 = Array.from({ length: numerator }, (_, i) => i);
      const bar3 = bar1.map((i) => i + numerator * 2);

      expect(survivingBeats(numerator, denominator)).toStrictEqual([
        ...bar1,
        ...bar3,
      ]);
    },
  );
});

describe("microsectionMute", () => {
  beforeEach(() => {
    vi.mocked(updateClip).mockReset();
  });

  it("throws when clipIds is missing", async () => {
    await expect(
      microsectionMute({ microsections: "1-1: all" }),
    ).rejects.toThrow("microsectionMute failed: clipIds is required");
  });

  it("throws when microsections is missing", async () => {
    await expect(microsectionMute({ clipIds: "1" })).rejects.toThrow(
      "microsectionMute failed: microsections is required",
    );
  });

  it("returns zeros and skips updateClip when only peaks are given", async () => {
    const result = await microsectionMute({
      clipIds: "1",
      microsections: "1-2:\n3-4:",
    });

    expect(result).toStrictEqual({
      clipsUpdated: 0,
      transformsApplied: 0,
      transforms: "",
    });
    expect(updateClip).not.toHaveBeenCalled();
  });

  it("merges the transforms into the clips and counts an array result", async () => {
    vi.mocked(updateClip).mockResolvedValue([{ id: "1" }, { id: "2" }]);
    const context = { smallModelMode: false };

    const result = await microsectionMute(
      { clipIds: "1,2", microsections: "1-2: C3, D3" },
      context,
    );

    const transforms = buildTransforms(parseMicrosections("1-2: C3, D3"));

    expect(updateClip).toHaveBeenCalledExactlyOnceWith(
      {
        ids: "1,2",
        transforms: transforms.join("\n"),
        noteUpdateMode: "merge",
      },
      context,
    );
    expect(result).toStrictEqual({
      clipsUpdated: 2,
      transformsApplied: 2,
      transforms: transforms.join("\n"),
    });
  });

  it("counts a single-object result as one clip", async () => {
    vi.mocked(updateClip).mockResolvedValue({ id: "1" });

    const result = await microsectionMute({
      clipIds: "1",
      microsections: "1-1: all",
    });

    expect(result.clipsUpdated).toBe(1);
  });
});
