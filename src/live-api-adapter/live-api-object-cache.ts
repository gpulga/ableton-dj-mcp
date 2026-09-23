// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

// Session-lifetime cache of LiveAPI objects, keyed by Live object id.
//
// Why: every `new LiveAPI()` permanently slows all later Live API access in the
// device. Created objects are never released (neither `gc()` nor `freepeer()`
// helps), so creating fresh objects on every tool call made reads degrade
// linearly over a session (#326). Reusing one object per Live object bounds
// creation by the size of the set instead of the number of calls.
//
// Semantics match fresh objects (verified in Live 12.4):
// - A LiveAPI object binds to the Live object it resolved to at creation, even
//   when created from a path, and reports that object's *current* path. So
//   "the object at this path now" = resolve path -> id -> cached object.
// - A path that resolves to nothing (id 0) stays at id 0 forever, so a missing
//   handle can be reused per path; the path is re-resolved on every lookup.
// - A deleted object keeps its id but reports an empty path. Cache hits are
//   validated on path and evicted when stale.

export type LiveApiConstructor = new (path: string) => LiveAPI;

export interface LiveApiObjectCache {
  /** LiveAPI object for a parsed target ("id N" or a Live path). */
  get: (target: string) => LiveAPI;
  /** Number of objects this cache has constructed (diagnostics). */
  readonly created: number;
}

/**
 * Create a cache that hands out one LiveAPI object per Live object.
 * @param Api - LiveAPI constructor (injected for testing)
 * @returns Cache instance
 */
export function createLiveApiObjectCache(
  Api: LiveApiConstructor,
): LiveApiObjectCache {
  const byId = new Map<string, LiveAPI>();
  const missingByTarget = new Map<string, LiveAPI>();
  let resolver: LiveAPI | undefined;
  let created = 0;

  const construct = (target: string): LiveAPI => {
    created++;

    return new Api(target);
  };

  const resolveId = (target: string): string => {
    if (target.startsWith("id ")) {
      return target.slice(3);
    }

    // One reusable cursor: goto() does not create objects.
    resolver ??= construct("live_set");
    resolver.goto(target);

    return String(resolver.id);
  };

  const getMissing = (target: string): LiveAPI => {
    let missing = missingByTarget.get(target);

    if (!missing) {
      missing = construct(target);
      missingByTarget.set(target, missing);
    }

    return missing;
  };

  return {
    get(target: string): LiveAPI {
      const id = resolveId(target);

      if (id === "0") {
        return getMissing(target);
      }

      const cached = byId.get(id);

      if (cached) {
        if (cached.path !== "") {
          return cached;
        }

        byId.delete(id); // the Live object was deleted
      }

      const fresh = construct(target);

      // Don't cache handles to deleted objects; they report an empty path.
      if (fresh.path !== "") {
        byId.set(id, fresh);
      }

      return fresh;
    },

    get created(): number {
      return created;
    },
  };
}

let sharedCache: LiveApiObjectCache | undefined;
let sharedCacheEnabled = true;

/**
 * Turn the shared cache on or off. Off restores one fresh object per lookup;
 * the unit tests use that so per-test mock registrations stay isolated.
 * @param enabled - Whether lookups go through the shared cache
 */
export function setLiveApiObjectCacheEnabled(enabled: boolean): void {
  sharedCacheEnabled = enabled;
  sharedCache = undefined;
}

/**
 * LiveAPI object for a parsed target, from the shared cache when enabled.
 * @param target - "id N" or a Live path
 * @returns LiveAPI object
 */
export function liveApiObject(target: string): LiveAPI {
  if (!sharedCacheEnabled) {
    return new LiveAPI(target);
  }

  sharedCache ??= createLiveApiObjectCache(LiveAPI);

  return sharedCache.get(target);
}

/**
 * A private LiveAPI object outside the cache, for callers that repoint it with
 * goto() (which would corrupt a shared object). Each call creates an object, so
 * keep this off hot paths.
 * @param target - "id N" or a Live path
 * @returns New LiveAPI object
 */
export function uncachedLiveApiObject(target: string): LiveAPI {
  return new LiveAPI(target);
}
