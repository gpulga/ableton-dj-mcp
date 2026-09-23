---
title: liveapi-creation-slows-all-access
domain: dev
validated: 2026-09-23
evidence:
  "V8 experiment build in Live 12.4.6 (perf-exp); trend benchmark before/after
  src/live-api-adapter/live-api-object-cache.ts (#326)"
---

## Fact

Every `new LiveAPI(...)` in the device's V8 context permanently slows all later
Live API access: creating objects and reading properties on existing ones.
Nothing releases them: `gc()` and `freepeer()` both exist but do not stop the
growth. Repointing one existing object with `goto()` does not add to it. Part of
the cost survives a device reload and only clears when Live restarts.

## Evidence

Batches of 1000 `new LiveAPI("live_set tracks 0")`: 133 -> 278 -> 381 -> 521 ->
1377 us per object. `get("name")` on one existing object rose 33 -> 189 us as
objects accumulated, while 15000 gets alone stayed flat (192/189/188 us).
`reuse-goto` batches stayed flat and left gets unchanged. `create + freepeer()`
and `create + gc()` batches kept growing (1085 -> 1206 -> 1316 us). Tool-level:
`adj-read-live-set` climbed 43 -> 630 ms over ~350 calls (empty set) and 1.0 ->
~5 s over ~100 calls (19-track set). With the id-keyed object cache: flat 21 ms
over 200 calls (empty set) and flat 85 ms (19-track set).

## Apply when

Writing or changing code in `src/live-api-adapter/**` or any tool that obtains
LiveAPI objects. Never construct `LiveAPI` directly; go through `LiveAPI.from()`
/ `getChildren()` (cached). Use `uncachedLiveApiObject()` only for objects that
get repointed with `goto()`, and keep those off hot paths.
