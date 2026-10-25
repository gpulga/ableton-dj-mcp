// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, it, vi } from "vitest";
import { type BrowserBridgeClient } from "../../browser-bridge-client.ts";
import { makeBridgeDispatcher } from "../../bridge-dispatcher.ts";
import { type McpResponse } from "../../max-api-adapter.ts";

interface FakeBridge {
  ensureAlive: ReturnType<typeof vi.fn>;
  browse: ReturnType<typeof vi.fn>;
  loadItem: ReturnType<typeof vi.fn>;
  automationWrite: ReturnType<typeof vi.fn>;
  automationRead: ReturnType<typeof vi.fn>;
  automationClear: ReturnType<typeof vi.fn>;
  isAliveCached: ReturnType<typeof vi.fn>;
  endUndoStep: ReturnType<typeof vi.fn>;
}

function makeFakeBridge(overrides: Partial<FakeBridge> = {}): FakeBridge {
  return {
    ensureAlive: overrides.ensureAlive ?? vi.fn().mockResolvedValue(true),
    browse: overrides.browse ?? vi.fn(),
    loadItem: overrides.loadItem ?? vi.fn(),
    automationWrite: overrides.automationWrite ?? vi.fn(),
    automationRead: overrides.automationRead ?? vi.fn(),
    automationClear: overrides.automationClear ?? vi.fn(),
    isAliveCached: overrides.isAliveCached ?? vi.fn().mockResolvedValue(false),
    endUndoStep: overrides.endUndoStep ?? vi.fn().mockResolvedValue(undefined),
  };
}

function asBridge(b: FakeBridge): BrowserBridgeClient {
  return b as unknown as BrowserBridgeClient;
}

function parseSuccess(response: McpResponse): unknown {
  expect(response.isError).not.toBe(true);
  expect(response.content[0]?.type).toBe("text");

  return JSON.parse(response.content[0]?.text ?? "");
}

describe("makeBridgeDispatcher", () => {
  it("forwards adj-browse to the bridge and returns wrapped result", async () => {
    const bridge = makeFakeBridge({
      browse: vi.fn().mockResolvedValue({ items: [{ name: "Operator" }] }),
    });
    const next = vi.fn();
    const dispatch = makeBridgeDispatcher(next, asBridge(bridge));

    const response = (await dispatch("adj-browse", {
      category: "instruments",
    })) as McpResponse;

    const parsed = parseSuccess(response) as { items: { name: string }[] };

    expect(parsed.items[0]?.name).toBe("Operator");
    expect(bridge.browse).toHaveBeenCalledWith({ category: "instruments" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns install hint when bridge is unavailable", async () => {
    const bridge = makeFakeBridge({
      ensureAlive: vi.fn().mockResolvedValue(false),
    });
    const next = vi.fn();
    const dispatch = makeBridgeDispatcher(next, asBridge(bridge));

    const response = (await dispatch("adj-browse", {})) as McpResponse;

    expect(response.isError).toBe(true);
    expect(response.content[0]?.text).toMatch(/install:bridge/);
  });

  it("falls through non-browser tools to next", async () => {
    const bridge = makeFakeBridge();
    const next = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: "v8-result" }],
    });
    const dispatch = makeBridgeDispatcher(next, asBridge(bridge));

    const response = (await dispatch("adj-read-track", {
      id: "1",
    })) as McpResponse;

    expect(response.content[0]?.text).toBe("v8-result");
    expect(next).toHaveBeenCalledWith("adj-read-track", { id: "1" });
  });

  it("forwards adj-create-device with no browserUri straight to v8", async () => {
    const bridge = makeFakeBridge();
    const next = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: "v8-create" }],
    });
    const dispatch = makeBridgeDispatcher(next, asBridge(bridge));

    await dispatch("adj-create-device", {
      deviceName: "Operator",
      path: "t0",
    });

    expect(next).toHaveBeenCalledWith("adj-create-device", {
      deviceName: "Operator",
      path: "t0",
    });
    expect(bridge.loadItem).not.toHaveBeenCalled();
  });

  it("create-device + browserUri (no deviceName) selects then loads", async () => {
    const bridge = makeFakeBridge({
      loadItem: vi.fn().mockResolvedValue({
        loaded: true,
        deviceId: "id-99",
        deviceCountBefore: 0,
        deviceCountAfter: 1,
      }),
    });
    const next = vi.fn().mockResolvedValueOnce({
      content: [{ type: "text", text: "selected" }],
    });
    const dispatch = makeBridgeDispatcher(next, asBridge(bridge));

    const response = (await dispatch("adj-create-device", {
      browserUri: "query:Synths#Operator",
      path: "t0",
    })) as McpResponse;

    expect(next).toHaveBeenNthCalledWith(1, "adj-select", {
      trackIndex: 0,
    });
    expect(bridge.loadItem).toHaveBeenCalledWith({
      uri: "query:Synths#Operator",
    });
    const parsed = parseSuccess(response) as { deviceId: string };

    expect(parsed.deviceId).toBe("id-99");
  });

  it("create-device + browserUri + deviceName inserts rack then loads kit", async () => {
    const bridge = makeFakeBridge({
      loadItem: vi.fn().mockResolvedValue({
        loaded: true,
        deviceId: "id-1",
        deviceCountBefore: 1,
        deviceCountAfter: 1,
      }),
    });
    const next = vi
      .fn()
      // adj-select
      .mockResolvedValueOnce({
        content: [{ type: "text", text: "selected" }],
      })
      // adj-create-device for rack insertion
      .mockResolvedValueOnce({
        content: [{ type: "text", text: "rack-created" }],
      });
    const dispatch = makeBridgeDispatcher(next, asBridge(bridge));

    await dispatch("adj-create-device", {
      deviceName: "Drum Rack",
      browserUri: "query:Drums#808",
      path: "t0",
    });

    expect(next).toHaveBeenNthCalledWith(2, "adj-create-device", {
      deviceName: "Drum Rack",
      path: "t0",
    });
    expect(bridge.loadItem).toHaveBeenCalledTimes(1);
  });

  it("routes adj-listen to the listen handler without needing the bridge", async () => {
    const bridge = makeFakeBridge();
    const next = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: '{"tempo":120,"timeSignature":"4/4"}' }],
    });
    const dispatch = makeBridgeDispatcher(next, asBridge(bridge));

    const response = (await dispatch("adj-listen", {
      file: "/no/such/file.wav",
    })) as McpResponse;

    expect(response.isError).toBe(true);
    expect(response.content[0]?.text).toContain(
      "listen failed: audio file not found",
    );
    expect(next).toHaveBeenCalledWith("adj-read-live-set", {
      include: ["tracks", "locators"],
    });
    expect(bridge.ensureAlive).not.toHaveBeenCalled();
  });

  it("routes adj-automate through the automation handler", async () => {
    const bridge = makeFakeBridge({
      automationClear: vi.fn().mockResolvedValue({ cleared: "all" }),
    });
    const next = vi.fn().mockResolvedValue({
      content: [
        {
          type: "text",
          text: '{"id":"id 5","view":"session","slot":"0/3","timeSignature":"4/4","start":"1|1","end":"9|1"}',
        },
      ],
    });
    const dispatch = makeBridgeDispatcher(next, asBridge(bridge));

    const response = (await dispatch("adj-automate", {
      action: "clear-all",
      slot: "0/3",
    })) as McpResponse;

    const parsed = parseSuccess(response) as { cleared: string };

    expect(parsed.cleared).toBe("all");
    expect(next).toHaveBeenCalledWith("adj-read-clip", {
      include: ["timing"],
      slot: "0/3",
    });
  });

  it("returns install hint for adj-automate when bridge is down", async () => {
    const bridge = makeFakeBridge({
      ensureAlive: vi.fn().mockResolvedValue(false),
    });
    const dispatch = makeBridgeDispatcher(vi.fn(), asBridge(bridge));

    const response = (await dispatch("adj-automate", {
      slot: "0/3",
    })) as McpResponse;

    expect(response.isError).toBe(true);
    expect(response.content[0]?.text).toMatch(/install:bridge/);
  });

  it("browserUri without path errors before touching bridge", async () => {
    const bridge = makeFakeBridge();
    const next = vi.fn();
    const dispatch = makeBridgeDispatcher(next, asBridge(bridge));

    const response = (await dispatch("adj-create-device", {
      browserUri: "query:x",
    })) as McpResponse;

    expect(response.isError).toBe(true);
    expect(response.content[0]?.text).toMatch(/path is required/);
    expect(next).not.toHaveBeenCalled();
    expect(bridge.loadItem).not.toHaveBeenCalled();
  });
});

describe("makeBridgeDispatcher - one undo step per tool call", () => {
  const v8Result = { content: [{ type: "text", text: "ok" }] };

  it("closes an undo step after a tool that changes the set", async () => {
    const bridge = makeFakeBridge({
      isAliveCached: vi.fn().mockResolvedValue(true),
    });
    const next = vi.fn().mockResolvedValue(v8Result);
    const dispatch = makeBridgeDispatcher(next, asBridge(bridge));

    const response = await dispatch("adj-update-clip", { ids: "1" });

    expect(response).toBe(v8Result);
    expect(bridge.endUndoStep).toHaveBeenCalledOnce();
  });

  it("closes the step only after the tool call has finished", async () => {
    const order: string[] = [];
    const bridge = makeFakeBridge({
      isAliveCached: vi.fn().mockResolvedValue(true),
      endUndoStep: vi.fn(() => {
        order.push("endUndoStep");

        return Promise.resolve();
      }),
    });
    const next = vi.fn(() => {
      order.push("tool");

      return Promise.resolve(v8Result);
    });
    const dispatch = makeBridgeDispatcher(next, asBridge(bridge));

    await dispatch("adj-create-clip", {});

    expect(order).toStrictEqual(["tool", "endUndoStep"]);
  });

  it("leaves read-only tools alone", async () => {
    const bridge = makeFakeBridge({
      isAliveCached: vi.fn().mockResolvedValue(true),
    });
    const dispatch = makeBridgeDispatcher(
      vi.fn().mockResolvedValue(v8Result),
      asBridge(bridge),
    );

    await dispatch("adj-read-track", {});
    await dispatch("adj-connect", {});

    expect(bridge.isAliveCached).not.toHaveBeenCalled();
    expect(bridge.endUndoStep).not.toHaveBeenCalled();
  });

  it("skips grouping when the bridge isn't running", async () => {
    const bridge = makeFakeBridge();
    const dispatch = makeBridgeDispatcher(
      vi.fn().mockResolvedValue(v8Result),
      asBridge(bridge),
    );

    const response = await dispatch("adj-update-track", {});

    expect(response).toBe(v8Result);
    expect(bridge.endUndoStep).not.toHaveBeenCalled();
  });

  it("never fails the tool call when closing the step fails", async () => {
    const bridge = makeFakeBridge({
      isAliveCached: vi.fn().mockResolvedValue(true),
      endUndoStep: vi.fn().mockRejectedValue(new Error("timeout")),
    });
    const dispatch = makeBridgeDispatcher(
      vi.fn().mockResolvedValue(v8Result),
      asBridge(bridge),
    );

    await expect(dispatch("adj-delete", {})).resolves.toBe(v8Result);
  });
});
