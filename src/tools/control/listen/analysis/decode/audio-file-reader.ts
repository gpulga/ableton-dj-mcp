// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

// Reads an audio file into float channels. WAV/AIFF decode natively; other
// formats (mp3, flac, m4a...) go through ffmpeg when it is installed.

import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { type DecodedAudio, decodeAudio } from "./audio-decoder.ts";

const NATIVE_EXTENSIONS = new Set([".wav", ".aif", ".aiff", ".aifc"]);

// Node for Max does not inherit the shell PATH, so look in the usual places
const FFMPEG_CANDIDATES = [
  "/opt/homebrew/bin/ffmpeg",
  "/usr/local/bin/ffmpeg",
  "/usr/bin/ffmpeg",
  String.raw`C:\ffmpeg\bin\ffmpeg.exe`,
];

const FFMPEG_SAMPLE_RATE = 44_100;
const FFMPEG_MAX_BUFFER = 1024 * 1024 * 1024;

/**
 * Read and decode an audio file
 * @param filePath - Absolute path to the audio file
 * @param ffmpegCandidates - Where to look for ffmpeg (tests override)
 * @returns Decoded audio
 */
export async function readAudioFile(
  filePath: string,
  ffmpegCandidates: string[] = FFMPEG_CANDIDATES,
): Promise<DecodedAudio> {
  if (!existsSync(filePath)) {
    throw new Error(`audio file not found: ${filePath}`);
  }

  if (NATIVE_EXTENSIONS.has(extname(filePath).toLowerCase())) {
    return decodeAudio(await readFile(filePath));
  }

  const ffmpeg = findFfmpeg(ffmpegCandidates);

  if (ffmpeg == null) {
    throw new Error(
      `can't decode ${extname(filePath)} without ffmpeg. Install ffmpeg or use a WAV/AIFF file`,
    );
  }

  return await decodeWithFfmpeg(ffmpeg, filePath);
}

/**
 * Locate an ffmpeg binary
 * @param candidates - Paths to try (tests override)
 * @returns Path to ffmpeg, or null when none is installed
 */
export function findFfmpeg(
  candidates: string[] = FFMPEG_CANDIDATES,
): string | null {
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

/**
 * Decode any format ffmpeg understands into stereo float channels
 * @param ffmpeg - ffmpeg binary path
 * @param filePath - Audio file path
 * @returns Decoded audio at 44.1 kHz
 */
export function decodeWithFfmpeg(
  ffmpeg: string,
  filePath: string,
): Promise<DecodedAudio> {
  const args = [
    "-v",
    "error",
    "-i",
    filePath,
    "-f",
    "f32le",
    "-ac",
    "2",
    "-ar",
    String(FFMPEG_SAMPLE_RATE),
    "pipe:1",
  ];

  return new Promise((resolve, reject) => {
    execFile(
      ffmpeg,
      args,
      { encoding: "buffer", maxBuffer: FFMPEG_MAX_BUFFER },
      (error, stdout) => {
        if (error) {
          reject(
            new Error(`ffmpeg failed to decode ${filePath}: ${error.message}`),
          );

          return;
        }

        resolve(deinterleaveStereo(stdout));
      },
    );
  });
}

/**
 * Split interleaved little-endian float32 stereo into two channels
 * @param bytes - Raw f32le stereo bytes
 * @returns Decoded audio
 */
export function deinterleaveStereo(bytes: Uint8Array): DecodedAudio {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.length);
  const frames = Math.floor(bytes.length / 8);
  const left = new Float32Array(frames);
  const right = new Float32Array(frames);

  for (let i = 0; i < frames; i++) {
    left[i] = view.getFloat32(i * 8, true);
    right[i] = view.getFloat32(i * 8 + 4, true);
  }

  return { sampleRate: FFMPEG_SAMPLE_RATE, channels: [left, right] };
}
