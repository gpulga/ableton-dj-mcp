// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

// Full transform-expression reference, served on demand by adj-guide topic
// "transforms" instead of on every adj-connect (#334).

export const transformsSkills = `
### Transforms

Add \`transforms\` parameter to create-clip or update-clip.

**Syntax:** \`[selector:] parameter operator expression\` (one per line)
- **Selector:** pitch and/or time filter, followed by \`:\` - e.g., \`C3:\`, \`1|1-2|4:\`, \`C3 1|1-2|4:\`, \`1|1-2|4 C3:\`
- **Pitch filter:** \`C3\` (single) or \`C3-C5\` (range) - omit for all pitches
- **Time filter:** \`1|1-2|4\` (bar|beat range, inclusive, matches note start time)
- **MIDI parameters:** velocity (1-127; <=0 deletes note), pitch (0-127), timing (beats), duration (beats; <=0 deletes note), probability (0-1), deviation (-127 to 127)
- **Audio parameters:** gain (-70 to 24 dB), pitchShift (-48 to 48 semitones)
- **Operators:** \`+=\`, \`-=\` (add/subtract), \`*=\`, \`/=\` (scale current value), \`=\` (set)
- **Expression:** arithmetic (+, -, *, /, %) with numbers, waveforms, math functions, and current values
- **Math functions:** round(x), floor(x), ceil(x), abs(x), clamp(val,min,max), wrap(val,min,max) (wrap to inclusive range), reflect(val,min,max) (bounce within inclusive range), min(a,b,...), max(a,b,...), pow(base,exp), quant(pitch) (snap to Live Set scale; no-op if no scale), step(pitch, offset) (move by offset scale steps; even distribution for waveforms)

**Waveforms** (-1.0 to 1.0, per note position; once for audio):
- \`cos(period)\`, \`square(period)\` - start at peak (1.0); \`sin(period)\`, \`tri(period)\`, \`saw(period)\` - start at zero, rise to peak
  - All accept optional phase offset: \`cos(1t, 0.25)\`. square adds pulse width: \`square(1t, 0, 0.75)\`
- \`rand([min], [max])\` - random value (no args: -1 to 1, one arg: 0 to max, two: min to max)
- \`seq(a, b, ...)\` - cycle through values by note.index (MIDI) or clip.index (audio)
- \`choose(a, b, ...)\` - random selection from arguments
- \`ramp(start, end)\` - linear interpolation; reaches end value at time range end (or clip end)
- \`curve(start, end, exp)\` - exponential (exp>1: slow start, exp<1: fast start); reaches end value at time range end
- For ramp/curve, end the time filter on the last note's beat position so it reaches its end value. In 4/4: last 8th=N|4.5, last 16th=N|4.75
- Waveform period: \`1t\` = 1 beat cycle, \`1:0t\` = 1 bar cycle, \`0:2t\` = 2 beat cycle
- \`sync\` keyword (last arg on periodic waves) syncs phase to arrangement timeline instead of clip start

**Variables:** \`note.pitch\`, \`note.velocity\`, \`note.start\`, \`note.duration\`, \`note.probability\`, \`note.deviation\`, \`note.index\` (time-ordered), \`note.count\` (MIDI), \`audio.gain\`, \`audio.pitchShift\` (audio), \`clip.duration\`, \`clip.index\` (order of ids), \`clip.count\`, \`clip.position\` (arrangement only), \`clip.barDuration\` (all clips)

\`\`\`
velocity += 20 * cos(2t)       // cycle every 2 beats
velocity += 20 * cos(4:0t, sync) // continuous across clips
velocity += 20 * square(2t, 0, cos(1:0t) * 0.25 + 0.5) // dynamic PWM
timing += 0.05 * rand()        // humanize timing
1|1-4|4.75: velocity = ramp(40, 127)  // crescendo over 4 bars (16th grid)
C1-C2: velocity += 30          // accent bass notes
1|1-2|4: velocity = 100        // forte in bars 1-2
velocity = seq(100, 60, 80, 60) // cycle accents per note
Gb1: pitch = seq(Gb1, Gb1, Gb1, Gb1, Ab1) // every 5th closed hat → open hat
velocity = 60 + note.index * 5 // sequential crescendo
pitch += clip.index * 7        // stacked fifths across clips
gain = audio.gain - 6          // reduce audio clip by 6 dB
pitch = quant(note.pitch + 7)  // transpose up fifth, snap to scale
pitch = step(note.pitch, sin(4t) * 7)  // oscillate ±7 scale steps smoothly
pitch = wrap(note.pitch + 5, C3, C5)  // transpose up 5, wrap within C3-C5
pitch = reflect(note.pitch + 5, C3, C5)  // transpose up 5, bounce within C3-C5
velocity *= 0.5                // halve all velocities
C1-C2: duration /= 2           // halve duration of bass notes
\`\`\`

\`+=\` compounds on repeated calls; \`=\` is idempotent. \`*=\`/\`/=\` scale the current value (\`timing *=\` scales absolute note position). Use update-clip with only transforms to modify existing notes.
MIDI params ignored for audio clips, vice versa.
`;
