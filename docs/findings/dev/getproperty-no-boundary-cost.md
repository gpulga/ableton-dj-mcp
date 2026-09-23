---
title: getproperty-no-boundary-cost
domain: dev
validated: 2026-08-08
evidence:
  "src/live-api-adapter/live-api-extensions.ts:33-67,
  src/mcp-server/max-api-adapter.ts:73"
---

## Fact

`LiveAPI.getProperty()`/`.get()` calls inside the device's V8 adapter are plain
in-process JS calls into Max's native object, not IPC or thread-boundary
crossings. The one real MCP round trip happens per tool call, not per property —
batching individual property reads would not reduce any actual crossing cost.

## Evidence

`getProperty` (live-api-extensions.ts:33-67) synchronously wraps
`this.get(property)` inside the same V8 context that already received a single
`Max.outlet("mcp_request", ...)` per tool call (max-api-adapter.ts:73).
`readLiveSet`/`readTrack` (live-api-adapter.ts:262-316) loop hundreds of
`.get()` calls before one `sendResponse()` — all inside that one crossing.

## Apply when

Considering "batch the property reads" as a fix for `adj-read-live-set` /
`adj-read-track` feeling slow on large sets — there's no per-property boundary
cost to amortize. The slowdown that did exist came from creating LiveAPI
objects, see
[liveapi-creation-slows-all-access](liveapi-creation-slows-all-access.md).
