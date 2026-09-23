# Findings Index

One line per finding. Always loaded. Individual files load on demand only when
the bracketed globs match the current task's file paths.

Line format: `- [<slug>](<domain>/<slug>.md) [<glob>,<glob>] — <summary>`, or
`- [<slug>](<domain>/<subdir>/<slug>.md) [...] — ...` when the domain has
subdirs (see `HOW-TO-WRITE.md`).

## dev

- [getproperty-no-boundary-cost](dev/getproperty-no-boundary-cost.md)
  [src/live-api-adapter/**, src/tools/live-set/read-live-set.ts,
  src/tools/track/read/read-track.ts] — LiveAPI .get()/getProperty() is an
  in-process call, no IPC boundary cost to amortize; batching reads is not a
  real optimization
- [live-api-property-names-need-external-check](dev/live-api-property-names-need-external-check.md)
  [src/tools/live-set/**, src/tools/track/**, src/tools/clip/**] — mocked tests
  can't catch a wrong LOM property name; verify against AbletonOSC/Adam Murray's
  LOM reference before shipping a new `.set`/`getProperty` call
- [track-freeze-missing-from-lom](dev/track-freeze-missing-from-lom.md)
  [src/tools/track/update/**] — no LOM hook to trigger freeze/flatten on a
  track, only read-only can_be_frozen/is_frozen; feature removed, don't re-add
  without a real API path
- [track-index-not-stable](dev/track-index-not-stable.md) [src/tools/track/**,
  src/tools/live-set/**, src/tools/clip/duplicate/**] — trackIndex is
  positional, not identity; deleting tracks in Live renumbers everything after
  them, re-read before batch ops
- [v8-task-needs-persistent-ref](dev/v8-task-needs-persistent-ref.md)
  [src/shared/v8-sleep.ts, src/live-api-adapter/**] — inline
  `new Task(cb).schedule(ms)` risks GC before firing; keep a persistent
  reference until the callback runs
- [write-tools-already-batch](dev/write-tools-already-batch.md)
  [src/tools/_/update/_.def.ts, src/tools/_/create/_.def.ts,
  src/tools/operations/**/*.def.ts] — update/create/delete/duplicate tools
  already accept comma-separated ids or a count param; no round-trip gap to fix
  there

### notation

- [barbeat-notation-order](dev/notation/barbeat-notation-order.md)
  [src/notation/barbeat/**, src/tools/generative/**, *_/notes-formatter_] —
  pitch must precede time pos in barbeat or first note drops + warning
- [transform-time-filter-needs-range](dev/notation/transform-time-filter-needs-range.md)
  [src/notation/transforms/**, src/tools/clip/update/**] — transform time
  selectors must be ranges; a single `4|1` fails to parse, use `4|1-4|1`

### browser

- [browser-load-needs-trackindex-select](dev/browser/browser-load-needs-trackindex-select.md)
  [src/mcp-server/bridge-dispatcher.ts, src/tools/control/select.def.ts] —
  browserUri loads must pre-select by trackIndex; devicePath/path silently no-op
  or need a device that doesn't exist yet
- [browser-search-shallow](dev/browser/browser-search-shallow.md)
  [src/tools/browse/**, live_browser_bridge/browser_ops.py,
  src/mcp-server/bridge-dispatcher.ts] — adj-browse search filters only direct
  children; user Places not reachable via Live categories
- [large-udp-reply-silently-dropped](dev/browser/large-udp-reply-silently-dropped.md)
  [live_browser_bridge/browser_ops.py, live_browser_bridge/BrowserBridge.py,
  src/mcp-server/browser-bridge-client.ts] — browse replies over 9216 bytes fail
  sendto() with EMSGSIZE and are silently dropped, presenting as a timeout, not
  a slow-enumeration bug
- [m4l-no-browser-api](dev/browser/m4l-no-browser-api.md) [src/tools/browse/**,
  src/tools/device/create/**, live_browser_bridge/**,
  src/mcp-server/browser-bridge-client.ts, src/mcp-server/bridge-dispatcher.ts]
  — Live Browser object not exposed to M4L LiveAPI JS in 12.4; Python remote
  script is only path (now implemented as `live_browser_bridge/`)

### device

- [arrangement-clip-is-snapshot](dev/device/arrangement-clip-is-snapshot.md)
  [src/tools/operations/duplicate/**, src/tools/clip/update/**,
  src/tools/clip/automate/**] — adj-duplicate copies by value; editing the
  session source after tiling requires deleting and re-duplicating every tile
- [automate-normalized-log-scale](dev/device/automate-normalized-log-scale.md)
  [src/tools/clip/automate/**, live_browser_bridge/**] — adj-automate 0..1 maps
  logarithmically on frequency params; 0.34 = 224 Hz on a 20-20k filter, verify
  in Hz by reading back
- [clip-envelope-api-python-only](dev/device/clip-envelope-api-python-only.md)
  [src/tools/clip/automate/**, live_browser_bridge/**] — clip envelope
  write/read is Python-remote-script-only (LOM whitelist gap); route through the
  bridge, reads must sample value_at_time
- [clip-envelope-survives-duplicate](dev/device/clip-envelope-survives-duplicate.md)
  [src/tools/clip/automate/**, src/tools/operations/duplicate/**] — envelopes
  written on a session clip survive adj-duplicate to arrangement; only path to
  arrangement automation (write → dup → clear source)
- [clip-groove-write-no-op](dev/device/clip-groove-write-no-op.md)
  [src/tools/clip/update/**, live_browser_bridge/**] — Clip.groove is a child
  object reference; generic set_property reports success but doesn't actually
  assign it, check the Python bridge before building on this
- [drum-kit-uri-loads-full-rack](dev/device/drum-kit-uri-loads-full-rack.md)
  [src/tools/device/create/**, src/mcp-server/bridge-dispatcher.ts,
  live_browser_bridge/BrowserBridge.py] — load_item on a kit URI creates a
  populated Drum Rack; pre-inserting "Drum Rack" device yields an extra empty
  rack
- [empty-drum-rack-silent](dev/device/empty-drum-rack-silent.md)
  [src/tools/device/**, *_/adj-create-device_] — adj-create-device "Drum Rack"
  returns success but rack has no samples = no sound
- [live-instrument-limit](dev/device/live-instrument-limit.md)
  [src/tools/device/**, src/tools/track/**] — Live blocks 2nd instrument per
  track with vague error; delete first
- [midi-track-no-stereo-meter](dev/device/midi-track-no-stereo-meter.md)
  [src/tools/track/read/helpers/read-track-helpers.ts,
  src/tools/track/read/read-track.ts] — MIDI tracks without an audio-producing
  device omit meterLeft/meterRight, only meterLevel reads; audio/return/master
  tracks expose all three
- [param-write-silently-ignored](dev/device/param-write-silently-ignored.md)
  [src/tools/device/update/**,
  src/tools/shared/device/helpers/device-display-helpers.ts] — Live ignores
  out-of-range param sets rather than clamping; adj-update-device clamps + warns
  since #271, and params with unparseable labels can't be set by display value

### build

- [ci-format-job-ignores-untracked](dev/build/ci-format-job-ignores-untracked.md)
  [.github/workflows/ci.yml, .prettierignore, src/generated/**] — CI Format job
  (write + git diff) misses formatting bugs in gitignored files; use
  format:check for a true signal
- [eslint-unicorn-import-peer-conflict](dev/build/eslint-unicorn-import-peer-conflict.md)
  [package.json, package-lock.json] — eslint-plugin-unicorn>=66 needs
  eslint>=10.4, eslint-plugin-import caps at eslint^9; mutually exclusive
- [install-device-file-list](dev/build/install-device-file-list.md)
  [scripts/install/install-device.ts, max-for-live-device/**] — User Library
  install needs all 7 files (.amxd + 2 JS + 4 .maxpat); missing .maxpat = blank
  UI
- [prettier-ignore-path-cwd-relative](dev/build/prettier-ignore-path-cwd-relative.md)
  [.prettierignore, config/prettier.config.mjs, package.json] — --ignore-path
  resolves relative to the ignore file's dir, not cwd (unlike --config)
- [release-please-config-relocatable](dev/build/release-please-config-relocatable.md)
  [config/release-please-config.json, config/.release-please-manifest.json,
  .github/workflows/release.yml] — config-file/manifest-file inputs can be
  relocated; internal paths stay repo-root-relative
- [release-please-version-sync](dev/build/release-please-version-sync.md)
  [config/release-please-config.json, src/shared/version.ts, package.json] —
  VERSION constants need extra-files entry + marker comment

### testing

- [new-readonly-field-breaks-strictequal](dev/testing/new-readonly-field-breaks-strictequal.md)
  [src/tools/_/read/\**, src/tools/live-set/read-live-set.ts,
  \**/tests/_-basic.test.ts] — new always-present read field breaks existing
  toStrictEqual fixtures; add mock-default value to each

## music

- [euclidean-density-sweep](music/euclidean-density-sweep.md)
  [src/tools/generative/**, *_/named-patterns_] — vary `pulses` per section
  (3→5→7→11) for arrangement arc with one algorithm

## workflow

- [browser-bridge-needs-live-restart](workflow/browser-bridge-needs-live-restart.md)
  [live_browser_bridge/**, scripts/install/install-bridge.ts] — install:bridge
  alone doesn't reload edited Python while Live is running; full Live restart
  required
- [device-deploy-flow](workflow/device-deploy-flow.md) [max-for-live-device/**,
  dist/**, package.json] — build → copy bundles to max-for-live-device → restart
  Live to load new version
- [github-token-blocks-required-checks](workflow/github-token-blocks-required-checks.md)
  [.github/workflows/*.yml] — GITHUB_TOKEN-authored pushes/PRs never trigger
  push/pull_request runs; required status checks block them forever unless CI is
  dispatched explicitly against that branch
- [portal-restart-exposes-new-tools](workflow/portal-restart-exposes-new-tools.md)
  [src/portal/**, src/mcp-server/**, dist/**] — MCP tool list fixed at connect
  time; tools added by a server update need an MCP reconnect to appear
- [self-bootstrap-prereq](workflow/self-bootstrap-prereq.md)
  [src/portal/lazy-boot*, scripts/start-live.ts, docs/Setup.md] — lazy-boot only
  opens Live; device load needs "Save Live Set as Default Set" with device on
  track
