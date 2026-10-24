# Ableton DJ MCP - Live Browser Bridge
# Copyright (C) 2026 Gabriel Pulga
# SPDX-License-Identifier: GPL-3.0-or-later

"""Make a new track from an audio clip, like Live's "Convert Drums/Melody/
Harmony to New MIDI Track", "Convert to Simpler" and "Slice to Drum Rack".

``Live.Conversions`` is Python-API-only; Max for Live JS can't reach it. Live
starts the conversion and returns at once, then builds the track on a later
tick, so ``convert`` only starts the work and reports the track ids that
existed before. The caller polls ``track_ids`` until a new one appears."""

# What ``kind`` maps to: an AudioToMidiType member for the MIDI conversions,
# or the Live.Conversions function for the instrument ones.
AUDIO_TO_MIDI = {
    "drums": "drums_to_midi",
    "melody": "melody_to_midi",
    "harmony": "harmony_to_midi",
}
TO_INSTRUMENT = {
    "simpler": "create_midi_track_with_simpler",
    "drum-rack": "create_drum_rack_from_audio_clip",
}
KINDS = tuple(AUDIO_TO_MIDI) + tuple(TO_INSTRUMENT)


class ConversionOpError(Exception):
    """Raised when a clip can't be converted."""


def track_ids(song):
    """Stable ids of the Set's tracks, in order."""
    return [_track_id(track) for track in song.tracks]


def convert(live, song, clip, kind):
    """Start converting ``clip``. Returns the track ids from before the
    conversion so the caller can spot the new track."""
    if kind not in KINDS:
        raise ConversionOpError(
            "convert must be one of %s, got %r" % (", ".join(KINDS), kind)
        )
    if not getattr(clip, "is_audio_clip", False):
        raise ConversionOpError("only an audio clip can be converted")
    if getattr(clip, "is_recording", False):
        raise ConversionOpError("a clip that is recording can't be converted")

    conversions = getattr(live, "Conversions", None) if live else None
    before = track_ids(song)

    try:
        if kind in AUDIO_TO_MIDI:
            _audio_to_midi(conversions, song, clip, AUDIO_TO_MIDI[kind])
        else:
            function = getattr(conversions, TO_INSTRUMENT[kind], None)
            if function is None:
                raise ConversionOpError(_unsupported(kind))
            function(song, clip)
    except RuntimeError as err:
        raise ConversionOpError("Live refused the conversion: %s" % err)

    return {"started": True, "kind": kind, "trackIdsBefore": before}


def _audio_to_midi(conversions, song, clip, type_name):
    types = getattr(conversions, "AudioToMidiType", None)
    to_midi = getattr(conversions, "audio_to_midi_clip", None)
    convertible = getattr(conversions, "is_convertible_to_midi", None)
    if types is None or to_midi is None or not hasattr(types, type_name):
        raise ConversionOpError(_unsupported("MIDI"))
    if convertible is not None and not convertible(song, clip):
        raise ConversionOpError("Live can't convert this clip to MIDI")
    to_midi(song, clip, getattr(types, type_name))


def _unsupported(kind):
    return "this Live version can't convert clips to %s" % kind


def _track_id(track):
    return str(track._live_ptr) if hasattr(track, "_live_ptr") else str(id(track))
