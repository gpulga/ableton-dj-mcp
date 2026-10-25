<img src="docs/images/banner.svg" alt="Ableton DJ MCP, made for music producers. A hand-drawn sketch of four decks and a mixer." width="100%">

[![CI](https://github.com/gpulga/ableton-dj-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/gpulga/ableton-dj-mcp/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/gpulga/ableton-dj-mcp?label=release)](https://github.com/gpulga/ableton-dj-mcp/releases/latest)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](./LICENSE)

## Vision

> **The supreme form of communication is music.**
>
> The final evolution of human communication is music. Music doesn't reach you
> through words alone. It speaks soul to soul, thought by thought, synapse by
> synapse.
>
> It is the most complete way to share something with someone: two people inside
> the same sound, at the same moment.

[Read the full vision →](./docs/Vision.md)

## What it is

**An AI studio partner for DJs and electronic music producers.** Describe the
idea, and Claude builds it in your open Ableton Live set: grooves, basslines,
sounds from your own sample libraries, filter sweeps, full arrangements. You
stay in the creative seat.

## Install

Paste this into Claude Code:

```
Install Ableton DJ MCP from https://github.com/gpulga/ableton-dj-mcp and connect
it to this coding agent, following docs/Setup.md. Show me the setup plan for
approval, then verify the installation.
```

The agent does the terminal part. You do two clicks inside Live when it asks.

<details>
<summary>Manual install, Claude Desktop, other clients</summary>

```bash
git clone https://github.com/gpulga/ableton-dj-mcp.git
cd ableton-dj-mcp
npm run setup
```

`setup` installs the Live device and bridge, then prints the exact command to
connect your AI client. No `npm install` or build step.

**Claude Desktop without a terminal:** grab the `.zip` and `.mcpb` from the
[latest release](https://github.com/gpulga/ableton-dj-mcp/releases/latest) and
follow
[these steps](./docs/Setup.md#quick-install-without-a-terminal-claude-desktop).
Cursor and other MCP clients work too: see [Setup](./docs/Setup.md).

</details>

**Requires** Ableton Live 12.3+ with Max for Live (12.4+ for sample loading),
Node.js 24+, macOS or Windows.

## Make music

Start any session with **"connect to ableton"**, then just ask:

> "Set the tempo to 124 and write a rolling 16th-note bassline in A minor, 8
> bars, single octave."

> "Find a 124 BPM bass loop in F minor in my sample libraries and load it on a
> new track."

> "Turn the groove in this top loop into MIDI and put the kick on a Drum Rack."

> "Sweep the filter from 200 Hz to 8 kHz across the build, then read back what
> Live shows."

> "Build an intro, an 8-bar reveal, a breakdown and a drop from these clips."

Cmd+Z undoes one AI action at a time.

![An Ableton Live arrangement with drums, bass, leads, percussion, vocals and pads across Intro, Build, Drop and Breakdown sections](docs/images/arrangement.png)

## What it can do

| Area            | Highlights                                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Write**       | MIDI in bar\|beat notation, transform expressions (`velocity += rand(-5, 5)`), Euclidean and named rhythms         |
| **Sound**       | Native devices and racks by name, presets by browser URI, samples into Simpler and drum pads, params in real units |
| **Your sounds** | Search your own sample libraries (Live's Places) by name, with BPM and key read from file names                    |
| **Rework**      | Turn an audio loop into MIDI (drums, melody, harmony), a Simpler, or a sliced Drum Rack                            |
| **Automate**    | Clip envelopes in Hz, dB and %, six curve shapes, recipes for sweeps, fades, dub throws and washouts               |
| **Arrange**     | Session and Arrangement, scenes, locators, duplicate to the timeline, with warnings when a write cuts another clip |
| **Perform**     | Play, stop, loop, fire scenes and clips, record, capture MIDI, undo and redo                                       |
| **Know-how**    | Genre guides for house, tech house, indie dance, melodic techno, afro house, techno, psytrance, loaded on demand   |

25 tools, all prefixed `adj-`. Full parameters:
[Tools Reference](./docs/Tools-Reference.md).

## How it works

```
Claude ──stdio──▶ portal ──HTTP :3350──▶ Max for Live device ──▶ Live API
                                         Python bridge (UDP) ──▶ browser, automation, conversions
```

A Max for Live device on any track runs the MCP server. A small portal connects
your AI client to it. A Python remote script reaches what Max can't: the
browser, clip envelopes, Live's audio conversions and undo history.
[Architecture →](./docs/contributing/Architecture.md)

## FAQ

<details>
<summary><b>Which version of Ableton Live do I need?</b></summary>

Live 12.3 or later with Max for Live: Suite, or Standard with the Max for Live
add-on. Loading samples into Simpler and drum pads needs Live 12.4. Intro and
Lite don't include Max for Live, so they can't run the device.

</details>

<details>
<summary><b>Which AI can I use?</b></summary>

Any MCP client. Claude Code is the main target and gets the smoothest setup.
Claude Desktop, Cursor and other MCP clients work too: see
[Setup](./docs/Setup.md).

</details>

<details>
<summary><b>Is it free?</b></summary>

Yes. Ableton DJ MCP is free and open source under GPL-3.0-or-later. You need
your own Ableton Live license and whatever plan your AI client requires.

</details>

<details>
<summary><b>Does the AI hear my music?</b></summary>

Not yet. It reads the set: tracks, clips, notes, devices, parameters, automation
and arrangement. It doesn't analyze audio. Listening to the mix is next on the
[Roadmap](./docs/Roadmap.md).

</details>

<details>
<summary><b>Can it mess up my project?</b></summary>

It only changes what you ask for, through tool calls you can see. With the Live
Browser Bridge installed, each AI action is one undo step, so Cmd+Z (Ctrl+Z on
Windows) reverts exactly the last change. Save your set before big edits, the
same as with any session.

</details>

<details>
<summary><b>Where does my music go?</b></summary>

The server runs on your computer, inside the Live device. Your AI client sees
what the tools return (track names, notes, device settings), the same as any
other conversation with it. Audio files stay on your machine.

</details>

<details>
<summary><b>Can it use my own samples?</b></summary>

Yes. It searches the folders you've added to Live's Places, reading BPM and key
from file names, and can load any sample into a Simpler, a drum pad or an audio
clip.

</details>

<details>
<summary><b>What is the Live Browser Bridge?</b></summary>

A small Python remote script that `npm run setup` installs alongside the device.
It reaches the parts of Live that Max for Live can't: the browser, clip
automation, audio-to-MIDI conversion and undo grouping. Enable it once under
Live's Preferences → Link, Tempo & MIDI → Control Surface.

</details>

<details>
<summary><b>macOS or Windows?</b></summary>

Both. Linux isn't supported, since Ableton Live doesn't run there.

</details>

<details>
<summary><b>How do I update?</b></summary>

```bash
cd ableton-dj-mcp
git pull
npm run setup
```

Then quit and reopen Live, so it loads the new bridge.

</details>

<details>
<summary><b>Something isn't working</b></summary>

Check [Troubleshooting](./docs/Setup.md#troubleshooting), then
[open an issue](https://github.com/gpulga/ableton-dj-mcp/issues) or ask in
[Discussions](https://github.com/gpulga/ableton-dj-mcp/discussions).

</details>

## Docs

[Setup](./docs/Setup.md) · [Tools](./docs/Tools-Reference.md) ·
[Notation](./docs/specs/BarBeat-Spec.md) · [Vision](./docs/Vision.md) ·
[Roadmap](./docs/Roadmap.md) · [Contributing](./CLAUDE.md) ·
[Discussions](https://github.com/gpulga/ableton-dj-mcp/discussions)

## License

Free and open source under [GPL-3.0-or-later](./LICENSE).
