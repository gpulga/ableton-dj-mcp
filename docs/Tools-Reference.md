# Tools Reference

Canonical catalog of all 26 `adj-*` tools. Other docs link here instead of
duplicating. Read the `.def.ts` files for the full Zod schemas.

---

## Workflow

### `adj-connect`

Connect to Ableton Live. Call this first before any other tool. No parameters.

### `adj-context`

Read and write persistent project memory, saved with the Live Set, as a set of
small facts. Also browses the configured sample folder. Memory is off until
**Use project memory** is ticked in the device's Context tab; until then `read`,
`write` and `forget` report it as disabled.

- `read` — the fact index (`facts: [{ id, about }]`); with `fact`, that fact's
  `id`, `about` and `content`
- `write` — create or replace one fact: `fact` (kebab-case id, default `notes`),
  `content`, and `about` (one-line description, required when creating). Other
  facts are untouched. Refused if the whole store would exceed 10,000 chars
- `forget` — remove the fact named by `fact`
- `search` — list audio samples in the configured `sampleFolder` (set in config)
  as a tree with metadata

Memory is plain text in the Context tab, one section per fact, so it can also be
edited by hand. A section opens with a header line `## <id>: <about>`. Text
before the first header (all memory written before facts existed) is the fact
`notes`. Once memory has at least one header, `adj-connect` returns
`memoryFacts` (the index) instead of the full `memoryContent`.

### `adj-guide`

Genre, production and transform guidance, loaded on demand so it doesn't cost
tokens on every `adj-connect`. `adj-connect` returns the topic list; fetch a
topic before that kind of work. Read-only, no Live access.

- `topic` — `genres`, `drums`, `bass`, `melodic`, `arrangement`,
  `fx-automation`, `velocity`, or `transforms` (the full transform-expression
  reference: selectors, waveforms, ramp/curve, variables)

---

## Live Set

### `adj-read-live-set`

Read the current Live Set overview: name, tempo, time signature, groove amount,
Ableton Link status, punch in/out and overdub state, tracks, scenes.

- `include: ["tracks", "scenes", "locators"]` for details

### `adj-update-live-set`

Update Live Set properties: tempo, time signature, groove amount, Ableton Link
(enable/disable, force beat time), punch in/out (`punchIn`/`punchOut`),
arrangement overdub (`overdub`), name, locators.

---

## Track

### `adj-read-track`

Read track properties: name, color, routing, mute/solo/arm state, group/fold
state.

- `include: ["session-clips", "arrangement-clips", "devices", "routings"]`
- `trackIndex` — zero-based track index
- `isFrozen` — included (true) when the track is frozen
- `include: ["meters"]` — live output meter levels (`meterLeft`, `meterRight`,
  `meterLevel`, each 0.0-1.0); reads 0 while the transport is stopped. Works on
  regular, return, and master tracks. Combine `adj-read-live-set` with
  `include: ["tracks", "meters"]` for a one-call mix snapshot of every track's
  levels

### `adj-create-track`

Create a new MIDI, audio, or return track.

- `type`: `"midi"` | `"audio"` | `"return"`
- `trackIndex` — where to insert (defaults to end)
- `convert` + `fromClip` — build a new track from an audio clip with Live's own
  conversions (needs the Live Browser Bridge). `fromClip` is a clip id or a
  session slot (`"0/3"`). Returns the new track's `trackIndex`; other params are
  ignored.
  - `"drums"` / `"melody"` / `"harmony"` — MIDI clip of the audio's notes (lift
    a groove from a drum loop, a bassline or chords from a sample)
  - `"simpler"` — the sample loaded into a Simpler on a new MIDI track
  - `"drum-rack"` — the sample sliced onto Drum Rack pads

### `adj-update-track`

Update track properties: name, color, volume, pan, mute, solo, arm, routing,
folded (group tracks only).

---

## Scene

### `adj-read-scene`

Read scene properties: name, color, tempo, time signature.

- `sceneIndex` — zero-based

### `adj-create-scene`

Create a new scene at a given index.

### `adj-update-scene`

Update scene name, color, tempo, or time signature. To launch a scene, use
`adj-playback` with `action: "play-scene"`.

---

## Clip

### `adj-read-clip`

Read clip content and properties.

- Session clip: `slot: "trackIndex/sceneIndex"` (e.g., `"0/3"`)
- Arrangement clip: `trackIndex` + `arrangementStart`
- `include: ["notes", "timing", "sample", "warp"]` for details
- `playingPosition` in the response while the clip is playing
- `notes` include also surfaces `velocityAmount` (MIDI, when scaled from 1.0)
- `sample` include also surfaces `pitchFine` (cents, when non-zero) and
  `ramMode` (when true)

### `adj-create-clip`

Create MIDI or audio clips.

- Session: `slot: "0/0"` or multiple `"0/0,0/2"`
- Arrangement: `trackIndex` + `arrangementStart` (bar|beat format: `"5|1"`)
- MIDI notes: barbeat notation string (see `docs/specs/BarBeat-Spec.md`)
- Audio: `sampleFile: "/absolute/path/to/sample.wav"`

### `adj-update-clip`

Update existing clip content or properties.

- Add/remove/transform notes via barbeat notation
- Update name, color, loop settings, volume, pitch (`pitchShift` coarse,
  `pitchFine` cents), `legato`, `muted`, `ramMode`, `velocityAmount` (MIDI)
- `duplicateLoop: true` doubles the clip's loop length in-place
- `split: "33|1, 41|1"` splits arrangement clips at song positions, the same
  coordinates as `arrangementStart`. Each clip splits at the positions inside
  it; a clip with none inside gets a warning
- `start`, `length` and `firstStart` take one value for all clips, or a
  comma-separated value per id
- Transform expressions: `velocity *= 0.8`, `pitch += 12`

### `adj-microsection-mute`

Silence pitches in bar ranges via velocity=0 transforms. Encodes a
4-microsection arc (intro/lift/peak/resolution) without per-element transform
calls.

- `clipIds` — comma-separated clip ID(s)
- `microsections` — multi-line mute map:
  `'<barStart>-<barEnd>: <pitch1>, <pitch2>, ...'` per line; `all` mutes the
  whole clip across the range; an empty list means nothing muted

### `adj-automate`

Write, read, or clear parameter automation envelopes inside a session clip.
Arrangement clips are rejected — Live's envelope API raises "Not a session clip"
even from Python. Values are normalized 0..1 across the parameter's range, or
display values with a unit (see `points`). Requires the Live Browser Bridge
(`npm run install:bridge`) — the clip envelope API is Python-only (see
`docs/findings/dev/device/clip-envelope-api-python-only.md`).

- `action`: `"write"` (default) | `"read"` | `"clear"` | `"clear-all"`
- `clipId` or `slot` — target clip
- `devicePath` — device to automate (`"t0/d1"`, rack chains like
  `"t0/d0/c1/d0"`); must be on the clip's track. Omit for mixer params
- `paramName` — parameter name as shown in Live (case-insensitive). Mixer
  params: `"Volume"`, `"Pan"`, `"Send A"`..`"Send L"`
- `points` — `'<bar|beat>:<value>'` pairs, comma- or newline-separated
  (`"1|1:0, 9|1:1"`); `"1|1"` = clip start; times ascending. A value is 0..1 or
  the param's display value with a unit: `Hz`, `kHz`, `dB`, `%`, `ms`, `s`
  (`"1|1:200Hz, 9|1:8kHz"`). Units are mapped through Live's own value labels,
  so a log filter or a dB fader lands where the label says (0..1 does not: 0.05
  on a 20 Hz–20 kHz filter is ~28 Hz, not 1 kHz). Values outside the param's
  range clamp. The write result's `displays` lists what Live shows at each given
  point.
- `shape` — interpolation between points: `linear` (default), `exponential`,
  `logarithmic`, `sine`, `s-curve`, `step` (hold values)
- `recipe` — named move generating points over the clip's play region (overrides
  `points`)
- `clear` — on write, wipe the parameter's existing envelope first
- Reads sample the envelope on a 0.25-beat grid (Live exposes no breakpoint
  list) and return `'<bar|beat>:<value>'` strings

Recipe targets:

| Recipe                                 | Default target                  |
| -------------------------------------- | ------------------------------- |
| `filter-sweep-up`, `filter-sweep-down` | requires devicePath + paramName |
| `tape-stop`                            | requires devicePath + paramName |
| `volume-fade-in`, `volume-fade-out`    | mixer Volume                    |
| `sidechain-pump`                       | mixer Volume                    |
| `dub-throw`, `washout`                 | Send A                          |

---

## Device

### `adj-read-device`

Read device parameters and chain structure.

- `devicePath` — path like `"0/0"` (track/device) or `"0/0/chain/0/0"` for rack
  chains
- `include: ["params", "chains", "drum-map", "drum-pads"]`

### `adj-create-device`

Load a device onto a track by name, or by browser URI (via the bridge).

- `deviceName` — Ableton native device name (see `src/tools/constants.ts`)
- `path` — insertion path, e.g. `"t0"`, `"t0/d1"`, `"t0/d0/c0"` (`t`=track,
  `d`=device, `c`=chain — bare `"trackIndex/deviceIndex"` is rejected)
- `browserUri` — load the exact item from `adj-browse` (e.g., a specific preset
  or User Library file). Pair with `deviceName: "Drum Rack"` to insert a rack
  and load a kit into it in one call. Requires the Live Browser Bridge — install
  with `npm run install:bridge`.

### `adj-browse`

Walk Ableton Live's library tree and return loadable items with their stable
browser URIs. Use the URIs with `adj-create-device --browserUri` to load.

- `category` — one of `instruments`, `audio_effects`, `midi_effects`, `drums`,
  `sounds`, `samples`, `clips`, `current_project`, `user_library`, `packs`,
  `plugins`, `max_for_live` (omit to list available categories)
- `path` — slash-separated names walked under the category root (e.g.,
  `"Synths/Operator"`)
- `search` — case-insensitive substring filter applied to children
- `recursive` — with `search`, match anywhere under `path` instead of direct
  children only. Each hit carries its folder `path`, plus `bpm` and `key` parsed
  from sample names that follow pack naming (`Bass_Loop_124_Fm.wav` →
  `bpm: 124, key: "Fm"`). Example:
  `category: "user_folders", search: "kick", recursive: true` finds kicks across
  all your own sample libraries.
- `user_folders` is Live's Places: folders you added to the browser sidebar
- `depth` — child levels to expand inline (default 1, max 3)
- `limit` — top-level items to return (default 100, max 500)

Requires the Live Browser Bridge Python sidecar — install with
`npm run install:bridge`, then enable **AbletonDjMcp** under Live's Preferences
→ Link/Tempo/MIDI → Control Surface. The bridge is the only path to
`Application.Browser`; Max-for-Live JavaScript cannot reach it. See
`docs/specs/Browser-Bridge-Spec.md` and
`docs/findings/dev/browser/m4l-no-browser-api.md`.

### `adj-update-device`

Update device parameters by name or index.

- Writing a param whose automation or clip envelope is playing makes Live
  override it (Live's Re-Enable Automation button lights up) and the automation
  stops playing. The call warns when that happens; `adj-read-live-set` shows
  `automationOverridden: true` until `adj-playback` `re-enable-automation`.

- `params` — `name=value` per line, in display units (`Filter Freq=1200`)
- Supports chain path for rack devices
- Simpler samples (Live 12.4+): `sample=/abs/path/kick.wav` loads a file into a
  Simpler, `gainDb=-6` sets its gain. Both match the `sample`/`gainDb` fields
  `adj-read-device` returns. On a drum pad or chain path (`t0/d0/pC1`) params go
  to the Simpler in that pad, so a kit is: `adj-create-device` Simpler at each
  pad path, then `adj-update-device` `sample=` per pad. Multi-sample Simpler is
  not supported (Live API limit).

---

## Operations

### `adj-delete`

Delete a track, scene, clip, or device.

- `type`: `"track"` | `"scene"` | `"clip"` | `"device"`
- Pass the appropriate index/path

### `adj-duplicate`

Duplicate a track, scene, clip, or device.

- Same `type` options as delete
- Optional `targetIndex` for where to place the copy
- Arrangement writes (`adj-create-clip`/`adj-duplicate` into the arrangement)
  overwrite whatever is in that range, like Live does. Each clip that was
  deleted, shortened or split comes back as a warning naming its position.
- `arrangementLength` longer than a looping session clip lays it down as one
  arrangement clip that repeats its loop, keeping warp markers and envelopes.
  Arrangement or unlooped sources are repeated as separate clips instead (the
  Live API can't stretch an arrangement clip); more than 64 repeats is refused

---

## Control

### `adj-select`

Select tracks, scenes, or clips in Live's UI.

- Useful for directing user attention or preparing for operations

### `adj-playback`

Control transport, session clips, and Live set history.

- `action`:
  - `"play-arrangement"` — play from `startTime`
  - `"update-arrangement"` — modify loop (`loop`, `loopStart`, `loopEnd`)
  - `"play-scene"` — fire all clips in a scene (`sceneIndex`)
  - `"play-session-clips"` — fire clip(s) by `ids` or `slots`
  - `"stop-session-clips"` — stop clip(s) by `ids` or `slots`
  - `"stop-all-session-clips"` — stop every session clip
  - `"stop"` — stop transport
  - `"undo"` — undo last Live set action
  - `"redo"` — redo last undone action
  - `"save"` — save Live set to disk
  - `"back-to-arranger"` — clear session override so arrangement resumes
  - `"capture-midi"` — capture buffered MIDI into a clip retroactively
  - `"capture-scene"` — snapshot playing session clips into a new scene
  - `"record"` — toggle arrangement record mode
  - `"re-enable-automation"` — re-engage automation overridden by manual edits
  - `"nudge-tempo"` — brief tempo bump for beat matching (requires `nudge`)
- Response includes `playing`, `currentTime`, optional `arrangementLoop`.
- For `"undo"` / `"redo"` / `"save"`, response also includes `canUndo` and
  `canRedo` booleans — check these before calling undo/redo to avoid no-ops.
- With the Live Browser Bridge installed, each tool call that changes the Set is
  one undo step, so `"undo"` (or Cmd/Ctrl+Z) reverts exactly the last tool call.
  Without the bridge, Live groups everything since the user last touched Live
  into one step.
- For `"record"`, response includes `recording: boolean` reflecting the new
  record-mode state.

### `adj-listen`

Hear the mix by measurement: record N bars of the live output (or one track) in
real time, or read an audio file, then analyze it. Runs in Node; recording needs
no bridge.

- `bars` — bars to record (1-64, default 8). With `file`, bars from its start
  (default: the whole file).
- `trackIndex` — record that track's output (post mixer) instead of the master.
- `startTime` / `startLocator` — play the arrangement from there and record from
  that exact position. Omit to record whatever is playing now (starts on the
  next launch-quantization boundary).
- `mute` — comma-separated track indexes muted during the recording and restored
  after. Capture with and without a track to isolate its contribution.
- `file` — absolute path to analyze instead of recording. WAV/AIFF decode
  natively; mp3/flac/m4a need ffmpeg installed. Without `tempo`, tempo and the
  first beat are detected from the audio (85-175 BPM).
- `tempo` — bar-grid tempo for `file` (default: detected).
- `spectrogram` — include the spectrogram image (default true).
- `keep` — keep the recording track and clip (default: deleted afterwards).
- Response: `source` (what was recorded, `songStart`, the WAV path), `summary`
  (integrated LUFS, loudness range, true peak, band balance sub..air,
  brightness, L/R correlation, kick/hat-range hit counts, key estimate), a
  per-bar table (4-bar phrases past 64 bars), loudness `jumps` of 3 LU or more,
  and a log-frequency spectrogram PNG with bar lines.
- Recording uses a temporary audio track that records from Resampling into a
  session slot. That way playing session clips are never printed into the
  arrangement. Recording takes real time: 8 bars at 124 BPM is about 16 s.
- "kick" and "hat" columns count onsets in the 30-150 Hz and 6-16 kHz ranges. A
  rolling bassline also counts as kick-range hits.

---

## Generative

### `adj-generate`

Generate algorithmic note patterns. Returns notes in bar|beat notation that plug
directly into `adj-create-clip`'s `notes` param. Pure computation, no Live API
calls.

- `algorithm`: `"euclidean"` — Bjorklund even-distribution of pulses
- `pattern` — named pattern overriding `steps` / `pulses` / `rotation`
  (tresillo, cinquillo, etc.)
- `pitch`, `steps`, `pulses`, `rotation`, `bars`, `velocity`, `duration`

---

## Dev-only

### `adj-raw-live-api` _(requires `ENABLE_RAW_LIVE_API=true`)_

Execute raw Live API calls. For debugging and exploration only.

---

## Common patterns

### Session vs Arrangement

Session clips use `slot: "trackIndex/sceneIndex"`. Arrangement clips use
`trackIndex` + `arrangementStart` (bar|beat string).

### Bar|beat positions

Format: `"bar|beat"` where beat is 1-based.

- `"1|1"` = start of bar 1
- `"5|3"` = bar 5, beat 3
- `"17|1.5"` = bar 17, beat 1.5

### Note notation (barbeat)

See `docs/specs/BarBeat-Spec.md` for the full grammar. Quick examples:

```
C4:t/8         # C4, eighth note
C4:t/4 E4 G4   # C major chord, quarter notes
@2=            # repeat previous bar 2 times
```

### Read tool include system

All read tools return minimal data by default. Pass `include` to add details.
See `docs/contributing/Read-Tool-Includes.md` for the full include options per
tool.
