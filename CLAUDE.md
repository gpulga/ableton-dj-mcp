# Ableton DJ MCP

MCP server that lets an AI read and control Ableton Live. Licensed under
GPL-3.0-or-later.

## Installing or using it (not developing)?

If the user wants to **install** this or **make music** with it, stop reading
here. Instead:

- **Install**: follow
  [`docs/Setup.md` → For AI agents](docs/Setup.md#for-ai-agents-installing-this-for-a-user).
  It's `npm run setup`. Don't run `npm install` or `npm run build`.
- **Make music**: call `adj-connect` first. It returns usage skills. Tool
  catalog: [`docs/Tools-Reference.md`](docs/Tools-Reference.md).

Everything below is for changing the code.

## Quick start

```bash
npm install
npm run parser:build   # required before tests (generates Peggy parsers)
npm test               # run unit tests
npm run check          # full quality gate: lint + typecheck + format + duplication + coverage
npm run fix            # auto-fix lint and formatting
npm run build          # bundle all three outputs to dist/
docker compose -f docker/docker-compose.yml run check  # same as npm run check, in isolation
```

## Architecture

The server runs **inside a Max for Live device** (the `.amxd`). The portal runs
externally as a standalone Node process bridging the MCP client over stdio to
the in-device server on `:3350`.

Full diagram, language choices, build system, message protocol:
[`docs/contributing/Architecture.md`](docs/contributing/Architecture.md).

## Project map

[`docs/PROJECT_INDEX.md`](docs/PROJECT_INDEX.md) — directory map, entry points,
constants, env flags. [`docs/`](docs/) has deeper docs on specific topics.

## Music vs dev context

This repo holds two contexts:

- **Dev context** (root): code, tests, build, docs. AI sessions starting at the
  repo root load this CLAUDE.md and dev findings.
- **Music context** (`workspace/`, gitignored): user's projects, genres,
  techniques, AI instructions. AI sessions starting in `workspace/` load
  `workspace/AI.md` and music-first context.

For music work, `cd workspace && start-your-ai-client`. For tool development,
work from the repo root.

To create the workspace from the tracked template:

```bash
npm run init:workspace
```

This is a one-time setup. The workspace is gitignored — your personal projects
and notes never get pushed.

## Findings — load before non-trivial work

`docs/findings/INDEX.md` lists validated facts captured from prior sessions
(format: `[slug](path) [glob,glob] — summary`). Read INDEX before:

- Writing new code in `src/` (≥10 lines)
- Fixing bugs that aren't single-line typos
- Editing build / release / CI config
- Generating notes/clips programmatically
- Deploying or modifying the `.amxd` device

For each INDEX line, match the bracketed globs against your task's file paths.
Read the linked file ONLY if matched. Skip if no match — the INDEX line itself
is the lookup key.

To capture a new validated finding, follow the format in
`docs/findings/HOW-TO-WRITE.md` and add it directly. (The maintainer uses a
personal Claude Code slash command to automate this — it's local tooling, not
part of this repo, so don't expect it to exist on a fresh clone.)

## Tools

25 tools, all prefixed `adj-`. Each tool has a `.def.ts` (Zod schema) and a
`.ts` (implementation). Full catalog with action lists and parameters:
[`docs/Tools-Reference.md`](docs/Tools-Reference.md).

## Coding rules

Full standards:
[`docs/contributing/Coding-Standards.md`](docs/contributing/Coding-Standards.md).

## Notation

Two DSLs, both Peggy-generated. Run `npm run parser:build` after changing
`.peggy` files.

- **Bar|beat positions** (`17|1`) —
  [`docs/specs/BarBeat-Spec.md`](docs/specs/BarBeat-Spec.md)
- **Transform expressions** (`velocity += rand(-5, 5)`) —
  [`docs/specs/Transforms-Spec.md`](docs/specs/Transforms-Spec.md)

## Build outputs

Three bundles in `dist/`. Full table (entries, targets, purposes) in
[`docs/contributing/Architecture.md`](docs/contributing/Architecture.md). Deploy
steps: [`docs/Releasing.md`](docs/Releasing.md).

## Branching

- `main` — stable
- Feature branches: `<your-username>/<description>`

## Pull requests

Every PR must include:

- **Assignee**: `gpulga` (project maintainer — every PR gets this assignee for
  review, regardless of who opens it; not a placeholder for your own username)
- **Label**: one of the 5 standard labels (pick the best fit):
  - `bug` — fixes a defect
  - `feature` — new functionality
  - `chore` — maintenance, cleanup, config, refactoring
  - `deps` — dependency updates
  - `ci` — CI/CD and workflow changes

`gh pr create` flags: `--assignee gpulga --label <label>`

## Commit style

Use conventional commits — release-please reads these to auto-generate the
CHANGELOG:

- `feat: add scale-aware note generation` — new feature (minor version bump)
- `fix: correct barbeat serializer off-by-one` — bug fix (patch bump)
- `perf: cache drum map lookups` — performance improvement
- `chore:`, `ci:`, `docs:`, `test:`, `refactor:` — no release, hidden in
  changelog
- `feat!:` or `BREAKING CHANGE:` footer — major version bump

## License

GPL-3.0-or-later. See LICENSE.
