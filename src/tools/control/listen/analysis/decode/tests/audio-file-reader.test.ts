// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { encodeWav } from "#src/tools/control/listen/tests/audio-test-helpers.ts";
import {
  decodeWithFfmpeg,
  deinterleaveStereo,
  findFfmpeg,
  readAudioFile,
} from "../audio-file-reader.ts";

const dir = mkdtempSync(join(tmpdir(), "adj-listen-reader-"));

afterAll(() => rmSync(dir, { recursive: true, force: true }));

/**
 * Write an executable shell script standing in for ffmpeg
 * @param name - File name
 * @param body - Script body
 * @returns Script path
 */
function fakeFfmpeg(name: string, body: string): string {
  const path = join(dir, name);

  writeFileSync(path, `#!/bin/sh\n${body}\n`);
  chmodSync(path, 0o755);

  return path;
}

describe("readAudioFile", () => {
  it("decodes WAV natively", async () => {
    const path = join(dir, "tone.WAV");

    writeFileSync(path, encodeWav([Float32Array.of(0.5, -0.5)], 48_000));

    const audio = await readAudioFile(path);

    expect(audio.sampleRate).toBe(48_000);
    expect(audio.channels[0]?.[0]).toBeCloseTo(0.5, 4);
  });

  it("fails clearly for a missing file", async () => {
    await expect(readAudioFile(join(dir, "nope.wav"))).rejects.toThrow(
      "audio file not found",
    );
  });

  it("needs ffmpeg for compressed formats", async () => {
    const path = join(dir, "song.mp3");

    writeFileSync(path, "not really mp3");

    await expect(readAudioFile(path, [])).rejects.toThrow(
      "can't decode .mp3 without ffmpeg",
    );
  });

  it("decodes other formats through ffmpeg", async () => {
    const path = join(dir, "song.flac");
    // Two stereo frames of float32 zeros
    const ffmpeg = fakeFfmpeg("ffmpeg-ok", "head -c 16 /dev/zero");

    writeFileSync(path, "flac bytes");

    const audio = await readAudioFile(path, [join(dir, "missing"), ffmpeg]);

    expect(audio.sampleRate).toBe(44_100);
    expect(audio.channels.map((c) => c.length)).toStrictEqual([2, 2]);
  });
});

describe("findFfmpeg", () => {
  it("returns the first existing candidate or null", () => {
    const ffmpeg = fakeFfmpeg("ffmpeg-find", "exit 0");

    expect(findFfmpeg([join(dir, "missing"), ffmpeg])).toBe(ffmpeg);
    expect(findFfmpeg([join(dir, "missing")])).toBeNull();
    expect(typeof findFfmpeg()).not.toBe("undefined");
  });
});

describe("decodeWithFfmpeg", () => {
  it("rejects when ffmpeg fails", async () => {
    const ffmpeg = fakeFfmpeg("ffmpeg-fail", "echo boom >&2; exit 1");

    await expect(decodeWithFfmpeg(ffmpeg, "/x.mp3")).rejects.toThrow(
      "ffmpeg failed to decode /x.mp3",
    );
  });
});

describe("deinterleaveStereo", () => {
  it("splits interleaved float32 frames", () => {
    const bytes = new Uint8Array(new Float32Array([0.5, -0.25, 1, 0]).buffer);
    const audio = deinterleaveStereo(bytes);

    expect([...(audio.channels[0] ?? [])]).toStrictEqual([0.5, 1]);
    expect([...(audio.channels[1] ?? [])]).toStrictEqual([-0.25, 0]);
  });
});
