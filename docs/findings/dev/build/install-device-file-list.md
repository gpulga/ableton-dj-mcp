---
title: install-device-file-list
domain: dev
validated: 2026-05-06
evidence: PR #110, Live console "bpatcher: error loading patcher tab-main.maxpat"
---

## Fact

`scripts/install/install-device.ts` must copy 7 files into the User Library Max
MIDI Effect dir, not 3. The `.amxd` embeds bpatcher references to four sibling
`.maxpat` files by relative path; missing them leaves the device half-loaded
(server runs, UI tabs blank).

## Evidence

Required files (all from `max-for-live-device/`):

```
Ableton_DJ_MCP.amxd
live-api-adapter.js
mcp-server.mjs
server-status.maxpat
tab-main.maxpat
tab-context.maxpat
tab-setup.maxpat
```

Symptom when `.maxpat` missing (PR #107 bug, fixed in #110):

```
bpatcher: error loading patcher tab-main.maxpat
bpatcher: error loading patcher tab-context.maxpat
bpatcher: error loading patcher tab-setup.maxpat
```

Device still booted (`:3350` came up) but UI was empty.

## Apply when

Editing `scripts/install/install-device.ts`, adding any new `.maxpat` patcher
under `max-for-live-device/`, or debugging missing tabs / empty UI in a User
Library install.
