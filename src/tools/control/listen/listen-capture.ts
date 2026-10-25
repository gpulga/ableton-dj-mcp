// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

// Records the live mix (or one track) into a session clip on a temporary
// audio track, using only existing tools through the v8 dispatcher.
// Session-slot recording is used instead of arrangement record because
// arrangement record would also print any playing session clips into the
// arrangement on other tracks.

import { type CallLiveApiFunction } from "#src/mcp-server/create-mcp-server.ts";
import { errorMessage } from "#src/shared/error-utils.ts";
import {
  type CapturePlan,
  type CaptureTiming,
  DEFAULT_TIMING,
  ownsTransport,
  recordTake,
} from "./capture-transport.ts";
import { call, PLAYBACK, UPDATE_TRACK } from "./live-calls.ts";

export {
  type CapturePlan,
  type CaptureTiming,
  DEFAULT_TIMING,
} from "./capture-transport.ts";

export const CAPTURE_TRACK_NAME = "ADJ Listen";
const RESAMPLING_INPUT = "Resampling";
const TRACK_TAP_CHANNELS = ["Post Mixer", "Post FX"];
const MUTED_STATES = new Set([
  "muted",
  "muted-also-via-solo",
  "muted-and-soloed",
]);

export interface CaptureResult {
  sampleFile: string;
  /** Cleanup problems (e.g. the recording track could not be deleted) */
  warnings: string[];
  /** Song position where recording began, when it could be read */
  songStart: string | null;
}

interface CaptureTrack {
  id: string;
  trackIndex: number;
}

interface CaptureState {
  /** Track ids this capture muted */
  restoreMutes: string[];
}

interface RoutingOption {
  name?: string;
  inputId?: string;
}

interface ClipState {
  sampleFile?: string;
}

/**
 * Record the planned bars and return the recorded file
 * @param next - v8 dispatcher
 * @param plan - What and how long to record
 * @param timing - Poll interval and timeout grace (tests shorten these)
 * @returns Recorded file path and start position
 */
export async function captureAudio(
  next: CallLiveApiFunction,
  plan: CapturePlan,
  timing: CaptureTiming = DEFAULT_TIMING,
): Promise<CaptureResult> {
  // Calls through the dispatcher skip Zod defaults, so pass them explicitly
  const created = await call<{ id: string | number; trackIndex: number }>(
    next,
    "adj-create-track",
    { type: "audio", name: CAPTURE_TRACK_NAME, count: 1 },
  );
  // create-track returns a numeric id; tools taking ids expect a string
  const track: CaptureTrack = {
    id: String(created.id),
    trackIndex: created.trackIndex,
  };
  const state: CaptureState = { restoreMutes: [] };
  let recorded: CaptureResult | null = null;
  let failure: unknown = null;

  try {
    recorded = await record(next, plan, timing, track, state);
  } catch (error) {
    failure = error;
  }

  const warnings = await cleanUp(next, track.id, state, plan);

  if (recorded == null) {
    const message = errorMessage(failure);

    throw new Error(
      warnings.length > 0 ? `${message} (${warnings.join("; ")})` : message,
    );
  }

  return { ...recorded, warnings: [...recorded.warnings, ...warnings] };
}

async function record(
  next: CallLiveApiFunction,
  plan: CapturePlan,
  timing: CaptureTiming,
  track: CaptureTrack,
  state: CaptureState,
): Promise<CaptureResult> {
  const slot = `${track.trackIndex}/0`;

  await routeInput(next, track, plan.sourceTrackName);
  await call(next, UPDATE_TRACK, { ids: track.id, arm: true });

  for (const index of plan.muteTrackIndexes) {
    const id = await muteTrack(next, index);

    if (id != null) state.restoreMutes.push(id);
  }

  const take = await recordTake(next, plan, slot, timing);

  const clip = await call<ClipState>(next, "adj-read-clip", {
    slot,
    include: ["sample"],
  });

  if (clip.sampleFile == null) {
    throw new Error("the recording has no audio file");
  }

  return { sampleFile: clip.sampleFile, ...take };
}

async function routeInput(
  next: CallLiveApiFunction,
  track: CaptureTrack,
  sourceTrackName: string | null,
): Promise<void> {
  const typeName = sourceTrackName ?? RESAMPLING_INPUT;
  const types = await availableInputs(
    next,
    track.trackIndex,
    "availableInputRoutingTypes",
  );
  const type = types.find((option) => option.name === typeName);

  if (type?.inputId == null) {
    throw new Error(
      `can't route "${typeName}" into the recording track (available: ${types.map((t) => t.name).join(", ")})`,
    );
  }

  await call(next, UPDATE_TRACK, {
    ids: track.id,
    inputRoutingTypeId: type.inputId,
    monitoringState: "off",
  });

  if (sourceTrackName == null) return;

  // Tap the track after its devices and mixer, so mute/volume are heard
  const channels = await availableInputs(
    next,
    track.trackIndex,
    "availableInputRoutingChannels",
  );
  const channel =
    TRACK_TAP_CHANNELS.map((name) =>
      channels.find((option) => option.name === name),
    ).find((option) => option?.inputId != null) ?? channels[0];

  if (channel?.inputId != null) {
    await call(next, UPDATE_TRACK, {
      ids: track.id,
      inputRoutingChannelId: channel.inputId,
    });
  }
}

async function availableInputs(
  next: CallLiveApiFunction,
  trackIndex: number,
  key: "availableInputRoutingTypes" | "availableInputRoutingChannels",
): Promise<RoutingOption[]> {
  const track = await call<Record<string, RoutingOption[] | undefined>>(
    next,
    "adj-read-track",
    {
      trackIndex,
      include: ["available-routings"],
    },
  );

  return track[key] ?? [];
}

async function muteTrack(
  next: CallLiveApiFunction,
  trackIndex: number,
): Promise<string | null> {
  const track = await call<{
    id?: string | number;
    state?: string;
  }>(next, "adj-read-track", {
    trackIndex,
    include: [],
  });

  if (track.id == null) {
    throw new Error(`no track at index ${trackIndex} to mute`);
  }

  if (MUTED_STATES.has(track.state ?? "")) return null;

  const id = String(track.id);

  await call(next, UPDATE_TRACK, { ids: id, mute: true });

  return id;
}

/**
 * Restore mutes and remove (or disarm) the recording track
 * @param next - v8 dispatcher
 * @param trackId - Recording track id
 * @param state - Mutes to restore
 * @param plan - Capture plan (transport ownership, keep)
 * @returns Problems hit while cleaning up (empty when all went well)
 */
async function cleanUp(
  next: CallLiveApiFunction,
  trackId: string,
  state: CaptureState,
  plan: CapturePlan,
): Promise<string[]> {
  const steps: [string, Record<string, unknown>][] = [];

  if (ownsTransport(plan)) {
    steps.push([PLAYBACK, { action: "stop" }]);
  }

  if (state.restoreMutes.length > 0) {
    steps.push([
      UPDATE_TRACK,
      { ids: state.restoreMutes.join(","), mute: false },
    ]);
  }

  steps.push(
    plan.keep
      ? [UPDATE_TRACK, { ids: trackId, arm: false }]
      : ["adj-delete", { type: "track", ids: trackId }],
  );

  const problems: string[] = [];

  for (const [tool, args] of steps) {
    try {
      await call(next, tool, args);
    } catch (error) {
      problems.push(`cleanup: ${errorMessage(error)}`);
    }
  }

  return problems;
}
