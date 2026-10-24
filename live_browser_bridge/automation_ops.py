# Ableton DJ MCP - Live Browser Bridge
# Copyright (C) 2026 Gabriel Pulga
# SPDX-License-Identifier: GPL-3.0-or-later

"""Pure helpers for clip automation-envelope ops.

Functions here take a ``song`` object (Live.Song.Song) and plain-dict args.
They never touch sockets or queues, which makes them easy to unit-test with a
stubbed object graph (see tests/test_automation_ops.py).

Why this lives in the Python bridge at all: ``Clip.automation_envelope``,
``Clip.create_automation_envelope``, ``AutomationEnvelope.insert_step`` and
``AutomationEnvelope.value_at_time`` are internal Python-API-only — the Max
for Live LOM whitelist does not expose them to JS. See
docs/findings/dev/device/clip-envelope-api-python-only.md."""

import math
import re

# Envelope times land on a breakpoint grid; two floats within this distance
# refer to the same arrangement position.
ARRANGEMENT_MATCH_EPSILON = 0.01

DEFAULT_READ_STEP_BEATS = 0.25
MAX_READ_POINTS = 257

# insert_step with a zero-length step is a silent no-op, so every step needs
# real width. Points are written as contiguous steps (duration = gap to the
# next point); the last point gets this fallback width.
FINAL_STEP_DURATION_BEATS = 0.25


class AutomationOpError(Exception):
    """Raised by ops when args don't resolve or the Live API misbehaves."""


def resolve_clip(song, clip_ref):
    """Resolve a clip from ``{"trackIndex": i, "sceneIndex": j}`` (session)
    or ``{"trackIndex": i, "arrangementStartBeats": b}`` (arrangement)."""
    track = _resolve_track(song, clip_ref)
    scene_index = clip_ref.get("sceneIndex")
    if scene_index is not None:
        return _session_clip(track, int(scene_index)), track

    start_beats = clip_ref.get("arrangementStartBeats")
    if start_beats is None:
        raise AutomationOpError(
            "clip ref needs sceneIndex or arrangementStartBeats"
        )
    return _arrangement_clip(track, float(start_beats)), track


def _resolve_track(song, clip_ref):
    track_index = clip_ref.get("trackIndex")
    if track_index is None:
        raise AutomationOpError("clip ref needs trackIndex")
    tracks = list(song.tracks)
    index = int(track_index)
    if index < 0 or index >= len(tracks):
        raise AutomationOpError(
            "trackIndex %d out of range (%d tracks)" % (index, len(tracks))
        )
    return tracks[index]


def _session_clip(track, scene_index):
    slots = list(track.clip_slots)
    if scene_index < 0 or scene_index >= len(slots):
        raise AutomationOpError(
            "sceneIndex %d out of range (%d scenes)" % (scene_index, len(slots))
        )
    slot = slots[scene_index]
    if not getattr(slot, "has_clip", False) or slot.clip is None:
        raise AutomationOpError("no clip at scene %d" % scene_index)
    return slot.clip


def _arrangement_clip(track, start_beats):
    clips = list(getattr(track, "arrangement_clips", ()))
    for clip in clips:
        if abs(float(clip.start_time) - start_beats) < ARRANGEMENT_MATCH_EPSILON:
            return clip
    raise AutomationOpError(
        "no arrangement clip starting at beat %s (%d clips on track)"
        % (start_beats, len(clips))
    )


def resolve_parameter(track, target):
    """Resolve a DeviceParameter from a target dict.

    Device: ``{"kind": "device", "chain": [{"type": "d"|"c"|"rc", "index": n},
    ...], "paramName": "..."}`` — chain alternates devices and (return) chains.
    Mixer: ``{"kind": "mixer", "param": "volume"|"panning"|"send",
    "sendIndex": n}``."""
    kind = target.get("kind")
    if kind == "mixer":
        return _mixer_parameter(track, target)
    if kind == "device":
        device = _walk_device_chain(track, target.get("chain") or [])
        return _parameter_by_name(device, target.get("paramName"))
    raise AutomationOpError("unknown target kind: %s" % kind)


def _mixer_parameter(track, target):
    mixer = track.mixer_device
    param = target.get("param")
    if param == "volume":
        return mixer.volume
    if param == "panning":
        return mixer.panning
    if param == "send":
        sends = list(mixer.sends)
        index = int(target.get("sendIndex", -1))
        if index < 0 or index >= len(sends):
            raise AutomationOpError(
                "sendIndex %d out of range (%d sends)" % (index, len(sends))
            )
        return sends[index]
    raise AutomationOpError("unknown mixer param: %s" % param)


def _walk_device_chain(track, chain):
    """Walk alternating device/chain segments starting from track.devices."""
    node = track
    for segment in chain:
        seg_type = segment.get("type")
        index = int(segment.get("index", -1))
        if seg_type == "d":
            node = _child_at(node, "devices", index, "device")
        elif seg_type == "c":
            node = _child_at(node, "chains", index, "chain")
        elif seg_type == "rc":
            node = _child_at(node, "return_chains", index, "return chain")
        else:
            raise AutomationOpError("unknown path segment type: %s" % seg_type)
    if node is track:
        raise AutomationOpError("device chain is empty")
    return node


def _child_at(node, attr, index, label):
    children = list(getattr(node, attr, ()))
    if index < 0 or index >= len(children):
        raise AutomationOpError(
            "%s index %d out of range (%d %ss)" % (label, index, len(children), attr)
        )
    return children[index]


def _parameter_by_name(device, name):
    """Case-insensitive match on parameter name, also matching the rack-macro
    form "Name (OriginalName)" the TS side formats for renamed macros."""
    if not name:
        raise AutomationOpError("paramName is required for device targets")
    needle = name.lower()
    for param in device.parameters:
        param_name = (getattr(param, "name", "") or "").lower()
        if param_name == needle:
            return param
        original = getattr(param, "original_name", "") or ""
        if original and original.lower() != param_name:
            formatted = "%s (%s)" % (param_name, original.lower())
            if formatted == needle:
                return param
    raise AutomationOpError(
        "parameter not found on device: %s" % name
    )


def denormalize(param, value01):
    """Map a normalized 0..1 tool value onto the parameter's native range.

    ``insert_step`` takes native-range values (param.min .. param.max); this
    is the single place that assumption lives, so it can be flipped to a
    passthrough if in-Live verification ever proves otherwise."""
    lo = float(param.min)
    hi = float(param.max)
    clamped = min(max(float(value01), 0.0), 1.0)
    return lo + clamped * (hi - lo)


def normalize(param, raw_value):
    """Inverse of :func:`denormalize` for read-side sampling."""
    lo = float(param.min)
    hi = float(param.max)
    if hi == lo:
        return 0.0
    return (float(raw_value) - lo) / (hi - lo)


# Display values as Live prints them ("1.20 kHz", "-12.0 dB", "25 %",
# "250 ms", "-inf dB") and as callers write them ("1200Hz", "-12dB").
_DISPLAY_RE = re.compile(
    r"^\s*(-?(?:\d+(?:\.\d*)?|\.\d+|inf))\s*(khz|hz|db|%|ms|s)\s*$",
    re.IGNORECASE,
)
_UNIT_SCALE = {"khz": ("hz", 1000.0), "hz": ("hz", 1.0), "db": ("db", 1.0),
               "%": ("%", 1.0), "ms": ("s", 0.001), "s": ("s", 1.0)}
DISPLAY_SEARCH_STEPS = 40


def parse_display(text):
    """``(value, unit)`` for a display string, unit normalized to hz/db/%/s,
    or None when the text isn't a number with a known unit."""
    match = _DISPLAY_RE.match(str(text))
    if match is None:
        return None
    unit, scale = _UNIT_SCALE[match.group(2).lower()]
    return float(match.group(1)) * scale, unit


def display_to_normalized(param, text):
    """The 0..1 value at which ``param`` displays ``text`` (e.g. "1200Hz"),
    found by binary search over Live's own value-to-label mapping, so log
    filters and dB faders land where the label says. Clamps to the range."""
    wanted = parse_display(text)
    if wanted is None:
        raise AutomationOpError(
            "can't read %r as a value with a unit (Hz, kHz, dB, %%, ms, s)" % text
        )
    lo, hi = float(param.min), float(param.max)
    at_lo, at_hi = _display_at(param, lo), _display_at(param, hi)
    if at_lo is None or at_hi is None or at_lo[1] != wanted[1]:
        shown = param.str_for_value(lo)
        raise AutomationOpError(
            "%s shows values like %r, so %r can't be mapped onto it"
            % (getattr(param, "name", "param"), shown, text)
        )
    target = wanted[0]
    rising = at_hi[0] >= at_lo[0]
    if (target <= at_lo[0]) == rising:
        return 0.0
    if (target >= at_hi[0]) == rising:
        return 1.0
    a, b = lo, hi
    for _ in range(DISPLAY_SEARCH_STEPS):
        mid = (a + b) / 2.0
        shown = _display_at(param, mid)
        if shown is None:
            break
        if (shown[0] < target) == rising:
            a = mid
        else:
            b = mid
    return normalize(param, (a + b) / 2.0)


def displays_for(param, values01):
    """What Live displays at each normalized value: a read-back of a write."""
    return [param.str_for_value(denormalize(param, v)) for v in values01]


def _display_at(param, raw):
    parsed = parse_display(param.str_for_value(raw))
    if parsed is None or math.isnan(parsed[0]):
        return None
    return parsed


def write_points(clip, param, points, clear_first=False):
    """Write ``[[timeBeats, value01], ...]`` onto the param's clip envelope.

    Returns a result dict for the bridge reply."""
    if not points:
        raise AutomationOpError("points must not be empty")
    if clear_first:
        clip.clear_envelope(param)
    envelope = clip.automation_envelope(param)
    created = False
    if envelope is None:
        envelope = clip.create_automation_envelope(param)
        created = True
    if envelope is None:
        raise AutomationOpError(
            "could not create automation envelope (unsupported clip?)"
        )
    for i, (time_beats, value01) in enumerate(points):
        if i + 1 < len(points):
            duration = float(points[i + 1][0]) - float(time_beats)
        else:
            duration = FINAL_STEP_DURATION_BEATS
        envelope.insert_step(
            float(time_beats), duration, denormalize(param, value01)
        )
    return {
        "pointCount": len(points),
        "paramName": getattr(param, "name", ""),
        "paramMin": float(param.min),
        "paramMax": float(param.max),
        "envelopeCreated": created,
        "clipLengthBeats": float(getattr(clip, "length", 0.0)),
    }


def read_points(clip, param, step_beats=None, max_points=None):
    """Sample the envelope at a fixed beat grid.

    Live has no breakpoint-enumeration API anywhere, so sampling
    ``value_at_time`` is the only read path. Returns normalized values."""
    step = DEFAULT_READ_STEP_BEATS if step_beats is None else float(step_beats)
    if step <= 0:
        raise AutomationOpError("stepBeats must be positive")
    cap = MAX_READ_POINTS if max_points is None else int(max_points)
    cap = min(max(cap, 2), MAX_READ_POINTS)

    length = float(getattr(clip, "length", 0.0))
    base = {
        "paramMin": float(param.min),
        "paramMax": float(param.max),
        "clipLengthBeats": length,
    }
    envelope = clip.automation_envelope(param)
    if envelope is None:
        base.update({"hasEnvelope": False, "sampled": False, "points": []})
        return base

    sample_count = int(length / step) + 1 if length > 0 else 1
    sample_count = min(sample_count, cap)
    points = []
    for i in range(sample_count):
        t = i * step
        points.append([t, normalize(param, envelope.value_at_time(t))])
    base.update({
        "hasEnvelope": True,
        "sampled": True,
        "stepBeats": step,
        "points": points,
    })
    return base


def clear(clip, param=None):
    """Clear one param's envelope, or every envelope on the clip."""
    if param is None:
        clip.clear_all_envelopes()
        return {"cleared": "all"}
    clip.clear_envelope(param)
    return {"cleared": "param"}
