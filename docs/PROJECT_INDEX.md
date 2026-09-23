# Project Index

Pure index for the codebase. Each line points to a source-of-truth file. Use
this to orient before any task; load the linked file when relevant.

## Install and use

- [Setup.md](Setup.md) — end-user install (`npm run setup`), client wiring,
  AI-agent install checklist, troubleshooting

## Architecture and build

- [contributing/Architecture.md](contributing/Architecture.md) — dataflow
  diagram, language choices, three rollup bundles, message protocol, Live API
  interface
- [Releasing.md](Releasing.md) — release-please flow, local deploy steps
  (`dist/` → `max-for-live-device/`), version verification

## Tools

- [Tools-Reference.md](Tools-Reference.md) — canonical catalog of all 24 `adj-*`
  tools, with actions and parameters
- [contributing/Read-Tool-Includes.md](contributing/Read-Tool-Includes.md) —
  `include` parameter conventions for all read tools
- [contributing/Arrangement-Operations.md](contributing/Arrangement-Operations.md)
  — Live API constraints driving arrangement clip algorithms

## Notation systems

- [specs/BarBeat-Spec.md](specs/BarBeat-Spec.md) — bar|beat MIDI notation
  (`src/notation/barbeat/`)
- [specs/Transforms-Spec.md](specs/Transforms-Spec.md) — transform DSL
  (`src/notation/transform/`)
- [specs/Browser-Bridge-Spec.md](specs/Browser-Bridge-Spec.md) — Python
  remote-script bridge for Live's Browser API (issue #26)

## Code conventions and dev workflow

- [contributing/Coding-Standards.md](contributing/Coding-Standards.md) — file
  naming, imports, style, Zod, `livePath` builders, coverage rules, testing
- [contributing/Development-Tools.md](contributing/Development-Tools.md) —
  `adj-client.ts`, raw Live API tool, MCP Inspector, debug builds, log files
- [findings/INDEX.md](findings/INDEX.md) — validated facts from prior sessions
  (load before non-trivial work)

## Code Layers

Each tool has 3 layers:

1. **Schema** (`src/tools/{domain}/{action}/{action}.def.ts`) — Zod params,
   description
2. **Implementation** (`src/tools/{domain}/{action}/{action}.ts`) — business
   logic
3. **Live API dispatch** (`src/live-api-adapter/live-api-adapter.ts`) — routes
   to Ableton

## Key Directories

| Dir                     | Purpose                                                       |
| ----------------------- | ------------------------------------------------------------- |
| `src/mcp-server/`       | MCP server creation, Express app, Max API adapter             |
| `src/tools/`            | All tool definitions + implementations                        |
| `src/live-api-adapter/` | Tool dispatch to Ableton Live API (runs in Max V8)            |
| `src/portal/`           | Node CLI bridge (stdio to HTTP)                               |
| `src/notation/`         | bar\|beat parser + transform expression evaluator             |
| `src/skills/`           | Tool set definitions (basic / standard / electronic-music)    |
| `src/shared/`           | Version, pitch, errors, serialization, `livePath` builders    |
| `e2e/`                  | End-to-end tests against a live Ableton instance              |
| `config/`               | Rollup, Vitest, ESLint, jscpd configs                         |
| `scripts/`              | Dev utilities + `install/` (setup, device, bridge installers) |
| `dist/`                 | Build output (git-ignored)                                    |
| `max-for-live-device/`  | `.amxd` device + sibling JS bundles loaded by Max             |
| `live_browser_bridge/`  | Python remote-script sidecar, exposes Live's Browser API      |

## Entry Points

| Method       | Entry                           | What Happens                                          |
| ------------ | ------------------------------- | ----------------------------------------------------- |
| Max for Live | `.amxd` device (from `dist/`)   | Hosts Express on :3350, runs MCP server in Max's Node |
| Portal       | `dist/ableton-dj-mcp-portal.js` | Runs standalone, bridges stdio to :3350               |
| Dev portal   | `npm run dev`                   | Rollup watch + portal in dev mode                     |

## Constants (`src/tools/constants.ts`)

- 35 valid scale names
- 15 instruments, 9 MIDI effects, 35 audio effects (Ableton native)
- Device types: instrument, drum-rack, audio-effect, midi-effect (+ rack
  variants)
- Warp modes: beats, tones, texture, repitch, complex, rex, pro

## Env Flags

| Flag                  | Effect                          |
| --------------------- | ------------------------------- |
| `ENABLE_RAW_LIVE_API` | Expose raw API passthrough tool |
| `ENABLE_CODE_EXEC`    | Allow code execution in clips   |
| `ENABLE_DEV_CORS`     | CORS for external MCP Inspector |
| `ENABLE_WARP_MARKERS` | Enable warp marker read/write   |

## Ports

| Port  | Service                                              |
| ----- | ---------------------------------------------------- |
| 3350  | MCP server (default)                                 |
| 11077 | Live Browser Bridge UDP (override `ADJ_BRIDGE_PORT`) |
