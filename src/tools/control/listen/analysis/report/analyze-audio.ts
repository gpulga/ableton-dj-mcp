// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

// Turns decoded audio into a compact, bar-aligned listening report plus an
// optional spectrogram image.

import { type DecodedAudio } from "#src/tools/control/listen/analysis/decode/audio-decoder.ts";
import { at } from "#src/tools/control/listen/analysis/dsp/fft.ts";
import { estimateKey } from "#src/tools/control/listen/analysis/dsp/key-estimate.ts";
import {
  integratedLoudness,
  kWeight,
  loudnessRange,
  truePeakDb,
} from "#src/tools/control/listen/analysis/dsp/loudness.ts";
import { pickOnsets } from "#src/tools/control/listen/analysis/dsp/onsets.ts";
import { computePitchFrames } from "#src/tools/control/listen/analysis/dsp/pitch-frames.ts";
import {
  BANDS,
  computeSpectralFrames,
  HOP_SIZE,
} from "#src/tools/control/listen/analysis/dsp/spectral-frames.ts";
import { estimateTempo } from "#src/tools/control/listen/analysis/dsp/tempo-estimate.ts";
import {
  analyzeBars,
  type BarRow,
  powerToDb,
  stereoCorrelation,
} from "./bar-analysis.ts";
import { renderSpectrogram } from "./spectrogram-image.ts";

// Flux peaks land slightly before the hit (the window sees it early)
const ONSET_LATENCY_SECONDS = 0.03;
const JUMP_THRESHOLD_LU = 3;
// Longer analyses are reported in 4-bar phrases to keep the table readable
const MAX_SINGLE_BAR_ROWS = 64;
const PHRASE_BARS = 4;
// Tempo is detected on a one-minute excerpt from a third of the way in,
// past most intros
const TEMPO_EXCERPT_SECONDS = 60;

export interface AnalyzeOptions {
  /** Quarter notes per minute (fallback when detecting fails) */
  tempo: number;
  /** Quarter notes per bar */
  beatsPerBar: number;
  /** Bars to analyze from the start of the grid (default: all) */
  bars?: number;
  /** Detect tempo and the first beat from the audio */
  detectTempo?: boolean;
  spectrogram?: boolean;
}

export interface ListenReport {
  summary: Record<string, unknown>;
  /** Header row, then one space-separated row per bar (or phrase) */
  bars: string[];
  jumps: string[];
}

export interface AnalyzeResult {
  report: ListenReport;
  spectrogramPng: Buffer | null;
}

interface Grid {
  tempo: number;
  tempoSource: "set" | "detected";
  startSeconds: number;
  barSeconds: number;
}

const BAR_HEADER =
  "bar lufs peak " +
  BANDS.map((band) => band.name).join(" ") +
  " brightHz kick hat corr pitches bassNote";

/**
 * Analyze audio on a bar grid
 * @param audio - Decoded audio
 * @param options - Tempo grid and output options
 * @returns Report and optional spectrogram
 */
export function analyzeAudio(
  audio: DecodedAudio,
  options: AnalyzeOptions,
): AnalyzeResult {
  const { sampleRate } = audio;

  if ((audio.channels[0]?.length ?? 0) === 0) {
    throw new Error("audio is empty");
  }

  const grid = buildGrid(audio, options);
  const raw = sliceToGrid(audio, grid, options.bars);
  const length = raw[0]?.length ?? 0;
  const totalBars = Math.max(
    1,
    Math.round(length / sampleRate / grid.barSeconds),
  );
  const rowBars = totalBars > MAX_SINGLE_BAR_ROWS ? PHRASE_BARS : 1;
  const mono = toMono(raw);
  const weighted = raw.map((channel) => kWeight(channel, sampleRate));
  const spectral = computeSpectralFrames(mono, sampleRate);
  const pitch = computePitchFrames(mono, sampleRate);
  const shift = (t: number): number => t + ONSET_LATENCY_SECONDS;
  const kickOnsets = pickOnsets(spectral.kickFlux, spectral.times).map(shift);
  const hatOnsets = pickOnsets(spectral.hatFlux, spectral.times).map(shift);
  const rows = analyzeBars(
    { raw, weighted, sampleRate, spectral, pitch, kickOnsets, hatOnsets },
    {
      barSeconds: grid.barSeconds * rowBars,
      barCount: Math.ceil(totalBars / rowBars),
      barsPerRow: rowBars,
    },
  );
  const key = estimateKey(sumChroma(pitch.chroma));
  const summary: Record<string, unknown> = {
    seconds: round(length / sampleRate, 2),
    bars: totalBars,
    tempo: grid.tempo,
    ...(grid.tempoSource === "detected"
      ? {
          tempoDetected: true,
          gridStartSeconds: round(grid.startSeconds, 3),
        }
      : {}),
    ...(rowBars > 1 ? { rowsPerPhrase: `${rowBars} bars per row` } : {}),
    integratedLufs: round(integratedLoudness(weighted, sampleRate)),
    loudnessRangeLu: round(loudnessRange(weighted, sampleRate)),
    truePeakDb: round(truePeakDb(raw)),
    bandsDb: Object.fromEntries(
      BANDS.map((band, b) => [
        band.name,
        round(powerToDb(mean(spectral.bandPower[b]))),
      ]),
    ),
    brightnessHz: Math.round(mean(spectral.centroid)),
    correlation: round(stereoCorrelation(raw, 0, length), 2),
    kickHits: kickOnsets.length,
    hatHits: hatOnsets.length,
    key: key ? `${key.key} (confidence ${round(key.confidence, 2)})` : null,
  };

  return {
    report: {
      summary,
      bars: [BAR_HEADER, ...rows.map(formatRow)],
      jumps: findJumps(rows),
    },
    spectrogramPng:
      options.spectrogram === false
        ? null
        : renderSpectrogram(
            spectral.spectrogram,
            HOP_SIZE / sampleRate,
            grid.barSeconds,
          ),
  };
}

/**
 * Bar grid from the given tempo, or detected from the audio
 * @param audio - Decoded audio
 * @param options - Analyze options
 * @returns Tempo, grid start and bar length
 */
function buildGrid(audio: DecodedAudio, options: AnalyzeOptions): Grid {
  const toGrid = (tempo: number, startSeconds: number): Grid => ({
    tempo,
    tempoSource: options.detectTempo === true ? "detected" : "set",
    startSeconds,
    barSeconds: (options.beatsPerBar * 60) / tempo,
  });

  if (options.detectTempo !== true) return toGrid(options.tempo, 0);

  const { sampleRate } = audio;
  const length = audio.channels[0]?.length ?? 0;
  const excerptStart = Math.floor(
    Math.max(
      0,
      Math.min(length / 3, length - TEMPO_EXCERPT_SECONDS * sampleRate),
    ),
  );
  const excerpt = toMono(
    audio.channels.map((channel) =>
      channel.subarray(
        excerptStart,
        excerptStart + TEMPO_EXCERPT_SECONDS * sampleRate,
      ),
    ),
  );
  const frames = computeSpectralFrames(excerpt, sampleRate);
  const strength = frames.kickFlux.map((v, i) => v + at(frames.hatFlux, i));
  const estimate = estimateTempo(strength, sampleRate / HOP_SIZE);

  if (estimate == null) {
    return { ...toGrid(options.tempo, 0), tempoSource: "set" };
  }

  const beatSeconds = 60 / estimate.bpm;
  // Project the excerpt's beat phase back to the first beat of the file
  const firstBeat =
    (((excerptStart / sampleRate + estimate.firstBeatSeconds) % beatSeconds) +
      beatSeconds) %
    beatSeconds;

  return toGrid(estimate.bpm, firstBeat);
}

function sliceToGrid(
  audio: DecodedAudio,
  grid: Grid,
  bars: number | undefined,
): Float32Array[] {
  const { sampleRate } = audio;
  const start = Math.round(grid.startSeconds * sampleRate);
  const end =
    bars == null
      ? undefined
      : start + Math.round(bars * grid.barSeconds * sampleRate);

  return audio.channels.map((channel) => channel.subarray(start, end));
}

function sumChroma(frames: Float64Array[]): Float64Array {
  const total = new Float64Array(12);

  for (const frame of frames) {
    for (let i = 0; i < 12; i++) total[i] = at(total, i) + at(frame, i);
  }

  return total;
}

/**
 * Bars whose loudness moves sharply from the bar before
 * @param rows - Per-bar rows
 * @returns Descriptions like "bar 9: +6.2 LU"
 */
export function findJumps(rows: BarRow[]): string[] {
  const jumps: string[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as BarRow;
    const delta = row.lufs - (rows[i - 1] as BarRow).lufs;

    if (Math.abs(delta) >= JUMP_THRESHOLD_LU) {
      jumps.push(`bar ${row.bar}: ${delta > 0 ? "+" : ""}${round(delta)} LU`);
    }
  }

  return jumps;
}

function formatRow(row: BarRow): string {
  return [
    row.bar,
    round(row.lufs),
    round(row.peakDb),
    ...row.bandsDb.map((db) => round(db)),
    Math.round(row.centroidHz),
    row.kickHits,
    row.hatHits,
    round(row.correlation, 2),
    row.pitches.join(",") || "-",
    row.bassNote ?? "-",
  ].join(" ");
}

function toMono(channels: Float32Array[]): Float32Array {
  const length = channels[0]?.length ?? 0;
  const mono = new Float32Array(length);

  for (const channel of channels) {
    for (let i = 0; i < length; i++)
      mono[i] = at(mono, i) + at(channel, i) / channels.length;
  }

  return mono;
}

function mean(values: Float64Array | undefined): number {
  if (values == null || values.length === 0) return 0;

  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;

  return Math.round(value * factor) / factor;
}
