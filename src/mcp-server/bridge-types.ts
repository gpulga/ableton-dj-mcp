// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

// Request/response shapes for the Live Browser Bridge ops.

// Arg/result shapes for the bridge automation_* ops (adj-automate). Beat
// values are Ableton beats relative to clip time 0; values are normalized
// 0..1 (denormalized onto param.min..param.max Python-side).

/** Session clips carry sceneIndex; arrangement clips carry the start beats. */
export interface AutomationClipRef {
  trackIndex: number;
  sceneIndex?: number;
  arrangementStartBeats?: number;
}

export type AutomationTarget =
  | {
      kind: "device";
      chain: Array<{ type: "d" | "c" | "rc"; index: number }>;
      paramName: string;
    }
  | {
      kind: "mixer";
      param: "volume" | "panning" | "send";
      sendIndex?: number;
    };

export interface AutomationWriteArgs {
  clip: AutomationClipRef;
  target: AutomationTarget;
  points: Array<[timeBeats: number, value01: number]>;
  clearFirst?: boolean;
}

export interface AutomationWriteResult {
  pointCount: number;
  paramName: string;
  paramMin: number;
  paramMax: number;
  envelopeCreated: boolean;
  clipLengthBeats: number;
}

export interface AutomationReadArgs {
  clip: AutomationClipRef;
  target: AutomationTarget;
  stepBeats?: number;
  maxPoints?: number;
}

export interface AutomationReadResult {
  hasEnvelope: boolean;
  sampled: boolean;
  stepBeats?: number;
  points: Array<[timeBeats: number, value01: number]>;
  paramMin: number;
  paramMax: number;
  clipLengthBeats: number;
}

export interface AutomationClearArgs {
  clip: AutomationClipRef;
  target?: AutomationTarget;
}

export interface AutomationClearResult {
  cleared: "param" | "all";
}

export interface BrowseArgs {
  category?: string;
  path?: string;
  search?: string;
  depth?: number;
  limit?: number;
}

export interface BrowseItem {
  name: string;
  uri: string;
  isFolder: boolean;
  isDevice: boolean;
  isLoadable: boolean;
  children?: BrowseItem[];
}

export interface BrowseResult {
  category?: string;
  categories?: string[];
  path?: string;
  items: BrowseItem[];
  truncated?: boolean;
}

export interface LoadItemArgs {
  uri: string;
  category?: string;
}

export interface LoadItemResult {
  loaded: boolean;
  deviceId: string | null;
  deviceCountBefore: number;
  deviceCountAfter: number;
}

export type ConvertKind =
  "drums" | "melody" | "harmony" | "simpler" | "drum-rack";

export interface ConvertClipArgs {
  clip: AutomationClipRef;
  kind: ConvertKind;
}

export interface ConvertClipResult {
  started: boolean;
  kind: ConvertKind;
  /** Track ids before the conversion; the new track is the one not in here */
  trackIdsBefore: string[];
}
