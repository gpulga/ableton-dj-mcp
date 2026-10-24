// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, it, vi } from "vitest";

import {
  BridgeCallError,
  type BrowserBridgeClient,
} from "#src/mcp-server/browser-bridge-client.ts";
import { type McpResponse } from "#src/mcp-server/max-api-adapter.ts";
import { handleAutomate } from "../automate-handler.ts";
import { type AutomationPoint } from "../shapes.ts";
import { parseToolPayload, quoteCompactLiteralKeys } from "../tool-payload.ts";

interface FakeBridge {
  ensureAlive: ReturnType<typeof vi.fn>;
  automationWrite: ReturnType<typeof vi.fn>;
  automationRead: ReturnType<typeof vi.fn>;
  automationClear: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
}

const WRITE_RESULT = {
  pointCount: 2,
  paramName: "Frequency",
  paramMin: 20,
  paramMax: 20_000,
  envelopeCreated: true,
  clipLengthBeats: 32,
};

function makeBridge(overrides: Partial<FakeBridge> = {}): FakeBridge {
  return {
    ensureAlive: overrides.ensureAlive ?? vi.fn().mockResolvedValue(true),
    automationWrite:
      overrides.automationWrite ?? vi.fn().mockResolvedValue(WRITE_RESULT),
    automationRead: overrides.automationRead ?? vi.fn(),
    automationClear: overrides.automationClear ?? vi.fn(),
    send: overrides.send ?? vi.fn(),
  };
}

function asBridge(bridge: FakeBridge): BrowserBridgeClient {
  return bridge as unknown as BrowserBridgeClient;
}

function textResponse(payload: object | string): McpResponse {
  return {
    content: [
      {
        type: "text",
        text: typeof payload === "string" ? payload : JSON.stringify(payload),
      },
    ],
  };
}

const SESSION_CLIP_PAYLOAD = {
  id: "id 5",
  type: "midi",
  view: "session",
  slot: "0/3",
  timeSignature: "4/4",
  looping: true,
  start: "1|1",
  end: "9|1",
};

function makeNext(payload: object | string = SESSION_CLIP_PAYLOAD) {
  return vi.fn().mockResolvedValue(textResponse(payload));
}

function errorText(response: McpResponse): string {
  expect(response.isError).toBe(true);

  return response.content[0]?.text ?? "";
}

function successJson(response: McpResponse): Record<string, unknown> {
  expect(response.isError).not.toBe(true);

  return JSON.parse(response.content[0]?.text ?? "") as Record<string, unknown>;
}

describe("handleAutomate", () => {
  it("returns install hint when the bridge is down", async () => {
    const bridge = makeBridge({
      ensureAlive: vi.fn().mockResolvedValue(false),
    });

    const response = await handleAutomate(asBridge(bridge), vi.fn(), {
      slot: "0/3",
      paramName: "Volume",
      points: "1|1:0",
    });

    expect(errorText(response)).toMatch(/install:bridge/);
  });

  it("requires clipId or slot", async () => {
    const response = await handleAutomate(asBridge(makeBridge()), vi.fn(), {
      paramName: "Volume",
      points: "1|1:0",
    });

    expect(errorText(response)).toMatch(/clipId or slot/);
  });

  it("writes densified points for a session clip device target", async () => {
    const bridge = makeBridge();
    const next = makeNext();

    const response = await handleAutomate(asBridge(bridge), next, {
      slot: "0/3",
      devicePath: "t0/d1",
      paramName: "Frequency",
      points: "1|1:0, 9|1:1",
    });

    expect(successJson(response).envelopeCreated).toBe(true);
    expect(next).toHaveBeenCalledWith("adj-read-clip", {
      include: ["timing"],
      slot: "0/3",
    });

    const call = bridge.automationWrite.mock.calls[0]?.[0] as {
      clip: object;
      target: object;
      points: AutomationPoint[];
      clearFirst: boolean;
    };

    expect(call.clip).toStrictEqual({ trackIndex: 0, sceneIndex: 3 });
    expect(call.target).toStrictEqual({
      kind: "device",
      chain: [{ type: "d", index: 1 }],
      paramName: "Frequency",
    });
    expect(call.clearFirst).toBe(false);
    expect(call.points[0]).toStrictEqual([0, 0]);
    expect(call.points.at(-1)).toStrictEqual([32, 1]);
    expect(call.points).toHaveLength(17);
  });

  it("maps display values through the bridge and echoes the anchors", async () => {
    const bridge = makeBridge({
      send: vi.fn().mockResolvedValue([0.2, 0.6]),
    });

    await handleAutomate(asBridge(bridge), makeNext(), {
      slot: "0/3",
      devicePath: "t0/d1",
      paramName: "Frequency",
      points: "1|1:200Hz, 5|1:0.5, 9|1:1.2kHz",
    });

    expect(bridge.send).toHaveBeenCalledWith(
      "automation_values",
      {
        clip: { trackIndex: 0, sceneIndex: 3 },
        target: {
          kind: "device",
          chain: [{ type: "d", index: 1 }],
          paramName: "Frequency",
        },
        displays: ["200Hz", "1.2kHz"],
      },
      10_000,
    );

    const call = bridge.automationWrite.mock.calls[0]?.[0] as {
      points: AutomationPoint[];
      echo: number[];
    };

    expect(call.echo).toStrictEqual([0.2, 0.5, 0.6]);
    expect(call.points[0]).toStrictEqual([0, 0.2]);
    expect(call.points.at(-1)).toStrictEqual([32, 0.6]);
  });

  it("skips the bridge lookup when every value is normalized", async () => {
    const bridge = makeBridge();

    await handleAutomate(asBridge(bridge), makeNext(), {
      slot: "0/3",
      paramName: "Volume",
      points: "1|1:0, 9|1:1",
    });

    expect(bridge.send).not.toHaveBeenCalled();
    expect(
      (bridge.automationWrite.mock.calls[0]?.[0] as { echo: number[] }).echo,
    ).toStrictEqual([0, 1]);
  });

  it("passes clipId through and honors the clear flag", async () => {
    const bridge = makeBridge();
    const next = makeNext();

    await handleAutomate(asBridge(bridge), next, {
      clipId: "id 5",
      paramName: "Volume",
      points: "1|1:1, 9|1:0",
      clear: true,
    });

    expect(next).toHaveBeenCalledWith("adj-read-clip", {
      include: ["timing"],
      clipId: "id 5",
    });
    const call = bridge.automationWrite.mock.calls[0]?.[0] as {
      clearFirst: boolean;
    };

    expect(call.clearFirst).toBe(true);
  });

  it("parses compact-literal read-clip payloads", async () => {
    const bridge = makeBridge();
    const next = makeNext(
      '{id:"id 5",type:"midi",view:"session",slot:"1/2",timeSignature:"4/4",start:"1|1",end:"5|1"}',
    );

    await handleAutomate(asBridge(bridge), next, {
      slot: "1/2",
      paramName: "Volume",
      points: "1|1:0, 5|1:1",
    });

    const call = bridge.automationWrite.mock.calls[0]?.[0] as { clip: object };

    expect(call.clip).toStrictEqual({ trackIndex: 1, sceneIndex: 2 });
  });

  it("rejects arrangement clips with a clear error", async () => {
    const bridge = makeBridge();
    const next = makeNext({
      id: "id 9",
      view: "arrangement",
      trackIndex: 2,
      arrangementStart: "17|1",
      timeSignature: "4/4",
      start: "1|1",
      end: "5|1",
    });

    const response = await handleAutomate(asBridge(bridge), next, {
      clipId: "id 9",
      devicePath: "t2/d0",
      paramName: "Frequency",
      points: "1|1:0, 5|1:1",
    });

    expect(errorText(response)).toMatch(/only supported on session clips/);
    expect(bridge.automationWrite).not.toHaveBeenCalled();
  });

  it("returns read-clip errors verbatim", async () => {
    const next = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: "Error executing tool" }],
      isError: true,
    });

    const response = await handleAutomate(asBridge(makeBridge()), next, {
      clipId: "id 404",
      paramName: "Volume",
      points: "1|1:0",
    });

    expect(response.isError).toBe(true);
    expect(response.content[0]?.text).toBe("Error executing tool");
  });

  it("errors on empty clip slots", async () => {
    const next = makeNext({ id: null, type: null, name: null, slot: "0/3" });

    const response = await handleAutomate(asBridge(makeBridge()), next, {
      slot: "0/3",
      paramName: "Volume",
      points: "1|1:0",
    });

    expect(errorText(response)).toMatch(/no clip at slot 0\/3/);
  });

  it("rejects devicePath on a different track than the clip", async () => {
    const response = await handleAutomate(asBridge(makeBridge()), makeNext(), {
      slot: "0/3",
      devicePath: "t1/d0",
      paramName: "Frequency",
      points: "1|1:0",
    });

    expect(errorText(response)).toMatch(/does not match the clip's track/);
  });

  it("requires paramName alongside devicePath", async () => {
    const response = await handleAutomate(asBridge(makeBridge()), makeNext(), {
      slot: "0/3",
      devicePath: "t0/d1",
      points: "1|1:0",
    });

    expect(errorText(response)).toMatch(/paramName is required/);
  });

  it("maps mixer param names to targets", async () => {
    const bridge = makeBridge();

    await handleAutomate(asBridge(bridge), makeNext(), {
      slot: "0/3",
      paramName: "Send B",
      points: "1|1:0, 9|1:1",
    });

    const call = bridge.automationWrite.mock.calls[0]?.[0] as {
      target: object;
    };

    expect(call.target).toStrictEqual({
      kind: "mixer",
      param: "send",
      sendIndex: 1,
    });
  });

  it("maps Pan to the panning target", async () => {
    const bridge = makeBridge();

    await handleAutomate(asBridge(bridge), makeNext(), {
      slot: "0/3",
      paramName: "Pan",
      points: "1|1:0, 9|1:1",
    });

    const call = bridge.automationWrite.mock.calls[0]?.[0] as {
      target: object;
    };

    expect(call.target).toStrictEqual({ kind: "mixer", param: "panning" });
  });

  it("rejects unknown mixer param names", async () => {
    const response = await handleAutomate(asBridge(makeBridge()), makeNext(), {
      slot: "0/3",
      paramName: "Cutoff",
      points: "1|1:0",
    });

    expect(errorText(response)).toMatch(/unknown mixer param/);
  });

  it("generates recipe points with the documented default target", async () => {
    const bridge = makeBridge();

    await handleAutomate(asBridge(bridge), makeNext(), {
      slot: "0/3",
      recipe: "volume-fade-in",
    });

    const call = bridge.automationWrite.mock.calls[0]?.[0] as {
      target: object;
      points: AutomationPoint[];
    };

    expect(call.target).toStrictEqual({ kind: "mixer", param: "volume" });
    expect(call.points[0]).toStrictEqual([0, 0]);
    expect(call.points.at(-1)).toStrictEqual([32, 1]);
  });

  it("defaults dub-throw to Send A", async () => {
    const bridge = makeBridge();

    await handleAutomate(asBridge(bridge), makeNext(), {
      slot: "0/3",
      recipe: "dub-throw",
    });

    const call = bridge.automationWrite.mock.calls[0]?.[0] as {
      target: object;
    };

    expect(call.target).toStrictEqual({
      kind: "mixer",
      param: "send",
      sendIndex: 0,
    });
  });

  it("refuses to guess targets for explicit recipes", async () => {
    const response = await handleAutomate(asBridge(makeBridge()), makeNext(), {
      slot: "0/3",
      recipe: "filter-sweep-up",
    });

    expect(errorText(response)).toMatch(/requires an explicit devicePath/);
  });

  it("requires paramName when there is no recipe", async () => {
    const response = await handleAutomate(asBridge(makeBridge()), makeNext(), {
      slot: "0/3",
      points: "1|1:0",
    });

    expect(errorText(response)).toMatch(/paramName is required/);
  });

  it("requires points or recipe for writes", async () => {
    const response = await handleAutomate(asBridge(makeBridge()), makeNext(), {
      slot: "0/3",
      paramName: "Volume",
    });

    expect(errorText(response)).toMatch(/points \(or recipe\) is required/);
  });

  it("rejects non-ascending points", async () => {
    const response = await handleAutomate(asBridge(makeBridge()), makeNext(), {
      slot: "0/3",
      paramName: "Volume",
      points: "9|1:0, 1|1:1",
    });

    expect(errorText(response)).toMatch(/ascending/);
  });

  it("rejects unparseable time signatures", async () => {
    const next = makeNext({ ...SESSION_CLIP_PAYLOAD, timeSignature: "wat" });

    const response = await handleAutomate(asBridge(makeBridge()), next, {
      slot: "0/3",
      paramName: "Volume",
      points: "1|1:0",
    });

    expect(errorText(response)).toMatch(/time signature/);
  });

  it("reads envelopes back as bar|beat:value strings", async () => {
    const bridge = makeBridge({
      automationRead: vi.fn().mockResolvedValue({
        hasEnvelope: true,
        sampled: true,
        stepBeats: 4,
        points: [
          [0, 0],
          [4, 0.5004],
          [8, 1],
        ],
        paramMin: 0,
        paramMax: 1,
        clipLengthBeats: 8,
      }),
    });

    const response = await handleAutomate(asBridge(bridge), makeNext(), {
      action: "read",
      slot: "0/3",
      paramName: "Volume",
    });

    expect(successJson(response).points).toStrictEqual([
      "1|1:0",
      "2|1:0.5",
      "3|1:1",
    ]);
  });

  it("clears a single parameter envelope", async () => {
    const bridge = makeBridge({
      automationClear: vi.fn().mockResolvedValue({ cleared: "param" }),
    });

    const response = await handleAutomate(asBridge(bridge), makeNext(), {
      action: "clear",
      slot: "0/3",
      paramName: "Volume",
    });

    expect(successJson(response).cleared).toBe("param");
    expect(bridge.automationClear).toHaveBeenCalledWith({
      clip: { trackIndex: 0, sceneIndex: 3 },
      target: { kind: "mixer", param: "volume" },
    });
  });

  it("clear-all skips target resolution entirely", async () => {
    const bridge = makeBridge({
      automationClear: vi.fn().mockResolvedValue({ cleared: "all" }),
    });

    const response = await handleAutomate(asBridge(bridge), makeNext(), {
      action: "clear-all",
      slot: "0/3",
    });

    expect(successJson(response).cleared).toBe("all");
    expect(bridge.automationClear).toHaveBeenCalledWith({
      clip: { trackIndex: 0, sceneIndex: 3 },
    });
  });

  it("maps unknown-op bridge errors to the stale-bridge hint", async () => {
    const bridge = makeBridge({
      automationWrite: vi.fn().mockRejectedValue(
        new BridgeCallError({
          code: "INVALID_ARGS",
          message: "unknown op: automation_write",
        }),
      ),
    });

    const response = await handleAutomate(asBridge(bridge), makeNext(), {
      slot: "0/3",
      paramName: "Volume",
      points: "1|1:0, 9|1:1",
    });

    expect(errorText(response)).toMatch(/outdated/);
  });

  it("formats other bridge errors with their code", async () => {
    const bridge = makeBridge({
      automationWrite: vi.fn().mockRejectedValue(
        new BridgeCallError({
          code: "AUTOMATION_FAILED",
          message: "parameter not found",
        }),
      ),
    });

    const response = await handleAutomate(asBridge(bridge), makeNext(), {
      slot: "0/3",
      paramName: "Volume",
      points: "1|1:0, 9|1:1",
    });

    expect(errorText(response)).toMatch(
      /Bridge automation failed \[AUTOMATION_FAILED\]: parameter not found/,
    );
  });

  it("stringifies non-Error rejections", async () => {
    const bridge = makeBridge({
      automationWrite: vi.fn().mockRejectedValue("boom"),
    });

    const response = await handleAutomate(asBridge(bridge), makeNext(), {
      slot: "0/3",
      paramName: "Volume",
      points: "1|1:0, 9|1:1",
    });

    expect(errorText(response)).toMatch(/automate failed: boom/);
  });
});

describe("parseToolPayload", () => {
  it("parses strict JSON payloads", () => {
    expect(
      parseToolPayload({
        content: [{ type: "text", text: '{"a":1}' }],
      } as McpResponse),
    ).toStrictEqual({ a: 1 });
  });

  it("uses the last content item (warnings prepend extra items)", () => {
    expect(
      parseToolPayload({
        content: [
          { type: "text", text: "WARNING: something" },
          { type: "text", text: '{"a":2}' },
        ],
      } as McpResponse),
    ).toStrictEqual({ a: 2 });
  });

  it("throws on non-text payloads", () => {
    expect(() =>
      parseToolPayload({ content: [] } as unknown as McpResponse),
    ).toThrow(/unexpected tool response shape/);
  });
});

describe("quoteCompactLiteralKeys", () => {
  it("quotes bare keys in nested structures", () => {
    expect(quoteCompactLiteralKeys('{a:1,b:{c:"x"},d:[{e:null}]}')).toBe(
      '{"a":1,"b":{"c":"x"},"d":[{"e":null}]}',
    );
  });

  it("never touches key-like text inside string values", () => {
    const compact = '{name:"weird,name:with{tokens",id:"id 5"}';

    expect(JSON.parse(quoteCompactLiteralKeys(compact))).toStrictEqual({
      name: "weird,name:with{tokens",
      id: "id 5",
    });
  });

  it("handles escaped quotes inside strings", () => {
    const compact = '{name:"say \\"hi\\", ok:1",n:2}';

    expect(JSON.parse(quoteCompactLiteralKeys(compact))).toStrictEqual({
      name: 'say "hi", ok:1',
      n: 2,
    });
  });
});
