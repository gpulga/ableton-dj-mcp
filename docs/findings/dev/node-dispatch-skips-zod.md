---
title: node-dispatch-skips-zod
domain: dev
validated: 2026-10-25
evidence: live adj-listen runs 2026-10-25 (ids.split error, then fixed)
---

## Fact

Node-side handlers that call `next(tool, args)` skip the tool's Zod schema, so
schema defaults are missing (`adj-create-track` without `count` returns an
array, not an object). `adj-create-track` also returns a numeric `id`, and Max
errors arrive as extra `WARNING: ...` content items after the payload.

## Evidence

```
adj-create-track {type:"audio",name:"dbg",count:1} -> {id:75,trackIndex:5}
adj-update-track {ids: 75} -> "ids.split is not a function"
```

## Apply when

Writing a Node-side orchestrator (bridge dispatcher handlers) that chains v8
tools: pass every defaulted arg explicitly, `String()` ids, and drop `WARNING:`
items before parsing the payload.
