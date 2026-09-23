// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createLiveApiObjectCache,
  liveApiObject,
  setLiveApiObjectCacheEnabled,
  uncachedLiveApiObject,
} from "../live-api-object-cache.ts";

// Minimal model of Live's object graph, reproducing the LiveAPI behavior
// measured in Live 12.4: objects bind to what they resolved to at creation,
// report the current path, keep their id after deletion (with an empty path),
// and a missing path resolves to id 0.
const world = {
  pathById: new Map<string, string>(),
  idAt(path: string): string {
    for (const [id, p] of this.pathById) {
      if (p === path) return id;
    }

    return "0";
  },
  reset(entries: Record<string, string>): void {
    this.pathById = new Map(Object.entries(entries));
  },
};

class FakeApi {
  private _id: string;

  constructor(target: string) {
    this._id = target.startsWith("id ") ? target.slice(3) : world.idAt(target);
  }

  get id(): string {
    return this._id;
  }

  get path(): string {
    return world.pathById.get(this._id) ?? "";
  }

  goto(path: string): void {
    this._id = world.idAt(path);
  }
}

const newCache = () =>
  createLiveApiObjectCache(FakeApi as unknown as new (path: string) => LiveAPI);

describe("createLiveApiObjectCache", () => {
  beforeEach(() => {
    world.reset({
      "1": "live_set",
      "6": "live_set tracks 0",
      "7": "live_set tracks 1",
    });
  });

  it("returns one object per Live object, whether asked by path or id", () => {
    const cache = newCache();
    const byPath = cache.get("live_set tracks 0");

    expect(cache.get("id 6")).toBe(byPath);
    expect(cache.get("live_set tracks 0")).toBe(byPath);
    expect(byPath.id).toBe("6");
  });

  it("stops creating objects once every Live object has been seen", () => {
    const cache = newCache();

    for (let i = 0; i < 1000; i++) {
      cache.get("live_set tracks 0");
      cache.get("live_set tracks 1");
      cache.get("id 1");
    }

    // resolver + tracks 0 + tracks 1 + live_set
    expect(cache.created).toBe(4);
  });

  it("re-resolves paths, so a path follows whatever is there now", () => {
    const cache = newCache();
    const original = cache.get("live_set tracks 1");

    // Insert a track at index 1: track 7 moves to index 2.
    world.reset({
      "1": "live_set",
      "6": "live_set tracks 0",
      "9": "live_set tracks 1",
      "7": "live_set tracks 2",
    });

    const now = cache.get("live_set tracks 1");

    expect(now.id).toBe("9");
    expect(now).not.toBe(original);
    expect(original.path).toBe("live_set tracks 2");
    expect(cache.get("live_set tracks 2")).toBe(original);
  });

  it("reuses a missing handle per path until something exists there", () => {
    const cache = newCache();
    const clipPath = "live_set tracks 0 clip_slots 0 clip";
    const missing = cache.get(clipPath);

    expect(missing.id).toBe("0");
    expect(cache.get(clipPath)).toBe(missing);

    world.pathById.set("12", clipPath);
    const clip = cache.get(clipPath);

    expect(clip.id).toBe("12");
    expect(clip).not.toBe(missing);
  });

  it("evicts deleted objects instead of returning stale handles", () => {
    const cache = newCache();
    const track = cache.get("id 7");

    world.pathById.delete("7");
    const after = cache.get("id 7");

    expect(after).not.toBe(track);
    expect(after.path).toBe("");
    // A handle to a deleted object is not cached.
    expect(cache.get("id 7")).not.toBe(after);
  });
});

describe("shared cache", () => {
  afterEach(() => {
    setLiveApiObjectCacheEnabled(false);
  });

  it("creates a fresh object per lookup when disabled", () => {
    setLiveApiObjectCacheEnabled(false);

    expect(liveApiObject("id 6")).not.toBe(liveApiObject("id 6"));
  });

  it("reuses objects when enabled", () => {
    setLiveApiObjectCacheEnabled(true);

    expect(liveApiObject("id 6")).toBe(liveApiObject("id 6"));
  });

  it("uncachedLiveApiObject always creates a new object", () => {
    setLiveApiObjectCacheEnabled(true);

    expect(uncachedLiveApiObject("id 6")).not.toBe(
      uncachedLiveApiObject("id 6"),
    );
  });
});
