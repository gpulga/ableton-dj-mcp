---
title: liveapi-binds-object-not-path
domain: dev
validated: 2026-09-23
evidence:
  "V8 experiment build in Live 12.4.6 (pathfollow / pathfresh probes); cache
  correctness run through adj-* tools (9/9 pass)"
---

## Fact

A LiveAPI object created from a path binds to the Live object at that path at
creation time; it does not follow the path. It always reports the object's
_current_ `.path`. A path that resolves to nothing gives id 0 and stays at id 0
after something is created there. A deleted object keeps its old id (so
`exists()` would still say true) but reports an empty `.path`.

## Evidence

`new LiveAPI("live_set tracks 1")` (id 6): after inserting a track at index 1 it
kept id 6 and reported `path: "live_set tracks 2"`; after deleting the inserted
track, `"live_set tracks 1"` again. An id-created object behaved identically.
`new LiveAPI("... clip_slots 0 clip")` on an empty slot stayed id 0 after
`create_clip`, while a fresh object at the same path got the new id. A track
deleted via `delete_track` kept `id: "10"` with `path: ""`.

## Apply when

Caching, sharing, or holding LiveAPI objects across Live edits (see
`src/live-api-adapter/live-api-object-cache.ts`): re-resolve paths on every
lookup, treat an empty `.path` as deleted, and never rely on a missing-path
handle becoming valid.
