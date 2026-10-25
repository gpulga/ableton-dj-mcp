// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

// Starts, verifies and stops the recording in the capture track's slot.

import { type CallLiveApiFunction } from "#src/mcp-server/create-mcp-server.ts";
import {
  abletonBeatsToBarBeat,
  barBeatToAbletonBeats,
} from "#src/notation/barbeat/time/barbeat-time.ts";
import { call, PLAYBACK, sleep } from "./live-calls.ts";

// Setting the start marker and firing the slot can race; a wrong start is
// discarded and retried
const MAX_START_ATTEMPTS = 3;

export interface CaptureTiming {
  pollMs: number;
  /** Extra time allowed past the expected recording length */
  graceMs: number;
  /** Pause after setting the start marker, before firing */
  settleMs: number;
}

export const DEFAULT_TIMING: CaptureTiming = {
  pollMs: 250,
  graceMs: 10_000,
  settleMs: 150,
};

export interface CapturePlan {
  bars: number;
  barSeconds: number;
  timeSigNumerator: number;
  timeSigDenominator: number;
  /** Name of the track to tap; null = master via Resampling */
  sourceTrackName: string | null;
  /** bar|beat to record from; omit to record what is playing */
  startTime?: string;
  muteTrackIndexes: number[];
  wasPlaying: boolean;
  keep: boolean;
}

export interface Take {
  /** Song position where recording began, when it could be read */
  songStart: string | null;
  warnings: string[];
}

interface ClipState {
  id?: string | number;
  recording?: boolean;
  playingPosition?: string;
}

/**
 * Record the planned bars into the slot, then stop the slot
 * @param next - v8 dispatcher
 * @param plan - Capture plan
 * @param slot - Recording slot "track/scene"
 * @param timing - Poll and wait settings
 * @returns Where the take started, plus warnings
 */
export async function recordTake(
  next: CallLiveApiFunction,
  plan: CapturePlan,
  slot: string,
  timing: CaptureTiming,
): Promise<Take> {
  const { timeSigNumerator: num, timeSigDenominator: den } = plan;
  const target =
    plan.startTime == null
      ? null
      : barBeatToAbletonBeats(plan.startTime, num, den);
  const warnings: string[] = [];
  let startBeats: number | null = null;

  for (let attempt = 1; attempt <= MAX_START_ATTEMPTS; attempt++) {
    await startRecording(next, plan, slot, timing, attempt > 1);
    startBeats = await waitForStart(next, plan, slot, timing);

    if (target == null || startBeats == null || startBeats === target) break;

    if (attempt === MAX_START_ATTEMPTS) {
      warnings.push(
        `recording began at ${abletonBeatsToBarBeat(startBeats, num, den)} instead of ${plan.startTime}`,
      );
    } else {
      await discardTake(next, slot);
    }
  }

  await waitForLength(next, plan, slot, timing);
  await call(next, PLAYBACK, { action: "stop-session-clips", slots: slot });

  return {
    songStart:
      startBeats == null ? null : abletonBeatsToBarBeat(startBeats, num, den),
    warnings,
  };
}

/**
 * The capture owns the transport when it started playback itself
 * @param plan - Capture plan
 * @returns Whether cleanup should stop the transport
 */
export function ownsTransport(plan: CapturePlan): boolean {
  return plan.startTime != null || !plan.wasPlaying;
}

/**
 * Fire the recording slot. With a start position the transport is stopped and
 * the start marker set to it: firing a slot from a stopped transport starts
 * playback and recording together at the start marker, with no launch
 * quantization delay. The marker goes last because "stop" resets it to 1|1.
 * @param next - v8 dispatcher
 * @param plan - Capture plan
 * @param slot - Recording slot
 * @param timing - Settle delay
 * @param retry - The transport was already stopped by a discarded take
 */
async function startRecording(
  next: CallLiveApiFunction,
  plan: CapturePlan,
  slot: string,
  timing: CaptureTiming,
  retry: boolean,
): Promise<void> {
  if (plan.startTime != null) {
    if (plan.wasPlaying && !retry) {
      await call(next, PLAYBACK, { action: "stop" });
    }

    // Any playback action with a position sets the start marker; this one
    // changes nothing else
    await call(next, PLAYBACK, {
      action: "update-arrangement",
      startTime: plan.startTime,
    });
    await sleep(timing.settleMs);
  }

  await call(next, PLAYBACK, { action: "play-session-clips", slots: slot });
}

/**
 * Wait until the slot is recording and work out where in the song it began
 * @param next - v8 dispatcher
 * @param plan - Capture plan
 * @param slot - Recording slot
 * @param timing - Poll settings
 * @returns Song position of the take start in beats, or null if unreadable
 */
async function waitForStart(
  next: CallLiveApiFunction,
  plan: CapturePlan,
  slot: string,
  timing: CaptureTiming,
): Promise<number | null> {
  // Launch quantization can delay the start by up to a couple of bars
  const deadline = Date.now() + plan.barSeconds * 2000 + timing.graceMs;

  while (Date.now() < deadline) {
    const clip = await readClip(next, slot);

    if (clip.recording && clip.playingPosition != null) {
      return await readSongStart(next, plan, clip.playingPosition);
    }

    await sleep(timing.pollMs);
  }

  throw new Error(
    "recording didn't start (is the transport able to start? is the track armed?)",
  );
}

async function waitForLength(
  next: CallLiveApiFunction,
  plan: CapturePlan,
  slot: string,
  timing: CaptureTiming,
): Promise<void> {
  const { timeSigNumerator: num, timeSigDenominator: den } = plan;
  const targetBeats = barBeatToAbletonBeats(`${plan.bars + 1}|1`, num, den);
  const deadline =
    Date.now() + plan.bars * plan.barSeconds * 1000 + timing.graceMs;

  while (Date.now() < deadline) {
    const clip = await readClip(next, slot);
    const recorded =
      clip.playingPosition == null
        ? 0
        : barBeatToAbletonBeats(clip.playingPosition, num, den);

    if (recorded >= targetBeats) return;

    await sleep(timing.pollMs);
  }

  throw new Error("recording didn't reach the requested length in time");
}

async function readSongStart(
  next: CallLiveApiFunction,
  plan: CapturePlan,
  playingPosition: string,
): Promise<number | null> {
  const { timeSigNumerator: num, timeSigDenominator: den } = plan;
  const state = await call<{ currentTime?: string }>(next, PLAYBACK, {
    action: "update-arrangement",
  });

  if (state.currentTime == null) return null;

  const songBeats =
    barBeatToAbletonBeats(state.currentTime, num, den) -
    barBeatToAbletonBeats(playingPosition, num, den);

  // Snap to the nearest 16th; the two reads are a few ms apart
  return Math.max(0, Math.round(songBeats * 4) / 4);
}

async function discardTake(
  next: CallLiveApiFunction,
  slot: string,
): Promise<void> {
  await call(next, PLAYBACK, { action: "stop" });

  const clip = await readClip(next, slot);

  if (clip.id != null) {
    await call(next, "adj-delete", { type: "clip", ids: String(clip.id) });
  }
}

function readClip(next: CallLiveApiFunction, slot: string): Promise<ClipState> {
  return call<ClipState>(next, "adj-read-clip", { slot, include: [] });
}
