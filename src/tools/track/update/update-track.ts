// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

import { livePath } from "#src/shared/live-api-path-builders.ts";
import * as console from "#src/shared/v8-max-console.ts";
import {
  LIVE_API_MONITORING_STATE_AUTO,
  LIVE_API_MONITORING_STATE_IN,
  LIVE_API_MONITORING_STATE_OFF,
  MONITORING_STATE,
} from "#src/tools/constants.ts";
import { verifyColorQuantization } from "#src/tools/shared/color-verification-helpers.ts";
import {
  assertDefined,
  parseCommaSeparatedIds,
  unwrapSingleResult,
} from "#src/tools/shared/utils.ts";
import {
  getColorForIndex,
  parseCommaSeparatedColors,
} from "#src/tools/shared/validation/color-utils.ts";
import { validateIdTypes } from "#src/tools/shared/validation/id-validation.ts";
import {
  getNameForIndex,
  parseNames,
} from "#src/tools/shared/validation/name-utils.ts";
import { applyRoutingProperties } from "./helpers/update-track-routing-helpers.ts";

interface MixerParams {
  gainDb?: number;
  pan?: number;
  panningMode?: string;
  leftPan?: number;
  rightPan?: number;
}

interface UpdateTrackArgs {
  ids: string;
  name?: string;
  color?: string;
  gainDb?: number;
  pan?: number;
  panningMode?: string;
  leftPan?: number;
  rightPan?: number;
  mute?: boolean;
  solo?: boolean;
  arm?: boolean;
  folded?: boolean;
  inputRoutingTypeId?: string;
  inputRoutingChannelId?: string;
  outputRoutingTypeId?: string;
  outputRoutingChannelId?: string;
  monitoringState?: string;
  arrangementFollower?: boolean;
  sendGainDb?: number;
  sendReturn?: string;
}

export interface UpdateTrackResult {
  id: string;
  $meta?: string[];
}

/**
 * Arm or disarm a track, and warn when Live didn't keep it
 * @param track - Track to update
 * @param arm - Arm state, or undefined to leave it
 */
function applyArm(track: LiveAPI, arm: boolean | undefined): void {
  if (arm == null) {
    return;
  }

  track.set("arm", arm);

  if ((track.getProperty("arm") as number) > 0 !== arm) {
    console.warn(
      `updateTrack: arm ${arm} did not stick on track ${track.id} (check the track can be armed and has an input)`,
    );
  }
}

/**
 * Apply monitoring state to a track
 * @param track - Track object
 * @param monitoringState - Monitoring state value (in, auto, off)
 */
function applyMonitoringState(
  track: LiveAPI,
  monitoringState: string | undefined,
): void {
  if (monitoringState == null) {
    return;
  }

  const monitoringValue: number | undefined = {
    [MONITORING_STATE.IN]: LIVE_API_MONITORING_STATE_IN,
    [MONITORING_STATE.AUTO]: LIVE_API_MONITORING_STATE_AUTO,
    [MONITORING_STATE.OFF]: LIVE_API_MONITORING_STATE_OFF,
  }[monitoringState];

  if (monitoringValue === undefined) {
    console.warn(
      `invalid monitoring state "${monitoringState}". Must be one of: ${Object.values(MONITORING_STATE).join(", ")}`,
    );

    return;
  }

  track.set("current_monitoring_state", monitoringValue);
}

/**
 * Apply fold state to a group track
 * @param track - Track object
 * @param folded - Whether the group track should be folded (unfolded when false)
 * @throws Error if folded is provided but the track is not a group track
 */
function applyFoldState(track: LiveAPI, folded: boolean | undefined): void {
  if (folded == null) {
    return;
  }

  const isFoldable = (track.getProperty("is_foldable") as number) > 0;

  if (!isFoldable) {
    throw new Error(
      `updateTrack failed: folded requires a group track (track ${track.id} is not foldable)`,
    );
  }

  track.set("fold_state", folded ? 1 : 0);
}

/**
 * Apply send properties to a track
 * @param track - Track object
 * @param sendGainDb - Send gain in dB (-70 to 0)
 * @param sendReturn - Return track name (exact or letter prefix)
 */
function applySendProperties(
  track: LiveAPI,
  sendGainDb: number | undefined,
  sendReturn: string | undefined,
): void {
  // Validate both params provided together
  if ((sendGainDb != null) !== (sendReturn != null)) {
    console.warn("sendGainDb and sendReturn must both be specified");

    return;
  }

  if (sendGainDb == null) {
    return;
  }

  // Get mixer and sends
  const mixer = LiveAPI.from(track.path + " mixer_device");

  if (!mixer.exists()) {
    console.warn(`track ${track.id} has no mixer device`);

    return;
  }

  const sends = mixer.getChildren("sends");

  if (sends.length === 0) {
    console.warn(`track ${track.id} has no sends`);

    return;
  }

  // Find matching send by return track name
  // Match exact name OR letter prefix (e.g., "A" matches "A-Reverb")
  const liveSet = LiveAPI.from(livePath.liveSet);
  const returnTrackIds = liveSet.getChildIds("return_tracks");

  let sendIndex = -1;

  for (let i = 0; i < returnTrackIds.length; i++) {
    const rt = LiveAPI.from(livePath.returnTrack(i));
    const name = rt.getProperty("name") as string;

    // Match exact name or single-letter prefix
    if (name === sendReturn || name.startsWith(sendReturn + "-")) {
      sendIndex = i;
      break;
    }
  }

  if (sendIndex === -1) {
    console.warn(`no return track found matching "${sendReturn}"`);

    return;
  }

  if (sendIndex >= sends.length) {
    console.warn(`send ${sendIndex} doesn't exist on track ${track.id}`);

    return;
  }

  // Set the send gain
  assertDefined(sends[sendIndex], `send at index ${sendIndex}`).set(
    "display_value",
    sendGainDb,
  );
}

/**
 * Apply stereo panning and warn about invalid params
 * @param mixer - Mixer device object
 * @param pan - Pan value
 * @param leftPan - Left pan value
 * @param rightPan - Right pan value
 */
function applyStereoPan(
  mixer: LiveAPI,
  pan: number | undefined,
  leftPan: number | undefined,
  rightPan: number | undefined,
): void {
  if (pan != null) {
    const panning = LiveAPI.from(mixer.path + " panning");

    if (panning.exists()) {
      panning.set("value", pan);
    }
  }

  if (leftPan != null || rightPan != null) {
    console.warn(
      "updateTrack: leftPan and rightPan have no effect in stereo panning mode. " +
        "Set panningMode to 'split' or use 'pan' instead.",
    );
  }
}

/**
 * Apply split panning and warn about invalid params
 * @param mixer - Mixer device object
 * @param pan - Pan value
 * @param leftPan - Left pan value
 * @param rightPan - Right pan value
 */
function applySplitPan(
  mixer: LiveAPI,
  pan: number | undefined,
  leftPan: number | undefined,
  rightPan: number | undefined,
): void {
  if (leftPan != null) {
    const leftSplit = LiveAPI.from(mixer.path + " left_split_stereo");

    if (leftSplit.exists()) {
      leftSplit.set("value", leftPan);
    }
  }

  if (rightPan != null) {
    const rightSplit = LiveAPI.from(mixer.path + " right_split_stereo");

    if (rightSplit.exists()) {
      rightSplit.set("value", rightPan);
    }
  }

  if (pan != null) {
    console.warn(
      "updateTrack: pan has no effect in split panning mode. " +
        "Set panningMode to 'stereo' or use leftPan/rightPan instead.",
    );
  }
}

/**
 * Apply mixer properties (gain and panning) to a track
 * @param track - Track object
 * @param params - Mixer properties
 */
function applyMixerProperties(track: LiveAPI, params: MixerParams): void {
  const { gainDb, pan, panningMode, leftPan, rightPan } = params;

  const mixer = LiveAPI.from(track.path + " mixer_device");

  if (!mixer.exists()) {
    return;
  }

  // Handle gain (independent of panning mode)
  if (gainDb != null) {
    const volume = LiveAPI.from(mixer.path + " volume");

    if (volume.exists()) {
      volume.set("display_value", gainDb);
    }
  }

  // Get current panning mode
  const currentMode = mixer.getProperty("panning_mode");
  const currentIsSplit = currentMode === 1;

  // Set new panning mode if provided
  if (panningMode != null) {
    const newMode = panningMode === "split" ? 1 : 0;

    mixer.set("panning_mode", newMode);
  }

  // Determine effective mode for validation
  const effectiveMode = panningMode ?? (currentIsSplit ? "split" : "stereo");

  // Handle panning based on effective mode
  if (effectiveMode === "stereo") {
    applyStereoPan(mixer, pan, leftPan, rightPan);
  } else {
    applySplitPan(mixer, pan, leftPan, rightPan);
  }
}

/**
 * Updates properties of existing tracks
 * @param args - The track parameters
 * @param args.ids - Track ID or comma-separated list of track IDs to update
 * @param args.name - Optional track name
 * @param args.color - Optional track color (CSS format: hex)
 * @param args.gainDb - Optional track gain in dB (-70 to 6)
 * @param args.pan - Optional pan position in stereo mode (-1 to 1)
 * @param args.panningMode - Optional panning mode ('stereo' or 'split')
 * @param args.leftPan - Optional left channel pan in split mode (-1 to 1)
 * @param args.rightPan - Optional right channel pan in split mode (-1 to 1)
 * @param args.mute - Optional mute state
 * @param args.solo - Optional solo state
 * @param args.arm - Optional arm state
 * @param args.folded - Optional fold state; only applies to group tracks
 * @param args.inputRoutingTypeId - Optional input routing type identifier
 * @param args.inputRoutingChannelId - Optional input routing channel identifier
 * @param args.outputRoutingTypeId - Optional output routing type identifier
 * @param args.outputRoutingChannelId - Optional output routing channel identifier
 * @param args.monitoringState - Optional monitoring state ('in', 'auto', 'off')
 * @param args.arrangementFollower - Whether the track should follow the arrangement timeline
 * @param args.sendGainDb - Optional send gain in dB (-70 to 0), requires sendReturn
 * @param args.sendReturn - Optional return track name (exact or letter prefix), requires sendGainDb
 * @param _context - Internal context object (unused)
 * @returns Single track object or array of track objects
 */
export async function updateTrack(
  {
    ids,
    name,
    color,
    gainDb,
    pan,
    panningMode,
    leftPan,
    rightPan,
    mute,
    solo,
    arm,
    folded,
    inputRoutingTypeId,
    inputRoutingChannelId,
    outputRoutingTypeId,
    outputRoutingChannelId,
    monitoringState,
    arrangementFollower,
    sendGainDb,
    sendReturn,
  }: UpdateTrackArgs,
  _context: Partial<ToolContext> = {},
): Promise<UpdateTrackResult | UpdateTrackResult[]> {
  if (!ids) {
    throw new Error("updateTrack failed: ids is required");
  }

  // Parse comma-separated string into array
  const trackIds = parseCommaSeparatedIds(ids);

  // Validate all IDs are tracks, skip invalid ones
  const tracks = validateIdTypes(trackIds, "track", "updateTrack", {
    skipInvalid: true,
  });

  const parsedNames = parseNames(name, tracks.length, "updateTrack");
  const parsedColors = parseCommaSeparatedColors(color, tracks.length);

  const updatedTracks: UpdateTrackResult[] = [];

  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i] as LiveAPI;
    const trackColor = getColorForIndex(color, i, parsedColors);

    track.setAll({
      name: getNameForIndex(name, i, parsedNames),
      color: trackColor,
      mute,
      solo,
    });

    // Verify color quantization if color was set
    if (trackColor != null) {
      verifyColorQuantization(track, trackColor);
    }

    // Handle mixer properties
    if (
      gainDb != null ||
      pan != null ||
      panningMode != null ||
      leftPan != null ||
      rightPan != null
    ) {
      applyMixerProperties(track, {
        gainDb,
        pan,
        panningMode,
        leftPan,
        rightPan,
      });
    }

    // Handle routing properties
    applyRoutingProperties(track, {
      inputRoutingTypeId,
      inputRoutingChannelId,
      outputRoutingTypeId,
      outputRoutingChannelId,
    });

    // Handle arrangement follower
    if (arrangementFollower != null) {
      track.set("back_to_arranger", arrangementFollower ? 0 : 1);
    }

    // Handle fold state (group tracks only)
    applyFoldState(track, folded);

    // Handle monitoring state
    applyMonitoringState(track, monitoringState);

    // Handle send properties
    applySendProperties(track, sendGainDb, sendReturn);

    // Arm last: changing input routing or monitoring can disarm the track
    applyArm(track, arm);

    // Build optimistic result object
    const trackResult: UpdateTrackResult = { id: track.id };

    updatedTracks.push(trackResult);
  }

  return unwrapSingleResult(updatedTracks);
}
