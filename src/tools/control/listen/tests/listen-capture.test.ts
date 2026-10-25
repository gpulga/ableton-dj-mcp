// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, it } from "vitest";
import { type CapturePlan, captureAudio } from "../listen-capture.ts";
import { argsFor, callNames, fakeLive } from "./fake-live.ts";

const FAST = { pollMs: 1, graceMs: 50, settleMs: 0 };

function plan(overrides: Partial<CapturePlan> = {}): CapturePlan {
  return {
    bars: 8,
    barSeconds: 0.001,
    timeSigNumerator: 4,
    timeSigDenominator: 4,
    sourceTrackName: null,
    muteTrackIndexes: [],
    wasPlaying: true,
    keep: false,
    ...overrides,
  };
}

describe("captureAudio", () => {
  it("records the master into a temporary track and cleans up", async () => {
    const next = fakeLive();
    const result = await captureAudio(next, plan(), FAST);

    expect(result).toStrictEqual({
      sampleFile: "/tmp/capture.wav",
      songStart: "9|4",
      warnings: [],
    });
    expect(argsFor(next, "adj-create-track")[0]).toMatchObject({
      type: "audio",
      count: 1,
    });
    expect(argsFor(next, "adj-update-track")).toStrictEqual([
      { ids: "99", inputRoutingTypeId: "0", monitoringState: "off" },
      { ids: "99", arm: true },
    ]);
    expect(callNames(next)).toContain("adj-playback:play-session-clips");
    expect(callNames(next)).toContain("adj-playback:stop-session-clips");
    // The user was already playing: leave the transport alone
    expect(callNames(next)).not.toContain("adj-playback:stop");
    expect(argsFor(next, "adj-delete")).toStrictEqual([
      { type: "track", ids: "99" },
    ]);
  });

  it("taps a track after its mixer when recording one track", async () => {
    const next = fakeLive();

    await captureAudio(next, plan({ sourceTrackName: "Drums" }), FAST);

    expect(argsFor(next, "adj-update-track").slice(0, 2)).toStrictEqual([
      { ids: "99", inputRoutingTypeId: "1", monitoringState: "off" },
      { ids: "99", inputRoutingChannelId: "8" },
    ]);
  });

  it("falls back to the first channel, or none", async () => {
    const firstOnly = fakeLive({
      inputChannels: [{ name: "Something", inputId: "3" }],
    });

    await captureAudio(firstOnly, plan({ sourceTrackName: "Drums" }), FAST);
    expect(argsFor(firstOnly, "adj-update-track")[1]).toStrictEqual({
      ids: "99",
      inputRoutingChannelId: "3",
    });

    const none = fakeLive({ inputChannels: [] });

    await captureAudio(none, plan({ sourceTrackName: "Drums" }), FAST);
    expect(argsFor(none, "adj-update-track")[1]).toStrictEqual({
      ids: "99",
      arm: true,
    });
  });

  it("sets the start marker and records from exactly there", async () => {
    const next = fakeLive({ currentTimes: ["17|2"] });
    const result = await captureAudio(next, plan({ startTime: "17|1" }), FAST);
    const names = callNames(next);

    expect(result.songStart).toBe("17|1");
    expect(argsFor(next, "adj-playback").slice(0, 2)).toStrictEqual([
      { action: "stop" },
      { action: "update-arrangement", startTime: "17|1" },
    ]);
    expect(names.indexOf("adj-playback:update-arrangement")).toBeLessThan(
      names.indexOf("adj-playback:play-session-clips"),
    );
    expect(names.at(-2)).toBe("adj-playback:stop");
  });

  it("discards a take that started in the wrong place and retries", async () => {
    const next = fakeLive({
      currentTimes: ["1|2", "17|2"],
      positions: ["1|2", "1|2", "1|2", "9|1"],
    });
    const result = await captureAudio(
      next,
      plan({ startTime: "17|1", wasPlaying: false }),
      FAST,
    );

    expect(result.songStart).toBe("17|1");
    expect(result.warnings).toStrictEqual([]);
    expect(argsFor(next, "adj-delete")[0]).toStrictEqual({
      type: "clip",
      ids: "1",
    });
    expect(
      callNames(next).filter((n) => n === "adj-playback:play-session-clips"),
    ).toHaveLength(2);
  });

  it("warns when every attempt starts in the wrong place", async () => {
    const next = fakeLive({
      currentTimes: ["1|2"],
      positions: ["1|2", "1|2", "1|2", "1|2", "1|2", "9|1"],
    });
    const result = await captureAudio(next, plan({ startTime: "17|1" }), FAST);

    expect(result.songStart).toBe("1|1");
    expect(result.warnings).toStrictEqual([
      "recording began at 1|1 instead of 17|1",
    ]);
  });

  it("stops a transport it started", async () => {
    const next = fakeLive();

    await captureAudio(next, plan({ wasPlaying: false }), FAST);

    expect(callNames(next)).toContain("adj-playback:stop");
  });

  it("mutes only unmuted tracks and restores them", async () => {
    const next = fakeLive({ trackStates: { 1: "muted" } });

    await captureAudio(next, plan({ muteTrackIndexes: [0, 1] }), FAST);

    const updates = argsFor(next, "adj-update-track");

    expect(updates).toContainEqual({ ids: "2", mute: true });
    expect(updates).not.toContainEqual({ ids: "3", mute: true });
    expect(updates.at(-1)).toStrictEqual({ ids: "2", mute: false });
  });

  it("fails on a missing mute track and still cleans up", async () => {
    const next = fakeLive();

    await expect(
      captureAudio(next, plan({ muteTrackIndexes: [7] }), FAST),
    ).rejects.toThrow("no track at index 7 to mute");
    expect(argsFor(next, "adj-delete")).toHaveLength(1);
  });

  it("explains a routing that does not exist", async () => {
    const next = fakeLive({ inputTypes: [{ name: "Ext. In", inputId: "4" }] });

    await expect(
      captureAudio(next, plan({ sourceTrackName: "Pads" }), FAST),
    ).rejects.toThrow(
      'can\'t route "Pads" into the recording track (available: Ext. In)',
    );
  });

  it("times out when recording never starts", async () => {
    const next = fakeLive({ recording: false });

    await expect(captureAudio(next, plan(), FAST)).rejects.toThrow(
      "recording didn't start",
    );
  });

  it("times out when the take stops growing", async () => {
    const next = fakeLive({ positions: ["1|2"] });

    await expect(captureAudio(next, plan(), FAST)).rejects.toThrow(
      "recording didn't reach the requested length in time",
    );
  });

  it("reports cleanup problems with the main error", async () => {
    const next = fakeLive({ failOn: ["adj-update-track", "adj-delete"] });

    await expect(captureAudio(next, plan(), FAST)).rejects.toThrow(
      /adj-update-track failed: adj-update-track broke \(cleanup: adj-delete failed/,
    );
  });

  it("returns cleanup problems as warnings after a good recording", async () => {
    const next = fakeLive({ failOn: ["adj-delete"] });
    const result = await captureAudio(next, plan(), FAST);

    expect(result.warnings).toStrictEqual([
      "cleanup: adj-delete failed: adj-delete broke",
    ]);
  });

  it("keeps the track (disarmed) when asked", async () => {
    const next = fakeLive();

    await captureAudio(next, plan({ keep: true }), FAST);

    expect(argsFor(next, "adj-delete")).toHaveLength(0);
    expect(argsFor(next, "adj-update-track").at(-1)).toStrictEqual({
      ids: "99",
      arm: false,
    });
  });

  it("fails when the clip has no file", async () => {
    await expect(
      captureAudio(fakeLive({ sampleFile: null }), plan(), FAST),
    ).rejects.toThrow("the recording has no audio file");
  });

  it("leaves songStart null when the song time can't be read", async () => {
    const result = await captureAudio(
      fakeLive({ currentTimes: [null] }),
      plan(),
      FAST,
    );

    expect(result.songStart).toBeNull();
  });

  it("ignores Max warnings after a payload", async () => {
    const result = await captureAudio(
      fakeLive({ warnOn: "adj-create-track" }),
      plan(),
      FAST,
    );

    expect(result.sampleFile).toBe("/tmp/capture.wav");
  });
});
