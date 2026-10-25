// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, it } from "vitest";
import { livePath } from "#src/shared/live-api-path-builders.ts";
import { registerMockObject } from "#src/test/mocks/mock-registry.ts";
import "#src/live-api-adapter/live-api-extensions.ts";
import {
  canStretchLoop,
  duplicateAsOneLoop,
} from "../arrangement-loop-stretch.ts";

/**
 * Register a session clip, a track that duplicates it as clip "99", and "99"
 * @param props - Source clip properties
 * @returns The mocks and a log of writes and calls in order
 */
function setup(props: Record<string, number>) {
  const order: string[] = [];
  const source = registerMockObject("src", {
    path: livePath.track(0).clipSlot(0).clip(),
    properties: {
      is_arrangement_clip: 0,
      looping: 1,
      loop_start: 0,
      loop_end: 4,
      start_marker: 0,
      ...props,
    },
  });
  const track = registerMockObject("track0", {
    path: livePath.track(0),
    methods: {
      duplicate_clip_to_arrangement: () => {
        order.push("duplicate");

        return ["id", "99"];
      },
    },
  });
  const copy = registerMockObject("99", {
    path: livePath.track(0).arrangementClip(0),
  });

  source.set.mockImplementation((prop: string, value: unknown) => {
    order.push(`src.${prop}=${String(value)}`);
  });
  copy.set.mockImplementation((prop: string, value: unknown) => {
    order.push(`copy.${prop}=${String(value)}`);
  });

  return { source, track, copy, order };
}

describe("duplicateAsOneLoop", () => {
  it("stretches the source loop, duplicates, then restores both loops", () => {
    const { source, track, order } = setup({});

    const clip = duplicateAsOneLoop(
      LiveAPI.from("id src"),
      LiveAPI.from(livePath.track(0)),
      236,
      320,
    );

    expect(clip.id).toBe("99");
    expect(track.call).toHaveBeenCalledWith(
      "duplicate_clip_to_arrangement",
      "id src",
      236,
    );
    expect(order).toStrictEqual([
      "src.loop_end=320",
      "duplicate",
      "src.loop_end=4",
      "copy.loop_end=4",
    ]);
    expect(source.set).toHaveBeenCalledTimes(2);
  });

  it("measures the stretch from a start marker inside the loop", () => {
    const { order } = setup({ loop_start: 0, loop_end: 8, start_marker: 2 });

    duplicateAsOneLoop(
      LiveAPI.from("id src"),
      LiveAPI.from(livePath.track(0)),
      0,
      64,
    );

    expect(order[0]).toBe("src.loop_end=66");
  });

  it("restores the source loop when the duplicate fails", () => {
    const { track, order } = setup({});

    track.call.mockImplementation(() => {
      throw new Error("no room");
    });

    expect(() =>
      duplicateAsOneLoop(
        LiveAPI.from("id src"),
        LiveAPI.from(livePath.track(0)),
        0,
        320,
      ),
    ).toThrow("no room");
    expect(order).toStrictEqual(["src.loop_end=320", "src.loop_end=4"]);
  });
});

describe("canStretchLoop", () => {
  it("accepts a looping session clip only", () => {
    setup({});
    expect(canStretchLoop(LiveAPI.from("id src"))).toBe(true);

    setup({ looping: 0 });
    expect(canStretchLoop(LiveAPI.from("id src"))).toBe(false);

    setup({ is_arrangement_clip: 1 });
    expect(canStretchLoop(LiveAPI.from("id src"))).toBe(false);
  });
});
