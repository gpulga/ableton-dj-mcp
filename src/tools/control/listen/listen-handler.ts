// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

// Node-side handler for adj-listen: record (or load) audio, analyze it in
// Node, and return the report with a spectrogram image the model can read.

import { type CallLiveApiFunction } from "#src/mcp-server/create-mcp-server.ts";
import { type McpResponse } from "#src/mcp-server/max-api-adapter.ts";
import { timeSigToAbletonBeatsPerBar } from "#src/notation/barbeat/time/barbeat-time.ts";
import { errorMessage } from "#src/shared/error-utils.ts";
import { formatErrorResponse } from "#src/shared/mcp-response-utils.ts";
import { parseToolPayload } from "#src/tools/clip/automate/tool-payload.ts";
import { type DecodedAudio } from "#src/tools/control/listen/analysis/decode/audio-decoder.ts";
import { readAudioFile } from "#src/tools/control/listen/analysis/decode/audio-file-reader.ts";
import { analyzeAudio } from "#src/tools/control/listen/analysis/report/analyze-audio.ts";
import { SPECTROGRAM_LEGEND } from "#src/tools/control/listen/analysis/report/spectrogram-image.ts";
import { parseTimeSignature } from "#src/tools/shared/utils.ts";
import {
  type CaptureTiming,
  captureAudio,
  DEFAULT_TIMING,
} from "./listen-capture.ts";

const DEFAULT_BARS = 8;
const READ_RETRIES = 8;
const READ_RETRY_MS = 250;

export interface ListenArgs {
  bars?: number;
  trackIndex?: number;
  startTime?: string;
  startLocator?: string;
  mute?: string;
  file?: string;
  tempo?: number;
  spectrogram?: boolean;
  keep?: boolean;
}

interface LiveSetInfo {
  tempo?: number;
  timeSignature?: string;
  isPlaying?: boolean;
  tracks?: { name?: string; trackIndex?: number }[];
  locators?: { id?: string; name?: string; time?: string }[];
}

type ListenContent =
  | { type: "text"; text: string }
  | { type: "image"; data: string; mimeType: string };

export interface ListenResponse {
  content: ListenContent[];
  isError?: boolean;
}

const BAR_COLUMNS_NOTE =
  "bars columns: lufs = bar loudness, peak = sample peak dBFS, sub..air = band power dB, " +
  "brightHz = spectral centroid, kick/hat = onsets in the 30-150 Hz / 6-16 kHz ranges " +
  "(kick-like and hat-like hits), corr = L/R correlation (1 mono, <0 phase trouble), " +
  "pitches = strongest pitch classes, bassNote = strongest bass pitch class.";

/**
 * Handle an adj-listen call
 * @param next - v8 dispatcher
 * @param args - Tool args
 * @param timing - Capture polling overrides (tests)
 * @returns Report text plus optional spectrogram image
 */
export async function handleListen(
  next: CallLiveApiFunction,
  args: ListenArgs,
  timing: CaptureTiming = DEFAULT_TIMING,
): Promise<ListenResponse | McpResponse> {
  try {
    const liveSet = parseToolPayload(
      (await next("adj-read-live-set", {
        include: ["tracks", "locators"],
      })) as McpResponse,
    ) as LiveSetInfo;
    const { numerator, denominator } = parseTimeSignature(
      liveSet.timeSignature ?? "4/4",
    );
    const beatsPerBar = timeSigToAbletonBeatsPerBar(numerator, denominator);
    const tempo = args.tempo ?? liveSet.tempo ?? 120;
    const barSeconds = (beatsPerBar * 60) / tempo;
    let audio: DecodedAudio;
    let source: Record<string, unknown>;

    if (args.file == null) {
      const bars = args.bars ?? DEFAULT_BARS;
      const capture = await captureAudio(
        next,
        {
          bars,
          barSeconds,
          timeSigNumerator: numerator,
          timeSigDenominator: denominator,
          sourceTrackName: sourceTrackName(liveSet, args.trackIndex),
          startTime: args.startTime ?? locatorTime(liveSet, args.startLocator),
          muteTrackIndexes: parseIndexes(args.mute),
          wasPlaying: liveSet.isPlaying === true,
          keep: args.keep === true,
        },
        timing,
      );

      audio = await readWithRetry(capture.sampleFile, timing.pollMs);
      source = {
        recorded:
          args.trackIndex == null ? "master" : `track ${args.trackIndex}`,
        songStart: capture.songStart,
        file: capture.sampleFile,
        ...(args.mute ? { muted: args.mute } : {}),
        ...(capture.warnings.length > 0 ? { warnings: capture.warnings } : {}),
      };
    } else {
      audio = await readAudioFile(args.file);
      source = { file: args.file };
    }

    const { report, spectrogramPng } = analyzeAudio(audio, {
      tempo,
      beatsPerBar,
      bars: args.file == null ? (args.bars ?? DEFAULT_BARS) : args.bars,
      detectTempo: args.file != null && args.tempo == null,
      spectrogram: args.spectrogram,
    });
    const text = JSON.stringify({
      source,
      ...report,
      notes: [BAR_COLUMNS_NOTE],
    });
    const content: ListenContent[] = [{ type: "text", text }];

    if (spectrogramPng) {
      content.push(
        {
          type: "image",
          data: spectrogramPng.toString("base64"),
          mimeType: "image/png",
        },
        { type: "text", text: SPECTROGRAM_LEGEND },
      );
    }

    return { content };
  } catch (error) {
    return formatErrorResponse(`listen failed: ${errorMessage(error)}`);
  }
}

function sourceTrackName(
  liveSet: LiveSetInfo,
  trackIndex: number | undefined,
): string | null {
  if (trackIndex == null) return null;

  const track = liveSet.tracks?.find((t) => t.trackIndex === trackIndex);

  if (track?.name == null) throw new Error(`no track at index ${trackIndex}`);

  return track.name;
}

function locatorTime(
  liveSet: LiveSetInfo,
  locator: string | undefined,
): string | undefined {
  if (locator == null) return undefined;

  const found = liveSet.locators?.find(
    (l) => l.id === locator || l.name === locator,
  );

  if (found?.time == null) throw new Error(`no locator "${locator}"`);

  return found.time;
}

/**
 * Parse a comma-separated list of track indexes
 * @param list - e.g. "0, 2,3"
 * @returns Indexes
 */
export function parseIndexes(list: string | undefined): number[] {
  if (list == null || list.trim() === "") return [];

  return list.split(",").map((part) => {
    const index = Number(part.trim());

    if (!Number.isInteger(index) || index < 0) {
      throw new Error(`invalid track index "${part.trim()}" in mute`);
    }

    return index;
  });
}

/**
 * Live finishes writing the file just after the clip stops; retry briefly
 * @param filePath - Recorded file
 * @param retryMs - Delay between attempts
 * @returns Decoded audio
 */
async function readWithRetry(
  filePath: string,
  retryMs: number,
): Promise<DecodedAudio> {
  let lastError: unknown;

  for (let attempt = 0; attempt < READ_RETRIES; attempt++) {
    try {
      const audio = await readAudioFile(filePath);

      if ((audio.channels[0]?.length ?? 0) > 0) return audio;
      lastError = new Error("recording is empty");
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) =>
      setTimeout(resolve, Math.min(retryMs, READ_RETRY_MS)),
    );
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
