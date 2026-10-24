# Ableton DJ MCP - Live Browser Bridge tests
# Copyright (C) 2026 Gabriel Pulga
# SPDX-License-Identifier: GPL-3.0-or-later

"""Unit tests for automation_ops. The Live module is not imported; a plain
object graph mirrors the Song/Track/Clip/DeviceParameter/AutomationEnvelope
shapes the ops touch."""

import math
import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, os.pardir, os.pardir))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from live_browser_bridge import automation_ops  # type: ignore  # noqa: E402


class FakeEnvelope(object):
    def __init__(self, values=None):
        self.steps = []
        self._values = values or {}

    def insert_step(self, time, duration, value):
        self.steps.append((time, duration, value))

    def value_at_time(self, time):
        return self._values.get(time, 0.0)


class FakeParam(object):
    def __init__(self, name="Volume", original_name=None, minimum=0.0,
                 maximum=1.0):
        self.name = name
        self.original_name = original_name if original_name is not None else name
        self.min = minimum
        self.max = maximum


class FakeClip(object):
    def __init__(self, length=16.0, start_time=0.0, envelopes=None):
        self.length = length
        self.start_time = start_time
        self._envelopes = envelopes or {}
        self.created_for = []
        self.cleared_params = []
        self.cleared_all = False

    def automation_envelope(self, param):
        return self._envelopes.get(param)

    def create_automation_envelope(self, param):
        env = FakeEnvelope()
        self._envelopes[param] = env
        self.created_for.append(param)
        return env

    def clear_envelope(self, param):
        self.cleared_params.append(param)
        self._envelopes.pop(param, None)

    def clear_all_envelopes(self):
        self.cleared_all = True
        self._envelopes = {}


class FakeSlot(object):
    def __init__(self, clip=None):
        self.clip = clip
        self.has_clip = clip is not None


class FakeDevice(object):
    def __init__(self, parameters=(), chains=(), return_chains=()):
        self.parameters = list(parameters)
        self.chains = list(chains)
        self.return_chains = list(return_chains)


class FakeChain(object):
    def __init__(self, devices=()):
        self.devices = list(devices)


class FakeMixer(object):
    def __init__(self, sends=()):
        self.volume = FakeParam("Volume")
        self.panning = FakeParam("Pan", minimum=-1.0, maximum=1.0)
        self.sends = list(sends)


class FakeTrack(object):
    def __init__(self, clip_slots=(), arrangement_clips=(), devices=(),
                 sends=()):
        self.clip_slots = list(clip_slots)
        self.arrangement_clips = list(arrangement_clips)
        self.devices = list(devices)
        self.mixer_device = FakeMixer(sends=sends)


class FakeSong(object):
    def __init__(self, tracks=()):
        self.tracks = list(tracks)


class ResolveClipTest(unittest.TestCase):
    def test_session_clip(self):
        clip = FakeClip()
        track = FakeTrack(clip_slots=[FakeSlot(), FakeSlot(clip)])
        song = FakeSong([track])
        found, found_track = automation_ops.resolve_clip(
            song, {"trackIndex": 0, "sceneIndex": 1}
        )
        self.assertIs(found, clip)
        self.assertIs(found_track, track)

    def test_empty_slot_raises(self):
        song = FakeSong([FakeTrack(clip_slots=[FakeSlot()])])
        with self.assertRaises(automation_ops.AutomationOpError):
            automation_ops.resolve_clip(song, {"trackIndex": 0, "sceneIndex": 0})

    def test_track_index_out_of_range(self):
        with self.assertRaises(automation_ops.AutomationOpError):
            automation_ops.resolve_clip(FakeSong([]), {"trackIndex": 0,
                                                       "sceneIndex": 0})

    def test_missing_locator_raises(self):
        song = FakeSong([FakeTrack()])
        with self.assertRaises(automation_ops.AutomationOpError):
            automation_ops.resolve_clip(song, {"trackIndex": 0})

    def test_arrangement_clip_match(self):
        clip = FakeClip(start_time=64.0)
        track = FakeTrack(arrangement_clips=[FakeClip(start_time=0.0), clip])
        song = FakeSong([track])
        found, _ = automation_ops.resolve_clip(
            song, {"trackIndex": 0, "arrangementStartBeats": 64.0005}
        )
        self.assertIs(found, clip)

    def test_arrangement_clip_miss_raises(self):
        track = FakeTrack(arrangement_clips=[FakeClip(start_time=0.0)])
        with self.assertRaises(automation_ops.AutomationOpError):
            automation_ops.resolve_clip(
                FakeSong([track]), {"trackIndex": 0,
                                    "arrangementStartBeats": 32.0}
            )


class ResolveParameterTest(unittest.TestCase):
    def test_device_param_case_insensitive(self):
        param = FakeParam("Frequency")
        track = FakeTrack(devices=[FakeDevice([param])])
        found = automation_ops.resolve_parameter(
            track,
            {"kind": "device", "chain": [{"type": "d", "index": 0}],
             "paramName": "frequency"},
        )
        self.assertIs(found, param)

    def test_macro_formatted_name(self):
        param = FakeParam("Sweep", original_name="Macro 1")
        track = FakeTrack(devices=[FakeDevice([param])])
        found = automation_ops.resolve_parameter(
            track,
            {"kind": "device", "chain": [{"type": "d", "index": 0}],
             "paramName": "Sweep (Macro 1)"},
        )
        self.assertIs(found, param)

    def test_nested_chain_walk(self):
        param = FakeParam("Cutoff")
        inner = FakeDevice([param])
        rack = FakeDevice([], chains=[FakeChain([inner])])
        track = FakeTrack(devices=[rack])
        found = automation_ops.resolve_parameter(
            track,
            {"kind": "device",
             "chain": [{"type": "d", "index": 0}, {"type": "c", "index": 0},
                       {"type": "d", "index": 0}],
             "paramName": "Cutoff"},
        )
        self.assertIs(found, param)

    def test_param_not_found_raises(self):
        track = FakeTrack(devices=[FakeDevice([FakeParam("Attack")])])
        with self.assertRaises(automation_ops.AutomationOpError):
            automation_ops.resolve_parameter(
                track,
                {"kind": "device", "chain": [{"type": "d", "index": 0}],
                 "paramName": "Nope"},
            )

    def test_mixer_volume_and_pan(self):
        track = FakeTrack()
        vol = automation_ops.resolve_parameter(
            track, {"kind": "mixer", "param": "volume"}
        )
        pan = automation_ops.resolve_parameter(
            track, {"kind": "mixer", "param": "panning"}
        )
        self.assertIs(vol, track.mixer_device.volume)
        self.assertIs(pan, track.mixer_device.panning)

    def test_mixer_send_by_index(self):
        send_a = FakeParam("Send A")
        track = FakeTrack(sends=[send_a])
        found = automation_ops.resolve_parameter(
            track, {"kind": "mixer", "param": "send", "sendIndex": 0}
        )
        self.assertIs(found, send_a)

    def test_mixer_send_out_of_range(self):
        with self.assertRaises(automation_ops.AutomationOpError):
            automation_ops.resolve_parameter(
                FakeTrack(), {"kind": "mixer", "param": "send", "sendIndex": 0}
            )

    def test_unknown_kind_raises(self):
        with self.assertRaises(automation_ops.AutomationOpError):
            automation_ops.resolve_parameter(FakeTrack(), {"kind": "nope"})


class NormalizeTest(unittest.TestCase):
    def test_denormalize_maps_range(self):
        param = FakeParam(minimum=20.0, maximum=20000.0)
        self.assertAlmostEqual(automation_ops.denormalize(param, 0.0), 20.0)
        self.assertAlmostEqual(automation_ops.denormalize(param, 1.0), 20000.0)
        self.assertAlmostEqual(automation_ops.denormalize(param, 0.5), 10010.0)

    def test_denormalize_clamps(self):
        param = FakeParam(minimum=0.0, maximum=10.0)
        self.assertAlmostEqual(automation_ops.denormalize(param, 1.5), 10.0)
        self.assertAlmostEqual(automation_ops.denormalize(param, -0.5), 0.0)

    def test_normalize_round_trip(self):
        param = FakeParam(minimum=-1.0, maximum=1.0)
        raw = automation_ops.denormalize(param, 0.25)
        self.assertAlmostEqual(automation_ops.normalize(param, raw), 0.25)

    def test_normalize_degenerate_range(self):
        param = FakeParam(minimum=3.0, maximum=3.0)
        self.assertEqual(automation_ops.normalize(param, 3.0), 0.0)


class WritePointsTest(unittest.TestCase):
    def test_creates_envelope_when_absent(self):
        clip = FakeClip()
        param = FakeParam(minimum=0.0, maximum=100.0)
        result = automation_ops.write_points(
            clip, param, [[0.0, 0.0], [8.0, 1.0]]
        )
        self.assertTrue(result["envelopeCreated"])
        self.assertEqual(result["pointCount"], 2)
        env = clip.automation_envelope(param)
        # Steps are contiguous: duration = gap to next point; final step gets
        # the fallback width (zero-length steps are silent no-ops in Live).
        self.assertEqual(
            env.steps,
            [
                (0.0, 8.0, 0.0),
                (8.0, automation_ops.FINAL_STEP_DURATION_BEATS, 100.0),
            ],
        )

    def test_reuses_existing_envelope(self):
        param = FakeParam()
        env = FakeEnvelope()
        clip = FakeClip(envelopes={param: env})
        result = automation_ops.write_points(clip, param, [[4.0, 0.5]])
        self.assertFalse(result["envelopeCreated"])
        self.assertEqual(len(env.steps), 1)

    def test_clear_first(self):
        param = FakeParam()
        clip = FakeClip(envelopes={param: FakeEnvelope()})
        automation_ops.write_points(clip, param, [[0.0, 1.0]], clear_first=True)
        self.assertEqual(clip.cleared_params, [param])
        self.assertTrue(clip.created_for)

    def test_empty_points_raises(self):
        with self.assertRaises(automation_ops.AutomationOpError):
            automation_ops.write_points(FakeClip(), FakeParam(), [])


class ReadPointsTest(unittest.TestCase):
    def test_no_envelope(self):
        result = automation_ops.read_points(FakeClip(), FakeParam())
        self.assertFalse(result["hasEnvelope"])
        self.assertEqual(result["points"], [])

    def test_samples_grid(self):
        param = FakeParam(minimum=0.0, maximum=10.0)
        env = FakeEnvelope(values={0.0: 0.0, 1.0: 5.0, 2.0: 10.0})
        clip = FakeClip(length=2.0, envelopes={param: env})
        result = automation_ops.read_points(clip, param, step_beats=1.0)
        self.assertTrue(result["hasEnvelope"])
        self.assertEqual(result["points"],
                         [[0.0, 0.0], [1.0, 0.5], [2.0, 1.0]])

    def test_cap_limits_samples(self):
        param = FakeParam()
        env = FakeEnvelope()
        clip = FakeClip(length=1000.0, envelopes={param: env})
        result = automation_ops.read_points(clip, param, step_beats=0.25)
        self.assertEqual(len(result["points"]), automation_ops.MAX_READ_POINTS)

    def test_bad_step_raises(self):
        with self.assertRaises(automation_ops.AutomationOpError):
            automation_ops.read_points(FakeClip(), FakeParam(), step_beats=0)


class ClearTest(unittest.TestCase):
    def test_clear_param(self):
        param = FakeParam()
        clip = FakeClip(envelopes={param: FakeEnvelope()})
        result = automation_ops.clear(clip, param)
        self.assertEqual(result, {"cleared": "param"})
        self.assertEqual(clip.cleared_params, [param])

    def test_clear_all(self):
        clip = FakeClip()
        result = automation_ops.clear(clip)
        self.assertEqual(result, {"cleared": "all"})
        self.assertTrue(clip.cleared_all)



class LabelledParam(object):
    """A param whose labels follow a mapping, like Live's str_for_value."""

    def __init__(self, label, minimum=0.0, maximum=1.0, name="Frequency"):
        self.name = name
        self.min = minimum
        self.max = maximum
        self._label = label

    def str_for_value(self, raw):
        return self._label(raw)


def _log_hz(raw):
    # 20 Hz .. 20 kHz on a log curve, printed the way Live prints it
    hz = 20.0 * (1000.0 ** raw)
    return "%.2f kHz" % (hz / 1000.0) if hz >= 1000 else "%.1f Hz" % hz


class DisplayValuesTest(unittest.TestCase):
    def test_parse_display_units(self):
        self.assertEqual(automation_ops.parse_display("1.20 kHz"), (1200.0, "hz"))
        self.assertEqual(automation_ops.parse_display("1200Hz"), (1200.0, "hz"))
        self.assertEqual(automation_ops.parse_display("-12.0 dB"), (-12.0, "db"))
        self.assertEqual(automation_ops.parse_display("25 %"), (25.0, "%"))
        self.assertEqual(automation_ops.parse_display("250 ms"), (0.25, "s"))
        self.assertEqual(automation_ops.parse_display("-inf dB")[0], float("-inf"))
        self.assertIsNone(automation_ops.parse_display("Off"))

    def test_finds_a_frequency_on_a_log_curve(self):
        param = LabelledParam(_log_hz)

        value = automation_ops.display_to_normalized(param, "1200Hz")

        # 1200 Hz sits at log(60)/log(1000) of the range, not 0.06
        self.assertAlmostEqual(value, math.log(60) / math.log(1000), places=2)

    def test_accepts_khz_for_a_hz_param(self):
        param = LabelledParam(_log_hz)

        self.assertAlmostEqual(
            automation_ops.display_to_normalized(param, "1.2kHz"),
            automation_ops.display_to_normalized(param, "1200Hz"),
            places=3,
        )

    def test_clamps_outside_the_range(self):
        param = LabelledParam(_log_hz)

        self.assertEqual(automation_ops.display_to_normalized(param, "5Hz"), 0.0)
        self.assertEqual(automation_ops.display_to_normalized(param, "50kHz"), 1.0)

    def test_handles_a_falling_mapping(self):
        param = LabelledParam(lambda raw: "%.1f dB" % (-60.0 * raw), name="Atten")

        self.assertAlmostEqual(
            automation_ops.display_to_normalized(param, "-15dB"), 0.25, places=2
        )

    def test_refuses_a_unit_the_param_does_not_show(self):
        param = LabelledParam(_log_hz)

        with self.assertRaisesRegex(automation_ops.AutomationOpError, "can't be mapped"):
            automation_ops.display_to_normalized(param, "-6dB")

    def test_refuses_text_without_a_unit(self):
        with self.assertRaisesRegex(automation_ops.AutomationOpError, "with a unit"):
            automation_ops.display_to_normalized(LabelledParam(_log_hz), "loud")

    def test_displays_for_reads_back_labels(self):
        param = LabelledParam(_log_hz)

        self.assertEqual(automation_ops.displays_for(param, [0.0, 1.0]),
                         ["20.0 Hz", "20.00 kHz"])


if __name__ == "__main__":
    unittest.main()
