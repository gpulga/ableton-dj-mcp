// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

import { BUILD_INFO } from "#src/generated/build-info.ts";
import {
  intervalsToPitchClasses,
  PITCH_CLASS_NAMES,
} from "#src/shared/pitch.ts";
import { VERSION } from "#src/shared/version.ts";
import { skills as basicSkills } from "#src/skills/basic.ts";
import { skills } from "#src/skills/standard.ts";
import {
  type FactSummary,
  hasFactHeaders,
  parseMemory,
  summarizeFacts,
} from "./memory-store.ts";

interface LiveSetInfo {
  name?: unknown;
  tempo: unknown;
  timeSignature: string | null;
  sceneCount: number;
  regularTrackCount: number;
  returnTrackCount: number;
  isPlaying?: boolean;
  scale?: string;
  scalePitches?: string;
}

interface ServerBuild {
  branch: string;
  sha: string | null;
  dirty: boolean;
  buildTime: string;
  source: "local" | "release" | "local-no-git";
}

interface ConnectResult {
  connected: boolean;
  serverVersion: string;
  serverBuild: ServerBuild;
  abletonLiveVersion: string;
  liveSet: LiveSetInfo;
  skills?: string;
  memoryContent?: string;
  memoryFacts?: FactSummary[];
  nextStep: string;
}

/**
 * Initialize connection to Ableton Live with minimal data for safety
 * @param _params - No parameters used
 * @param context - The userContext from main.js
 * @returns Connection status and basic Live Set info
 */
export function connect(
  _params: object = {},
  context: Partial<ToolContext> = {},
): ConnectResult {
  const liveSet = LiveAPI.from("live_set");
  const liveApp = LiveAPI.from("live_app");

  const trackIds = liveSet.getChildIds("tracks");
  const returnTrackIds = liveSet.getChildIds("return_tracks");
  const sceneIds = liveSet.getChildIds("scenes");

  const rawVersion = liveApp.call("get_version_string");
  const abletonLiveVersion = Array.isArray(rawVersion)
    ? String(rawVersion[0])
    : String(rawVersion);

  // Build liveSet overview matching readLiveSet default response
  const liveSetName = liveSet.getProperty("name");

  const liveSetInfo: LiveSetInfo = {
    ...(liveSetName ? { name: liveSetName } : {}),
    tempo: liveSet.getProperty("tempo"),
    timeSignature: liveSet.timeSignature,
    sceneCount: sceneIds.length,
    regularTrackCount: trackIds.length,
    returnTrackCount: returnTrackIds.length,
  };

  const isPlaying = (liveSet.getProperty("is_playing") as number) > 0;

  if (isPlaying) {
    liveSetInfo.isPlaying = true;
  }

  const scaleMode = liveSet.getProperty("scale_mode") as number;
  const scaleEnabled = scaleMode > 0;

  if (scaleEnabled) {
    const scaleName = liveSet.getProperty("scale_name") as string;
    const rootNote = liveSet.getProperty("root_note") as number;
    const scaleRoot = PITCH_CLASS_NAMES[rootNote];

    liveSetInfo.scale = `${scaleRoot} ${scaleName}`;

    const scaleIntervals = liveSet.getProperty("scale_intervals") as number[];

    liveSetInfo.scalePitches = intervalsToPitchClasses(
      scaleIntervals,
      rootNote,
    ).join(",");
  }

  const result: ConnectResult = {
    connected: true,
    serverVersion: VERSION,
    serverBuild: {
      branch: BUILD_INFO.branch,
      sha: BUILD_INFO.sha,
      dirty: BUILD_INFO.dirty,
      buildTime: BUILD_INFO.buildTime,
      source: BUILD_INFO.source,
    },
    abletonLiveVersion,
    liveSet: liveSetInfo,
    skills: context.smallModelMode ? basicSkills : skills,
    nextStep:
      "Report the connection status and Live Set overview to the user, then wait for their instructions.",
  };

  // Include memory if enabled: the fact index once it has facts, else the text
  if (context.memory?.enabled && context.memory.content) {
    const { content } = context.memory;

    if (hasFactHeaders(content)) {
      result.memoryFacts = summarizeFacts(parseMemory(content));
    } else {
      result.memoryContent = content;
    }
  }

  return result;
}
