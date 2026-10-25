// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { handleListen, parseIndexes } from "../listen-handler.ts";
import { encodeWav, sine, TEST_RATE } from "./audio-test-helpers.ts";
import { argsFor, fakeLive } from "./fake-live.ts";

const FAST = { pollMs: 1, graceMs: 50, settleMs: 0 };
const dir = mkdtempSync(join(tmpdir(), "adj-listen-handler-"));
const wavPath = join(dir, "capture.wav");

writeFileSync(wavPath, encodeWav([sine(440, 4, 0.3)], TEST_RATE));

afterAll(() => rmSync(dir, { recursive: true, force: true }));

function textOf(response: Awaited<ReturnType<typeof handleListen>>): string {
  const item = response.content[0];

  return item?.type === "text" ? item.text : "";
}

describe("handleListen", () => {
  it("analyzes a file with an image and legend", async () => {
    const response = await handleListen(fakeLive(), {
      file: wavPath,
      tempo: 120,
    });
    const report = JSON.parse(textOf(response));

    expect(response.isError).toBeUndefined();
    expect(report.source).toStrictEqual({ file: wavPath });
    expect(report.summary).toMatchObject({ bars: 2, tempo: 120 });
    expect(report.summary.tempoDetected).toBeUndefined();
    expect(response.content[1]).toMatchObject({
      type: "image",
      mimeType: "image/png",
    });
    expect(response.content[2]).toMatchObject({ type: "text" });
  });

  it("omits the image when spectrogram is false", async () => {
    const response = await handleListen(fakeLive(), {
      file: wavPath,
      spectrogram: false,
    });

    expect(response.content).toHaveLength(1);
  });

  it("records, then analyzes the recorded file", async () => {
    const next = fakeLive({ sampleFile: wavPath, isPlaying: true });
    const response = await handleListen(
      next,
      { bars: 1, trackIndex: 0, mute: "1" },
      FAST,
    );
    const report = JSON.parse(textOf(response));

    expect(report.source).toMatchObject({
      recorded: "track 0",
      file: wavPath,
      muted: "1",
    });
    expect(report.summary.bars).toBe(1);
    expect(argsFor(next, "adj-update-track")[0]).toMatchObject({
      inputRoutingTypeId: expect.any(String),
    });
  });

  it("reports cleanup warnings with the source", async () => {
    const next = fakeLive({ sampleFile: wavPath, failOn: ["adj-delete"] });
    const report = JSON.parse(
      textOf(await handleListen(next, { spectrogram: false }, FAST)),
    );

    expect(report.source.recorded).toBe("master");
    expect(report.source.warnings).toHaveLength(1);
    expect(report.summary.bars).toBe(2);
  });

  it("records from a locator's position", async () => {
    const next = fakeLive({ sampleFile: wavPath, currentTimes: ["41|2"] });
    const report = JSON.parse(
      textOf(
        await handleListen(
          next,
          { bars: 1, startLocator: "Drop", spectrogram: false },
          FAST,
        ),
      ),
    );

    expect(report.source.songStart).toBe("41|1");
    expect(argsFor(next, "adj-playback")).toContainEqual({
      action: "update-arrangement",
      startTime: "41|1",
    });
  });

  it("returns an error response for bad input", async () => {
    const badMute = await handleListen(fakeLive(), { mute: "1,x" }, FAST);
    const badTrack = await handleListen(fakeLive(), { trackIndex: 9 }, FAST);

    expect(badMute.isError).toBe(true);
    expect(textOf(badMute)).toBe(
      'listen failed: invalid track index "x" in mute',
    );
    expect(textOf(badTrack)).toBe("listen failed: no track at index 9");
    expect(
      textOf(await handleListen(fakeLive(), { startLocator: "Nope" }, FAST)),
    ).toBe('listen failed: no locator "Nope"');
  });

  it("gives up when the recorded file never becomes readable", async () => {
    const empty = join(dir, "empty.wav");

    writeFileSync(empty, encodeWav([new Float32Array(0)], TEST_RATE));

    const missing = await handleListen(
      fakeLive({ sampleFile: join(dir, "never.wav") }),
      {},
      FAST,
    );
    const silent = await handleListen(
      fakeLive({ sampleFile: empty }),
      {},
      FAST,
    );

    expect(textOf(missing)).toContain("audio file not found");
    expect(textOf(silent)).toBe("listen failed: recording is empty");
  });
});

describe("parseIndexes", () => {
  it("parses comma-separated indexes", () => {
    expect(parseIndexes(undefined)).toStrictEqual([]);
    expect(parseIndexes(" ")).toStrictEqual([]);
    expect(parseIndexes("0, 2,3")).toStrictEqual([0, 2, 3]);
    expect(() => parseIndexes("-1")).toThrow('invalid track index "-1"');
  });
});
