// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import {
  BridgeCallError,
  BrowserBridgeClient,
} from "../../browser-bridge-client.ts";

interface SentMessage {
  id: string;
  op: string;
  args: Record<string, unknown>;
  replyAddr: { port: number; host: string };
}

class FakeSocket extends EventEmitter {
  readonly sent: SentMessage[] = [];
  /** Test hook: called with each sent request id so the test can build a reply. */
  onSend?: (msg: SentMessage) => void;
  closed = false;

  bind(_port: number, cb: () => void): void {
    setImmediate(cb);
  }

  send(
    payload: Buffer,
    port: number,
    host: string,
    cb: (err: Error | null) => void,
  ): void {
    const parsed = JSON.parse(payload.toString("utf8")) as {
      id: string;
      op: string;
      args: Record<string, unknown>;
    };
    const record: SentMessage = { ...parsed, replyAddr: { port, host } };

    this.sent.push(record);
    cb(null);
    this.onSend?.(record);
  }

  close(): void {
    this.closed = true;
  }

  /**
   * Push a reply datagram into the client.
   * @param payload - JSON-serializable reply mirroring what the bridge would send
   */
  reply(payload: object): void {
    this.emit("message", Buffer.from(JSON.stringify(payload), "utf8"), {});
  }
}

function makeClient(): { client: BrowserBridgeClient; socket: FakeSocket } {
  const socket = new FakeSocket();
  const client = new BrowserBridgeClient({
    socketFactory: () => socket as unknown as ReturnType<typeof Object>,
  });

  return { client, socket };
}

describe("BrowserBridgeClient", () => {
  it("ping resolves on ok reply", async () => {
    const { client, socket } = makeClient();

    socket.onSend = (msg) =>
      socket.reply({
        id: msg.id,
        ok: true,
        result: { version: "0.1.0", liveVersion: "12.4.0" },
      });

    const result = await client.ping();

    expect(result.version).toBe("0.1.0");
    expect(result.liveVersion).toBe("12.4.0");
  });

  it("browse forwards args and parses reply", async () => {
    const { client, socket } = makeClient();

    socket.onSend = (msg) => {
      expect(msg.op).toBe("browse");
      expect(msg.args.category).toBe("instruments");
      socket.reply({
        id: msg.id,
        ok: true,
        result: { items: [{ name: "Operator", uri: "u1" }] },
      });
    };

    const result = await client.browse({ category: "instruments" });

    expect(result.items[0]?.name).toBe("Operator");
  });

  it("translates non-ok replies into BridgeCallError", async () => {
    const { client, socket } = makeClient();

    socket.onSend = (msg) =>
      socket.reply({
        id: msg.id,
        ok: false,
        error: { code: "BROWSER_API_FAILED", message: "uri not found" },
      });

    await expect(client.browse({ category: "instruments" })).rejects.toThrow(
      BridgeCallError,
    );
  });

  it("surfaces REPLY_TOO_LARGE when the bridge reports an oversized reply", async () => {
    const { client, socket } = makeClient();

    socket.onSend = (msg) =>
      socket.reply({
        id: msg.id,
        ok: false,
        error: {
          code: "REPLY_TOO_LARGE",
          message: "[Errno 40] Message too long",
        },
      });

    await expect(client.browse({ category: "sounds" })).rejects.toMatchObject({
      code: "REPLY_TOO_LARGE",
    });
  });

  it("times out when bridge does not reply", async () => {
    vi.useFakeTimers();
    const { client, socket } = makeClient();

    socket.onSend = () => {
      /* never reply */
    };

    const promise = client.browse({}, 50);

    // Attach a catch handler BEFORE advancing fake timers so vitest does not
    // observe a transient unhandled rejection (CI exits non-zero on those).
    promise.catch(() => {
      /* assertion below verifies the rejection details */
    });

    await vi.advanceTimersByTimeAsync(60);
    await expect(promise).rejects.toThrow(/timed out/i);
    vi.useRealTimers();
  });

  it("ensureAlive caches successful pings", async () => {
    const { client, socket } = makeClient();
    let pingCount = 0;

    socket.onSend = (msg) => {
      pingCount += 1;
      socket.reply({
        id: msg.id,
        ok: true,
        result: { version: "0.1.0", liveVersion: "12.4.0" },
      });
    };

    expect(await client.ensureAlive()).toBe(true);
    expect(await client.ensureAlive()).toBe(true);
    expect(pingCount).toBe(1);
  });

  it("close drops outstanding requests with TIMEOUT_INTERNAL", async () => {
    const { client, socket } = makeClient();

    socket.onSend = () => {
      /* never reply */
    };

    const promise = client.browse({}, 5_000);

    client.close();

    await expect(promise).rejects.toThrow(/closed/);
  });

  it("endUndoStep sends end_undo_step", async () => {
    const { client, socket } = makeClient();

    socket.onSend = (msg) => socket.reply({ id: msg.id, ok: true, result: {} });

    await client.endUndoStep();

    expect(socket.sent.map((m) => m.op)).toStrictEqual(["end_undo_step"]);
  });

  it("isAliveCached remembers a failed ping instead of pinging again", async () => {
    const { client, socket } = makeClient();

    socket.onSend = (msg) =>
      socket.reply({
        id: msg.id,
        ok: false,
        error: { code: "MAIN_THREAD_ERROR", message: "down" },
      });

    expect(await client.isAliveCached()).toBe(false);
    expect(await client.isAliveCached()).toBe(false);
    expect(socket.sent).toHaveLength(1);
  });

  it("isAliveCached reuses a recent successful ping", async () => {
    const { client, socket } = makeClient();

    socket.onSend = (msg) =>
      socket.reply({
        id: msg.id,
        ok: true,
        result: { version: "0.1.0", liveVersion: "12.4.0" },
      });

    expect(await client.isAliveCached()).toBe(true);
    expect(await client.isAliveCached()).toBe(true);
    expect(socket.sent).toHaveLength(1);
  });
});
