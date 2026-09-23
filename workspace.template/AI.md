# AI Instructions — Music Workspace

This file is loaded by your AI assistant when you start a session inside this
`workspace/` directory. Its purpose is to ground the assistant in your music
production context and tools.

This file is **AI-agnostic** — works with Claude (Code or Desktop), ChatGPT,
Cursor, or any MCP-compatible client.

## What this workspace is

Your personal music context, gitignored, alongside the Ableton DJ MCP tooling.
Holds:

- `projects/` — active songs you're working on
- `findings/` — validated music knowledge from sessions (strict format,
  AI-routed)
- `genres/` — freeform notes per genre (long-form analysis, reference dumps)
- `techniques/` — freeform technique writeups

`findings/` vs `genres/` + `techniques/`:

- **findings/** = atomic, validated, indexed for AI routing. One fact per file.
  Used by AI to look up specific knowledge fast. See `findings/HOW-TO-WRITE.md`.
- **genres/ + techniques/** = freeform long-form notes you write for yourself.
  Reference dumps, deep analyses, brain dumps. AI reads them when relevant but
  they're not strictly formatted.

Edit freely. Nothing here is pushed to the public repo.

## How to use during a music session

When starting a session for music work, point your AI client at this directory
(`workspace/`), not the repo root. Reasons:

- Loads music-first context, not dev/code context
- Project trackers in `projects/<name>/<name>.md` tell the AI where you left off
- `genres/` and `techniques/` give the AI lookup paths for production knowledge

The MCP server (`adj-*` tools) is registered globally with your AI client, so
all tools are available regardless of where you cd from.

## MCP tools available

The Ableton DJ MCP server exposes 24 tools, all prefixed `adj-`. Quick reference
(full reference: `../docs/Tools-Reference.md`):

| Domain     | Tools                                                                                          |
| ---------- | ---------------------------------------------------------------------------------------------- |
| Workflow   | `adj-connect`, `adj-context`                                                                   |
| Live Set   | `adj-read-live-set`, `adj-update-live-set`                                                     |
| Track      | `adj-read-track`, `adj-create-track`, `adj-update-track`                                       |
| Scene      | `adj-read-scene`, `adj-create-scene`, `adj-update-scene`                                       |
| Clip       | `adj-read-clip`, `adj-create-clip`, `adj-update-clip`, `adj-microsection-mute`, `adj-automate` |
| Device     | `adj-read-device`, `adj-create-device`, `adj-update-device`, `adj-browse`                      |
| Operations | `adj-delete`, `adj-duplicate`                                                                  |
| Control    | `adj-select`, `adj-playback`                                                                   |
| Generative | `adj-generate` (Euclidean rhythms, no Live API)                                                |

Always start a music session with `adj-connect` to verify the device is running
and check the current Live Set state.

## Working conventions

### Notation

- Bar|beat positions: `17|1` = bar 17, beat 1 (1-indexed)
- Durations: `t/4` = quarter note, `t1/8` = eighth, `t2:0` = 2 bars
- Notes: pitch BEFORE time position. `v100 t/8 C3 1|1,2.5,4` is correct.
  `1|1 v100 t/8 C3` silently drops the first note.

### Production guidance

When generating clips:

- Read existing tracks first (`adj-read-track include=devices,drum-map`) before
  assuming what's there
- Drum kits differ across tracks — never assume General MIDI mapping
- For audible test sounds, use a synth instrument (Operator, Drift). Empty Drum
  Racks produce silence.
- For sub-bass test pitches, use C3 not C1 (C1 = 32.7 Hz, hard to hear on most
  speakers)

### Project tracking

Each project in `projects/<name>/` should have `<name>.md` summarizing:

- Genre + BPM + key
- Current section being worked on
- Open decisions (sound choices, arrangement questions)
- Last session's progress

Keep it short. The file is the AI's memory of your project.

## Findings — load before non-trivial music work

`findings/INDEX.md` lists validated music techniques captured from prior
sessions (format: `[slug](path) [glob,glob] — summary`). Read INDEX before:

- Generating clips for a new section
- Picking sounds (instrument selection, velocity ranges)
- Designing arrangement structure
- Working in a specific genre for the first time in the session

For each INDEX line, match the bracketed globs against your task's keywords
(genre, section, instrument). Read the linked file ONLY if matched. Skip if no
match — the INDEX line itself is the lookup key.

## ALWAYS capture findings during sessions

This is the rule, not optional. Every music session produces knowledge — capture
it or lose it.

### What to capture

| Discovery type                                      | Where to capture                                   |
| --------------------------------------------------- | -------------------------------------------------- |
| MCP tool bug, missing feature, or workflow friction | **File a GitHub issue** in `gpulga/ableton-dj-mcp` |
| Tool quirk that changes how you use the tool        | Skip — covered by `docs/findings/` in the repo     |
| Music technique that worked in this session         | `workspace/findings/technique/<slug>.md`           |
| Genre-specific pattern from reference analysis      | `workspace/findings/genre/<slug>.md`               |
| Sound design recipe (pad, lead, bass, kick)         | `workspace/findings/sound-design/<slug>.md`        |

### When to capture

- After a clip you generated sounds clearly right (or clearly wrong, with the
  lesson)
- After you analyze a reference track and extract a pattern
- After an A/B test where one approach won
- After hitting friction with the tool that you'd want fixed

Don't wait until end of session. Capture immediately when validated — memory
fades, sessions get long.

### How to capture

Ask your AI client to write a finding following the format in
`workspace/findings/HOW-TO-WRITE.md` — scan the conversation, dedup against
INDEX, write only validated findings. (If you've set up your own automation for
this, e.g. a custom slash command, use that instead — there's no built-in one
shipped with this repo.)

For tool issues: ask the AI to file a GitHub issue with concrete reproduction
steps.

### Why this matters

You are the only user and primary source of music knowledge for this workspace.
The AI is the developer/executor, but cannot remember across sessions without
captured findings. This is the feedback loop:

```
session → discovery → captured finding → loaded next session → better output
session → tool friction → GitHub issue → tool improvement → smoother sessions
```

Without capture, every session starts from zero.

## Customize this file

Replace this section with your own preferences. Examples:

- Default genre and BPM for new projects
- Preferred reference artists
- House style rules ("always start drums with kick + open hat, then bass")
- Tools you want the AI to avoid (`adj-raw-live-api` is dev-only)

The AI reads this top-to-bottom. Anything you add here becomes part of every
session in this workspace.
