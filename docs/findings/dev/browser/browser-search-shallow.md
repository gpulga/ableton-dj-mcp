---
title: browser-search-shallow
domain: dev
validated: 2026-05-07
evidence: PR #119, manual session
---

## Fact

`adj-browse`'s `search` filter only matches direct children of the target node
(category root or path-walked node). It is not a recursive search across the
tree. `Application.Browser.<category>` only exposes Live's curated categories;
user-added Places (sidebar folders, external sample packs dropped onto the
browser) are not reachable via standard category attributes.

## Evidence

```
adj-browse search=<pack-name>           → returns only the categories list
adj-browse category=user_library search=<pack-name> → items: []
adj-browse category=samples search=<pack-name> → items: []
adj-browse category=packs            → only "Core Library"
adj-browse category=user_folders     → items: []
```

A third-party sample pack in a folder outside the User Library (e.g.
`~/Downloads/<pack>/`) was not reachable via any category. Plain `.wav` files
load fine via `adj-create-clip sampleFile=<absolute path>`, no bridge needed.

## Apply when

Designing search UX in `src/tools/browse/` or extending `browser_ops.browse`.
Two implications: (1) the bridge must expose a recursive search op if cross-tree
lookup is wanted, and (2) the bridge is for Live-managed (URI'd) content only —
filesystem samples bypass it via `sampleFile`.
