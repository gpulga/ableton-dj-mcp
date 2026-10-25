// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

// Scripted stand-in for the v8 dispatcher, enough to drive a capture.

import { vi } from "vitest";
import { type McpResponse } from "#src/mcp-server/max-api-adapter.ts";

export interface FakeLiveOptions {
  isPlaying?: boolean;
  sampleFile?: string | null;
  /** playingPosition values returned while recording, in order */
  positions?: string[];
  recording?: boolean;
  /** currentTime answers to position reads, in order (last one repeats) */
  currentTimes?: (string | null)[];
  inputTypes?: { name: string; inputId: string }[];
  inputChannels?: { name: string; inputId: string }[];
  trackStates?: Record<number, string>;
  /** Tool name (or "tool:action") that should answer with an error */
  failOn?: string[];
  /** Tool that answers with a trailing WARNING item */
  warnOn?: string;
}

export type FakeNext = ReturnType<typeof vi.fn> &
  ((tool: string, args: object) => Promise<McpResponse>);

const DEFAULT_TYPES = [
  { name: "Resampling", inputId: "0" },
  { name: "Drums", inputId: "1" },
];
const DEFAULT_CHANNELS = [
  { name: "Pre FX", inputId: "6" },
  { name: "Post FX", inputId: "7" },
  { name: "Post Mixer", inputId: "8" },
];

/**
 * Build a fake v8 dispatcher
 * @param options - Scripted behaviour
 * @returns vi.fn dispatcher
 */
export function fakeLive(options: FakeLiveOptions = {}): FakeNext {
  const positions = [...(options.positions ?? ["1|2", "9|1"])];
  const currentTimes = [...(options.currentTimes ?? ["10|1"])];
  const failOn = new Set(options.failOn ?? []);

  return vi.fn(async (tool: string, args: Record<string, unknown>) => {
    const key =
      typeof args.action === "string" ? `${tool}:${args.action}` : tool;

    if (failOn.has(tool) || failOn.has(key)) {
      return {
        content: [{ type: "text", text: `${key} broke` }],
        isError: true,
      };
    }

    const payload = respond(tool, args, options, { positions, currentTimes });
    const content = [{ type: "text", text: JSON.stringify(payload) }];

    if (options.warnOn === tool) {
      content.push({ type: "text", text: "WARNING: something minor" });
    }

    return { content };
  }) as FakeNext;
}

interface Script {
  positions: string[];
  currentTimes: (string | null)[];
}

function dequeue<T>(queue: T[]): T | undefined {
  return queue.length > 1 ? queue.shift() : queue[0];
}

function respond(
  tool: string,
  args: Record<string, unknown>,
  options: FakeLiveOptions,
  script: Script,
): unknown {
  switch (tool) {
    case "adj-read-live-set":
      return {
        tempo: 120,
        timeSignature: "4/4",
        ...(options.isPlaying ? { isPlaying: true } : {}),
        tracks: [
          { name: "Drums", trackIndex: 0 },
          { name: "Bass", trackIndex: 1 },
        ],
        locators: [{ id: "locator-0", name: "Drop", time: "41|1" }],
      };
    case "adj-create-track":
      return { id: 99, trackIndex: 5 };
    case "adj-read-track":
      return readTrack(args, options);
    case "adj-read-clip":
      return readClip(args, options, script.positions);
    case "adj-playback":
      return playback(args, script.currentTimes);
    default:
      return { ok: true };
  }
}

function playback(
  args: Record<string, unknown>,
  currentTimes: (string | null)[],
): unknown {
  // A position read is update-arrangement without a start position
  if (args.action !== "update-arrangement" || args.startTime != null) {
    return { playing: true };
  }

  const currentTime = dequeue(currentTimes);

  return currentTime == null
    ? { playing: true }
    : { playing: true, currentTime };
}

function readTrack(
  args: Record<string, unknown>,
  options: FakeLiveOptions,
): unknown {
  const include = args.include as string[];

  if (include.includes("available-routings")) {
    return {
      availableInputRoutingTypes: options.inputTypes ?? DEFAULT_TYPES,
      availableInputRoutingChannels: options.inputChannels ?? DEFAULT_CHANNELS,
    };
  }

  const index = args.trackIndex as number;

  if (index > 3) return {};

  const state = options.trackStates?.[index];

  return { id: index + 2, ...(state ? { state } : {}) };
}

function readClip(
  args: Record<string, unknown>,
  options: FakeLiveOptions,
  positions: string[],
): unknown {
  if ((args.include as string[]).includes("sample")) {
    return options.sampleFile === null
      ? { id: "1" }
      : { id: "1", sampleFile: options.sampleFile ?? "/tmp/capture.wav" };
  }

  if (options.recording === false) return { id: "1" };

  const position = dequeue(positions);

  return { id: "1", recording: true, playingPosition: position };
}

/**
 * Tool calls made so far, as "tool" or "tool:action"
 * @param next - Fake dispatcher
 * @returns Call names in order
 */
export function callNames(next: FakeNext): string[] {
  return next.mock.calls.map(([tool, args]) => {
    const action = (args as { action?: string }).action;

    return action ? `${tool}:${action}` : (tool as string);
  });
}

/**
 * Args of every call to one tool
 * @param next - Fake dispatcher
 * @param tool - Tool name
 * @returns Args objects
 */
export function argsFor(
  next: FakeNext,
  tool: string,
): Record<string, unknown>[] {
  return next.mock.calls
    .filter(([name]) => name === tool)
    .map(([, args]) => args as Record<string, unknown>);
}
