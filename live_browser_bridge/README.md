# Ableton DJ MCP — Browser Bridge

Live remote-control script that exposes Python-only Live APIs over a local UDP
socket. The Node-side MCP server forwards browser navigation, URI-based device
loads, and clip automation-envelope ops here; nothing else in the package needs
the bridge.

License: GPL-3.0-or-later (matches the parent project).

## Why it exists

`Application.Browser` and the clip automation-envelope API
(`Clip.automation_envelope`, `AutomationEnvelope.insert_step`, ...) are exposed
to Python remote scripts but deliberately filtered out of Live's Max-for-Live
JavaScript bindings. See `docs/findings/dev/browser/m4l-no-browser-api.md`,
`docs/findings/dev/device/clip-envelope-api-python-only.md`, and
`docs/specs/Browser-Bridge-Spec.md` in the parent repo for the full rationale.

## Install

From the parent repo:

```
npm run install:bridge
```

That copies this directory to:

- macOS: `~/Music/Ableton/User Library/Remote Scripts/AbletonDjMcp/`
- Windows:
  `%USERPROFILE%\Documents\Ableton\User Library\Remote Scripts\AbletonDjMcp\`

After installing, restart Live and enable the surface in **Preferences →
Link/Tempo/MIDI → Control Surface → AbletonDjMcp**.

## Protocol

UDP on `127.0.0.1:11077` (override with the `ADJ_BRIDGE_PORT` env var). One JSON
datagram per request and reply. See the parent repo spec for the full schema.

## Layout

| File                | Purpose                                                |
| ------------------- | ------------------------------------------------------ |
| `__init__.py`       | Live entry point; returns the `BrowserBridge` instance |
| `BrowserBridge.py`  | ControlSurface subclass; polls UDP on Live's main tick |
| `browser_ops.py`    | Pure tree walking / serialisation helpers              |
| `automation_ops.py` | Pure clip automation-envelope helpers                  |
| `version.py`        | Version + default port constants                       |

`browser_ops.py` and `automation_ops.py` are import-clean (no Live import) so
they can be unit-tested with a stubbed object graph.
