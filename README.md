# Ableton DJ MCP

```
    █████╗ ██████╗      ██╗    ███╗   ███╗ ██████╗██████╗
   ██╔══██╗██╔══██╗     ██║    ████╗ ████║██╔════╝██╔══██╗
   ███████║██║  ██║     ██║    ██╔████╔██║██║     ██████╔╝
   ██╔══██║██║  ██║██   ██║    ██║╚██╔╝██║██║     ██╔═══╝
   ██║  ██║██████╔╝╚█████╔╝    ██║ ╚═╝ ██║╚██████╗██║
   ╚═╝  ╚═╝╚═════╝  ╚════╝     ╚═╝     ╚═╝ ╚═════╝╚═╝
   ▁▂▃▄▅▆▇█▇▆▅▄▃▂▁▁▂▃▄▅▆▇█▇▆▅▄▃▂▁▁▂▃▄▅▆▇█▇▆▅▄▃▂▁▁▂▃▄▅▆▇█
```

[![CI](https://github.com/gpulga/ableton-dj-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/gpulga/ableton-dj-mcp/actions/workflows/ci.yml)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](./LICENSE)

**Let Claude (or any MCP-capable AI) control Ableton Live.**

Ask in plain language, and the AI reads and edits your open Live set in real
time: tracks, clips, MIDI notes, devices, scenes, automation, playback.

![An Ableton Live arrangement with drums, bass, leads, percussion, vocals and pads across Intro, Build, Drop and Breakdown sections](docs/images/arrangement.png)

_Song sections, tracks, clips and device chains: everything here is readable and
editable by the AI._

> "Set tempo to 124, add a Drift bass on a new track, and write a rolling
> 16th-note bassline in A minor for 8 bars."
>
> "Read my drum track and add ghost-note hi-hats with some velocity variation."
>
> "Duplicate scene 3, mute the kick for the first 4 bars, and automate the
> filter opening across the break."

It works on the whole set, from arrangement sections down to individual notes
and velocities in a clip:

![Session view with clips per track, and a percussion clip open in the note editor](docs/images/session-clip.png)

It ships with electronic-music knowledge (house, tech house, melodic techno,
indie dance and more), so genre and arrangement suggestions start from how those
styles are actually built.

## What it can do

24 tools, all prefixed `adj-`. Full parameters in the
[Tools Reference](./docs/Tools-Reference.md).

| Area          | Tool                    | What it does                                                                                  |
| ------------- | ----------------------- | --------------------------------------------------------------------------------------------- |
| **Session**   | `adj-connect`           | Connect to Live and load usage guidance. Always the first call                                |
|               | `adj-context`           | Persistent project memory, plus search of your sample folder                                  |
| **Live Set**  | `adj-read-live-set`     | Tempo, time signature, groove, Link, locators, tracks, scenes, mix levels                     |
|               | `adj-update-live-set`   | Set tempo, time signature, groove, Link, punch in/out, overdub, locators                      |
| **Tracks**    | `adj-read-track`        | Clips, devices, routing, mute/solo/arm, live output meters                                    |
|               | `adj-create-track`      | Add MIDI, audio or return tracks                                                              |
|               | `adj-update-track`      | Name, color, volume, pan, mute/solo/arm, routing, group folding                               |
| **Scenes**    | `adj-read-scene`        | Name, color, tempo, time signature                                                            |
|               | `adj-create-scene`      | Insert a scene anywhere                                                                       |
|               | `adj-update-scene`      | Rename, recolor or launch                                                                     |
| **Clips**     | `adj-read-clip`         | Notes, timing, loop, sample and warp info, play position                                      |
|               | `adj-create-clip`       | MIDI from bar\|beat notation or audio from a file, in Session or Arrangement                  |
|               | `adj-update-clip`       | Edit notes, transform velocity/pitch with expressions, loop, pitch, mute, legato              |
|               | `adj-microsection-mute` | Mute pitches across bar ranges to shape builds and drops                                      |
|               | `adj-automate` †        | Write, read or clear clip automation. Recipes: filter sweep, fades, sidechain pump, tape stop |
| **Devices**   | `adj-browse` †          | Search Live's library: instruments, effects, drum kits, presets, samples, packs, plugins      |
|               | `adj-create-device`     | Load native devices by name, or any library item by URI †                                     |
|               | `adj-read-device`       | Parameters, rack chains, drum pads and drum map                                               |
|               | `adj-update-device`     | Set any parameter by name or index, including inside racks                                    |
| **Editing**   | `adj-duplicate`         | Copy tracks, scenes, clips or devices, including Session → Arrangement                        |
|               | `adj-delete`            | Remove tracks, scenes, clips or devices                                                       |
| **Transport** | `adj-playback`          | Play/stop, loop, fire scenes and clips, record, capture MIDI, undo/redo, save                 |
|               | `adj-select`            | Point Live's UI at a track, scene or clip                                                     |
| **Generate**  | `adj-generate`          | Euclidean and named rhythms (tresillo, cinquillo, …) as ready-to-use notes                    |

† Uses the Python bridge, which `npm run setup` installs.

## Requirements

- **Ableton Live 12.3+** with **Max for Live** (Suite, or Standard + M4L)
- **Node.js 24+** ([nodejs.org](https://nodejs.org))
- **macOS or Windows**
- An MCP client: [Claude Code](https://claude.com/claude-code), Claude Desktop,
  Cursor, etc.

## Install (about 5 minutes)

```bash
git clone https://github.com/gpulga/ableton-dj-mcp.git
cd ableton-dj-mcp
npm run setup
```

No `npm install` or build step is needed. `setup` installs the Live device and
bridge, then prints the exact command to connect your AI client. Do the few
clicks it lists inside Live, then ask your AI: **"connect to ableton"**.

Full walkthrough and troubleshooting: **[docs/Setup.md](./docs/Setup.md)**.

### Let your AI install it

Open Claude Code (or another coding agent) in any folder and paste:

```
Install Ableton DJ MCP for me by following
https://github.com/gpulga/ableton-dj-mcp/blob/main/docs/Setup.md
```

The agent runs the commands. You do the clicks inside Live that it asks for.

## How it works

```
AI client ──stdio──▶ portal (Node) ──HTTP :3350──▶ Max for Live device ──▶ Live API
                                                   Python bridge (UDP) ──▶ Browser / automation
```

A Max for Live device on a track in your set runs the MCP server. A small portal
process connects your AI client to it. An optional Python remote script adds
things Max can't reach, like the browser and clip automation. Details:
[Architecture](./docs/contributing/Architecture.md).

<img src="docs/images/device-setup.png" alt="The Ableton DJ MCP device's Setup tab: server Running on port 3350" width="380">

_The device's Setup tab: server running on port 3350, ready for your AI to
connect._

## Docs

| You want to…                      | Read                                                             |
| --------------------------------- | ---------------------------------------------------------------- |
| Install and connect               | [Setup](./docs/Setup.md)                                         |
| See what the AI can do (24 tools) | [Tools Reference](./docs/Tools-Reference.md)                     |
| Write MIDI in the notation        | [Bar\|beat spec](./docs/specs/BarBeat-Spec.md)                   |
| Hack on the code                  | [CLAUDE.md](./CLAUDE.md) → [docs index](./docs/PROJECT_INDEX.md) |
| Report a bug / request a feature  | [Issues](https://github.com/gpulga/ableton-dj-mcp/issues)        |

## License

[GPL-3.0-or-later](./LICENSE).
