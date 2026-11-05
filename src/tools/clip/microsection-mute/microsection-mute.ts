// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

import { updateClip } from "#src/tools/clip/update/update-clip.ts";

interface MicrosectionMuteArgs {
  clipIds?: string;
  microsections?: string;
}

interface ParsedMicrosection {
  barStart: number;
  barEnd: number;
  /** Empty array = peak (no mute). null = "all" (whole clip range). */
  pitches: string[] | null;
  /** Original line for error messages. */
  raw: string;
  lineNumber: number;
}

interface MicrosectionMuteResult {
  clipsUpdated: number;
  transformsApplied: number;
  transforms: string;
}

/**
 * Apply a microsection mute map to one or more clips.
 *
 * Builds a `transforms` string of `velocity = 0` rules over bar ranges and
 * delegates to `adj-update-clip` (merge mode) so existing notes are preserved
 * but velocity-zeroed in the requested ranges. Velocity=0 (not delete) is used
 * deliberately so humanized notes (timing nudged off-grid) still get caught.
 *
 * @param args - Tool arguments
 * @param args.clipIds - Comma-separated clip ID(s) to update
 * @param args.microsections - Multi-line mute map (see def for grammar)
 * @param context - Tool execution context (forwarded to updateClip)
 * @returns Summary of clips updated and transforms applied
 */
export async function microsectionMute(
  { clipIds, microsections }: MicrosectionMuteArgs = {},
  context: Partial<ToolContext> = {},
): Promise<MicrosectionMuteResult> {
  if (!clipIds) {
    throw new Error("microsectionMute failed: clipIds is required");
  }

  if (!microsections) {
    throw new Error("microsectionMute failed: microsections is required");
  }

  const parsed = parseMicrosections(microsections);
  const transforms = buildTransforms(parsed);

  if (transforms.length === 0) {
    return {
      clipsUpdated: 0,
      transformsApplied: 0,
      transforms: "",
    };
  }

  const transformString = transforms.join("\n");

  const updateResult = await updateClip(
    {
      ids: clipIds,
      transforms: transformString,
      noteUpdateMode: "merge",
    },
    context,
  );

  const clipsUpdated = Array.isArray(updateResult) ? updateResult.length : 1;

  return {
    clipsUpdated,
    transformsApplied: transforms.length,
    transforms: transformString,
  };
}

const COMMENT_PREFIX = "#";
/** End beat larger than any bar, so a range covers its whole final bar */
const END_BEAT_ANY_METER = 999;
const ALL_TOKEN = "all";

/**
 * Parse the multi-line microsections grammar into structured entries.
 *
 * Per-line format:
 *   <barStart>-<barEnd>: <pitch1>, <pitch2>, ...
 *   <barStart>-<barEnd>: all
 *   <barStart>-<barEnd>:
 *
 * @param input - Raw microsections string from the tool arg
 * @returns Parsed microsection entries in declaration order
 */
export function parseMicrosections(input: string): ParsedMicrosection[] {
  const result: ParsedMicrosection[] = [];

  const lines = input.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1;

    const stripped = stripInlineComment(lines[i] as string).trim();

    if (stripped.length === 0) continue;

    const colonIdx = stripped.indexOf(":");

    if (colonIdx === -1) {
      throw new Error(
        `microsectionMute failed: line ${lineNumber} missing ':' — expected '<barStart>-<barEnd>: <pitch list>'. Got: '${stripped}'`,
      );
    }

    const rangePart = stripped.slice(0, colonIdx).trim();
    const mutePart = stripped.slice(colonIdx + 1).trim();

    const { barStart, barEnd } = parseBarRange(rangePart, lineNumber);
    const pitches = parsePitchList(mutePart);

    result.push({
      barStart,
      barEnd,
      pitches,
      raw: stripped,
      lineNumber,
    });
  }

  return result;
}

function stripInlineComment(line: string): string {
  // '#' is a comment marker only at line-start or after whitespace.
  // Sharp note names (F#1, C#3, etc.) use '#' immediately after a letter,
  // so we leave those alone.
  for (let i = 0; i < line.length; i++) {
    if (line[i] !== COMMENT_PREFIX) continue;

    if (i === 0) return "";

    const prev = line[i - 1] as string;

    if (prev === " " || prev === "\t") return line.slice(0, i);
  }

  return line;
}

function parseBarRange(
  rangePart: string,
  lineNumber: number,
): { barStart: number; barEnd: number } {
  const dashIdx = rangePart.indexOf("-");

  if (dashIdx === -1) {
    throw new Error(
      `microsectionMute failed: line ${lineNumber} bar range missing '-' separator. Got: '${rangePart}'`,
    );
  }

  const startStr = rangePart.slice(0, dashIdx).trim();
  const endStr = rangePart.slice(dashIdx + 1).trim();

  const barStart = Number.parseInt(startStr, 10);
  const barEnd = Number.parseInt(endStr, 10);

  if (!Number.isFinite(barStart) || barStart < 1) {
    throw new Error(
      `microsectionMute failed: line ${lineNumber} barStart must be a positive integer. Got: '${startStr}'`,
    );
  }

  if (!Number.isFinite(barEnd) || barEnd < barStart) {
    throw new Error(
      `microsectionMute failed: line ${lineNumber} barEnd must be >= barStart. Got: '${endStr}'`,
    );
  }

  return { barStart, barEnd };
}

function parsePitchList(mutePart: string): string[] | null {
  if (mutePart.length === 0) return [];

  if (mutePart.toLowerCase() === ALL_TOKEN) return null;

  return mutePart
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/**
 * Convert parsed microsections to transform strings consumable by
 * `adj-update-clip`.
 *
 * Each range ends at `<barEnd>|${END_BEAT_ANY_METER}`. The transform time
 * filter compares (bar, beat) as a pair, so a beat past any real bar length
 * covers the whole final bar in every time signature without reaching into
 * the next bar. One string then works for every clip in a multi-clip call.
 *
 * @param microsections - Parsed microsection entries
 * @returns Transform expression strings, one per pitch × range
 */
export function buildTransforms(microsections: ParsedMicrosection[]): string[] {
  const transforms: string[] = [];

  for (const ms of microsections) {
    if (ms.pitches !== null && ms.pitches.length === 0) continue;

    const range = `${ms.barStart}|1-${ms.barEnd}|${END_BEAT_ANY_METER}`;

    if (ms.pitches === null) {
      transforms.push(`${range}: velocity = 0`);
      continue;
    }

    for (const pitch of ms.pitches) {
      transforms.push(`${pitch} ${range}: velocity = 0`);
    }
  }

  return transforms;
}
