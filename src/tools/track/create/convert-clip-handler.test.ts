// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, it, vi } from "vitest";
import {
  BridgeCallError,
  type BrowserBridgeClient,
} from "#src/mcp-server/browser-bridge-client.ts";
import { type McpResponse } from "#src/mcp-server/max-api-adapter.ts";
import { handleConvertClip } from "./convert-clip-handler.ts";

const FAST = { pollMs: 1, timeoutMs: 50 };

/**
 * MCP text response wrapping a JSON payload
 * @param payload - Tool payload
 * @returns MCP response
 */
function reply(payload: object): McpResponse {
  return { content: [{ type: "text", text: JSON.stringify(payload) }] };
}

/**
 * Fake bridge whose track list gains a track after the conversion starts
 * @param after - Track ids reported once the conversion has run
 * @returns Fake bridge and its mocks
 */
function makeBridge(after: string[] = ["a", "new", "b"]) {
  const mocks = {
    ensureAlive: vi.fn().mockResolvedValue(true),
    send: vi.fn((op: string) =>
      Promise.resolve(
        op === "convert_clip"
          ? { started: true, trackIdsBefore: ["a", "b"] }
          : { trackIds: after },
      ),
    ),
  };

  return { bridge: mocks as unknown as BrowserBridgeClient, mocks };
}

/**
 * v8 dispatcher answering adj-read-clip and adj-read-live-set
 * @param clip - adj-read-clip payload
 * @returns Mocked next
 */
function makeNext(clip: object) {
  return vi.fn((tool: string) =>
    Promise.resolve(
      tool === "adj-read-clip" ? reply(clip) : reply({ timeSignature: "4/4" }),
    ),
  );
}

/**
 * Parse a success response
 * @param response - Handler response
 * @returns Parsed payload
 */
function parse(response: McpResponse): unknown {
  expect(response.isError).not.toBe(true);

  return JSON.parse(response.content[0]?.text ?? "");
}

describe("handleConvertClip", () => {
  it("converts a session clip and reports the new track's index", async () => {
    const { bridge, mocks } = makeBridge();
    const next = makeNext({
      id: "7",
      type: "audio",
      view: "session",
      slot: "2/3",
    });

    const response = await handleConvertClip(
      bridge,
      next,
      { convert: "drums", fromClip: "2/3" },
      FAST,
    );

    expect(next).toHaveBeenCalledWith("adj-read-clip", { slot: "2/3" });
    expect(mocks.send).toHaveBeenCalledWith(
      "convert_clip",
      { clip: { trackIndex: 2, sceneIndex: 3 }, kind: "drums" },
      30_000,
    );
    expect(parse(response)).toStrictEqual({
      trackIndex: 1,
      convert: "drums",
      fromClip: "2/3",
    });
  });

  it("addresses an arrangement clip by its start in song beats", async () => {
    const { bridge, mocks } = makeBridge();
    const next = makeNext({
      id: "9",
      type: "audio",
      view: "arrangement",
      trackIndex: 4,
      arrangementStart: "9|1",
    });

    await handleConvertClip(
      bridge,
      next,
      { convert: "simpler", fromClip: "9" },
      FAST,
    );

    expect(next).toHaveBeenCalledWith("adj-read-clip", { clipId: "9" });
    expect(mocks.send).toHaveBeenCalledWith(
      "convert_clip",
      { clip: { trackIndex: 4, arrangementStartBeats: 32 }, kind: "simpler" },
      30_000,
    );
  });

  it("refuses a MIDI clip before calling the bridge", async () => {
    const { bridge, mocks } = makeBridge();
    const next = makeNext({
      id: "7",
      type: "midi",
      view: "session",
      slot: "0/0",
    });

    const response = await handleConvertClip(
      bridge,
      next,
      { convert: "melody", fromClip: "0/0" },
      FAST,
    );

    expect(response.isError).toBe(true);
    expect(response.content[0]?.text).toMatch(/only an audio clip/);
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("requires fromClip", async () => {
    const { bridge } = makeBridge();

    const response = await handleConvertClip(
      bridge,
      makeNext({}),
      { convert: "drums" },
      FAST,
    );

    expect(response.content[0]?.text).toMatch(/needs fromClip/);
  });

  it("returns the install hint when the bridge is down", async () => {
    const { bridge, mocks } = makeBridge();

    mocks.ensureAlive.mockResolvedValue(false);

    const response = await handleConvertClip(
      bridge,
      makeNext({}),
      { convert: "drums", fromClip: "0/0" },
      FAST,
    );

    expect(response.content[0]?.text).toMatch(/install:bridge/);
  });

  it("surfaces a refusal from Live", async () => {
    const { bridge, mocks } = makeBridge();

    mocks.send.mockRejectedValue(
      new BridgeCallError({
        code: "CONVERSION_FAILED",
        message: "Live can't convert this clip to MIDI",
      }),
    );

    const response = await handleConvertClip(
      bridge,
      makeNext({ id: "7", type: "audio", view: "session", slot: "0/0" }),
      { convert: "harmony", fromClip: "0/0" },
      FAST,
    );

    expect(response.content[0]?.text).toBe(
      "createTrack convert failed: [CONVERSION_FAILED] Live can't convert this clip to MIDI",
    );
  });

  it("times out when no new track appears", async () => {
    const { bridge } = makeBridge(["a", "b"]);

    const response = await handleConvertClip(
      bridge,
      makeNext({ id: "7", type: "audio", view: "session", slot: "0/0" }),
      { convert: "drum-rack", fromClip: "0/0" },
      FAST,
    );

    expect(response.content[0]?.text).toMatch(/no new track appeared/);
  });
});
