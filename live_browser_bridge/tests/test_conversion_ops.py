# Ableton DJ MCP - Live Browser Bridge tests
# Copyright (C) 2026 Gabriel Pulga
# SPDX-License-Identifier: GPL-3.0-or-later

"""Unit tests for conversion_ops, against a stubbed Live.Conversions."""

import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, os.pardir, os.pardir))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from live_browser_bridge import conversion_ops  # type: ignore  # noqa: E402


class FakeTrack(object):
    def __init__(self, ptr):
        self._live_ptr = ptr


class FakeSong(object):
    def __init__(self, ptrs):
        self.tracks = [FakeTrack(p) for p in ptrs]


class FakeClip(object):
    def __init__(self, is_audio_clip=True, is_recording=False):
        self.is_audio_clip = is_audio_clip
        self.is_recording = is_recording


class FakeTypes(object):
    drums_to_midi = "DRUMS"
    melody_to_midi = "MELODY"
    harmony_to_midi = "HARMONY"


class FakeConversions(object):
    AudioToMidiType = FakeTypes

    def __init__(self, convertible=True, error=None):
        self.calls = []
        self._convertible = convertible
        self._error = error

    def is_convertible_to_midi(self, song, clip):
        return self._convertible

    def audio_to_midi_clip(self, song, clip, kind):
        if self._error:
            raise self._error
        self.calls.append(("audio_to_midi_clip", kind))

    def create_midi_track_with_simpler(self, song, clip):
        self.calls.append(("create_midi_track_with_simpler",))

    def create_drum_rack_from_audio_clip(self, song, clip):
        self.calls.append(("create_drum_rack_from_audio_clip",))


class FakeLive(object):
    def __init__(self, conversions):
        self.Conversions = conversions


class ConvertTest(unittest.TestCase):
    def setUp(self):
        self.conversions = FakeConversions()
        self.live = FakeLive(self.conversions)
        self.song = FakeSong([11, 22])

    def test_drums_converts_to_midi_and_reports_tracks_before(self):
        result = conversion_ops.convert(self.live, self.song, FakeClip(), "drums")

        self.assertEqual(self.conversions.calls, [("audio_to_midi_clip", "DRUMS")])
        self.assertEqual(result["trackIdsBefore"], ["11", "22"])
        self.assertTrue(result["started"])

    def test_simpler_and_drum_rack_call_their_functions(self):
        conversion_ops.convert(self.live, self.song, FakeClip(), "simpler")
        conversion_ops.convert(self.live, self.song, FakeClip(), "drum-rack")

        self.assertEqual(
            self.conversions.calls,
            [
                ("create_midi_track_with_simpler",),
                ("create_drum_rack_from_audio_clip",),
            ],
        )

    def test_rejects_unknown_kind(self):
        with self.assertRaises(conversion_ops.ConversionOpError):
            conversion_ops.convert(self.live, self.song, FakeClip(), "vocals")

    def test_rejects_midi_clip(self):
        with self.assertRaisesRegex(conversion_ops.ConversionOpError, "audio clip"):
            conversion_ops.convert(
                self.live, self.song, FakeClip(is_audio_clip=False), "drums"
            )

    def test_rejects_recording_clip(self):
        with self.assertRaisesRegex(conversion_ops.ConversionOpError, "recording"):
            conversion_ops.convert(
                self.live, self.song, FakeClip(is_recording=True), "melody"
            )

    def test_rejects_clip_live_cannot_convert(self):
        live = FakeLive(FakeConversions(convertible=False))

        with self.assertRaisesRegex(conversion_ops.ConversionOpError, "can't convert"):
            conversion_ops.convert(live, self.song, FakeClip(), "harmony")

    def test_reports_missing_conversions_api(self):
        with self.assertRaisesRegex(conversion_ops.ConversionOpError, "Live version"):
            conversion_ops.convert(FakeLive(None), self.song, FakeClip(), "drums")

    def test_wraps_live_runtime_error(self):
        live = FakeLive(FakeConversions(error=RuntimeError("busy")))

        with self.assertRaisesRegex(conversion_ops.ConversionOpError, "refused.*busy"):
            conversion_ops.convert(live, self.song, FakeClip(), "drums")


class TrackIdsTest(unittest.TestCase):
    def test_lists_track_ids_in_order(self):
        self.assertEqual(conversion_ops.track_ids(FakeSong([3, 1, 2])), ["3", "1", "2"])


if __name__ == "__main__":
    unittest.main()
