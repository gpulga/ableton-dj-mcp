// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

import { beforeEach, describe, expect, it } from "vitest";
import { livePath } from "#src/shared/live-api-path-builders.ts";
import { children } from "#src/test/mocks/mock-live-api.ts";
import { registerMockObject } from "#src/test/mocks/mock-registry.ts";
import "#src/live-api-adapter/live-api-extensions.ts";
import {
  snapshotArrangementTrack,
  warnArrangementWriteEffects,
} from "../arrangement-write-effects.ts";

type Span = [id: string, start: number, end: number];

/**
 * Register track 0 with arrangement clips at the given spans
 * @param spans - Clips on the track
 */
function setTrackClips(spans: Span[]): void {
  registerMockObject("track0", {
    path: livePath.track(0),
    type: "Track",
    properties: { arrangement_clips: children(...spans.map(([id]) => id)) },
  });

  for (const [id, start, end] of spans) {
    registerMockObject(id, {
      type: "Clip",
      properties: { start_time: start, end_time: end },
    });
  }
}

describe("warnArrangementWriteEffects", () => {
  beforeEach(() => {
    registerMockObject("live_set", {
      path: livePath.liveSet,
      type: "Song",
      properties: { signature_numerator: 4, signature_denominator: 4 },
    });
  });

  it("says nothing when the neighbours are untouched", () => {
    setTrackClips([["a", 0, 16]]);
    const before = snapshotArrangementTrack(0);

    setTrackClips([
      ["a", 0, 16],
      ["new", 16, 32],
    ]);

    expect(warnArrangementWriteEffects(before, ["new"])).toStrictEqual([]);
  });

  it("reports a clip the write deleted", () => {
    setTrackClips([["a", 32, 48]]);
    const before = snapshotArrangementTrack(0);

    setTrackClips([["new", 0, 64]]);

    expect(warnArrangementWriteEffects(before, ["new"])).toStrictEqual([
      "arrangement write overwrote the clip at 9|1 on track 0",
    ]);
    expect(outlet).toHaveBeenCalledWith(
      1,
      "arrangement write overwrote the clip at 9|1 on track 0",
    );
  });

  it("reports a clip cut short at its end", () => {
    setTrackClips([["a", 0, 64]]);
    const before = snapshotArrangementTrack(0);

    setTrackClips([
      ["a", 0, 32],
      ["new", 32, 64],
    ]);

    expect(warnArrangementWriteEffects(before, ["new"])).toStrictEqual([
      "arrangement write shortened the clip at 1|1 on track 0",
    ]);
  });

  it("reports a clip whose front was trimmed under a new id", () => {
    setTrackClips([["a", 32, 64]]);
    const before = snapshotArrangementTrack(0);

    setTrackClips([
      ["new", 16, 48],
      ["rest", 48, 64],
    ]);

    expect(warnArrangementWriteEffects(before, ["new"])).toStrictEqual([
      "arrangement write shortened the clip at 9|1 on track 0; it now starts at 13|1 on track 0",
    ]);
  });

  it("reports a clip split in two", () => {
    setTrackClips([["a", 0, 64]]);
    const before = snapshotArrangementTrack(0);

    setTrackClips([
      ["a", 0, 16],
      ["new", 16, 32],
      ["tail", 32, 64],
    ]);

    expect(warnArrangementWriteEffects(before, ["new"])).toStrictEqual([
      "arrangement write split the clip at 1|1 on track 0; its tail is now a separate clip at 9|1 on track 0",
    ]);
  });

  it("leaves out clips the write itself moved", () => {
    setTrackClips([["a", 0, 16]]);
    const before = snapshotArrangementTrack(0);

    setTrackClips([["a", 16, 32]]);

    expect(warnArrangementWriteEffects(before, ["a"])).toStrictEqual([]);
  });
});
