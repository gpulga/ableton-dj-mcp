---
title: session-slot-capture-exact
domain: dev
validated: 2026-10-25
evidence: live adj-listen runs on a 19-track set 2026-10-25 (8/8 at target)
---

## Fact

Firing an empty session slot on an armed Resampling track while the transport is
stopped starts playback and recording together at the start marker, with no
launch-quantization wait. `adj-playback stop` resets the marker to 1|1, so set
it last (`update-arrangement` + `startTime`). Even then the marker can race the
fire, so verify where the take began. While recording, `adj-read-clip` reports
`recording: true` and `playingPosition` = recorded length.

## Evidence

```
stop -> update-arrangement startTime 41|1 -> fire: songStart 41|1 (8/8 runs)
play-arrangement 41|1 -> stop -> fire: songStart 1|1 on 2 of 3 runs
```

## Apply when

Recording audio through the API. Prefer session-slot recording to arrangement
record, which also prints playing session clips into the arrangement.
