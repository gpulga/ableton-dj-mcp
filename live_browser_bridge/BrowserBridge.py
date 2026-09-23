# Ableton DJ MCP - Live Browser Bridge
# Copyright (C) 2026 Gabriel Pulga
# SPDX-License-Identifier: GPL-3.0-or-later

"""ControlSurface that opens a UDP socket and dispatches bridge ops on Live's
main thread.

Wire-protocol:

    Request:  {"id": "...", "op": "ping|browse|load_item|automation_write|
               automation_read|automation_clear|shutdown", "args": {...}}
    Reply OK: {"id": "...", "ok": true,  "result": {...}}
    Reply NO: {"id": "...", "ok": false, "error": {"code": "...", "message": "..."}}

Threading:
    Everything runs on Live's main thread. ``update_display`` is called by Live
    about every 100 ms; each tick reads pending datagrams from a non-blocking
    socket, runs the ops (LOM access must happen on the main thread) and sends
    the replies right away.

    There is deliberately no socket thread. Live's embedded Python schedules
    background threads so rarely that a thread-based receive/reply loop added
    ~700 ms to every op, even a no-op ping (#326)."""

import errno
import json
import os
import socket
import traceback

try:
    import Live
except ImportError:  # pragma: no cover - tests stub Live
    Live = None

try:
    from _Framework.ControlSurface import ControlSurface
except ImportError:  # pragma: no cover - tests stub the base class
    class ControlSurface(object):  # type: ignore[no-redef]
        def __init__(self, c_instance):
            self._c_instance = c_instance

        def application(self):
            raise NotImplementedError

        def log_message(self, message):  # noqa: D401
            print(message)

        def disconnect(self):
            pass

        def update_display(self):
            pass

from . import automation_ops, browser_ops
from .version import BRIDGE_VERSION, DEFAULT_PORT


SOCKET_RECV_BUF = 65535
MAX_REQUESTS_PER_TICK = 8


class BrowserBridge(ControlSurface):
    """Live remote-script entry point. One instance per Live session."""

    def __init__(self, c_instance):
        ControlSurface.__init__(self, c_instance)
        self._socket = None
        self._port = self._resolve_port()
        self._start_socket()
        self._log("Ableton DJ MCP browser bridge %s listening on udp:%d" %
                  (BRIDGE_VERSION, self._port))

    # ------------------------------------------------------------------ setup

    def _resolve_port(self):
        env = os.environ.get("ADJ_BRIDGE_PORT")
        if env:
            try:
                return int(env)
            except ValueError:
                self._log("ignoring invalid ADJ_BRIDGE_PORT=%r" % env)
        return DEFAULT_PORT

    def _start_socket(self):
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            sock.bind(("127.0.0.1", self._port))
            sock.setblocking(False)
            self._socket = sock
        except Exception as exc:
            self._log("failed to bind udp:%d (%s); bridge inactive" %
                      (self._port, exc))
            self._socket = None

    # ----------------------------------------------------------- main thread

    def update_display(self):
        # Called by Live ~10 Hz. Receive, run and reply in the same tick so
        # all LOM access stays on the main thread.
        try:
            self._poll_socket()
        except Exception:
            # Never let a bridge failure crash Live's display tick.
            self._log("bridge tick error:\n%s" % traceback.format_exc())

    def _poll_socket(self, max_items=MAX_REQUESTS_PER_TICK):
        """Handle up to ``max_items`` pending datagrams without blocking."""
        for _ in range(max_items):
            if self._socket is None:
                return
            try:
                data, addr = self._socket.recvfrom(SOCKET_RECV_BUF)
            except BlockingIOError:
                return  # nothing pending
            except OSError as exc:
                # e.g. Windows reports an earlier failed send as
                # ConnectionResetError on the next recv; skip it.
                self._log("udp recv failed: %s" % exc)
                continue
            self._handle_datagram(data, addr)

    def _handle_datagram(self, data, addr):
        try:
            message = json.loads(data.decode("utf-8"))
        except Exception as exc:
            self._send(addr, self._error(None, "INVALID_ARGS",
                       "could not parse request: %s" % exc))
            return
        if not isinstance(message, dict) or not message.get("id") \
                or not message.get("op"):
            req_id = message.get("id") if isinstance(message, dict) else None
            self._send(addr, self._error(req_id, "INVALID_ARGS",
                       "request missing id or op"))
            return
        self._send(addr, self._handle_request(message))

    def _send(self, addr, payload):
        if self._socket is None:
            return
        try:
            self._socket.sendto(json.dumps(payload).encode("utf-8"), addr)
        except Exception as exc:
            self._log("udp send failed: %s" % exc)
            self._send_fallback_error(addr, payload.get("id"), exc)

    def _send_fallback_error(self, addr, req_id, exc):
        # The original payload didn't fit on the wire (or otherwise failed
        # to send); tell the caller so it fails fast with a clear reason
        # instead of just timing out with no indication why (issue #290).
        if self._socket is None or req_id is None:
            return
        code = (
            "REPLY_TOO_LARGE"
            if isinstance(exc, OSError) and exc.errno == errno.EMSGSIZE
            else "SEND_FAILED"
        )
        fallback = self._error(req_id, code, str(exc))
        try:
            self._socket.sendto(json.dumps(fallback).encode("utf-8"), addr)
        except Exception as fallback_exc:
            # Truly nothing more we can do — the caller will time out.
            self._log("udp fallback send also failed: %s" % fallback_exc)

    def _handle_request(self, message):
        req_id = message.get("id")
        op = message.get("op")
        args = message.get("args") or {}
        try:
            if op == "ping":
                return self._ok(req_id, self._op_ping())
            if op == "browse":
                return self._ok(req_id, self._op_browse(args))
            if op == "load_item":
                return self._ok(req_id, self._op_load_item(args))
            if op == "automation_write":
                return self._ok(req_id, self._op_automation_write(args))
            if op == "automation_read":
                return self._ok(req_id, self._op_automation_read(args))
            if op == "automation_clear":
                return self._ok(req_id, self._op_automation_clear(args))
            if op == "shutdown":
                # Best-effort; Live restart is the canonical way to stop us.
                return self._ok(req_id, {"acknowledged": True})
            return self._error(req_id, "INVALID_ARGS", "unknown op: %s" % op)
        except browser_ops.BrowserOpError as exc:
            return self._error(req_id, "BROWSER_API_FAILED", str(exc))
        except automation_ops.AutomationOpError as exc:
            return self._error(req_id, "AUTOMATION_FAILED", str(exc))
        except Exception as exc:
            return self._error(
                req_id,
                "MAIN_THREAD_ERROR",
                "%s: %s" % (exc.__class__.__name__, exc),
            )

    # ----------------------------------------------------------- ops impl

    def _browser(self):
        app = self.application()
        browser = getattr(app, "browser", None)
        if browser is None:
            raise browser_ops.BrowserOpError("Application.browser unavailable")
        return browser

    def _op_ping(self):
        live_version = "unknown"
        try:
            app = self.application()
            live_version = "%d.%d.%d" % (
                app.get_major_version(),
                app.get_minor_version(),
                app.get_bugfix_version(),
            )
        except Exception:
            pass
        return {"version": BRIDGE_VERSION, "liveVersion": live_version}

    def _op_browse(self, args):
        return browser_ops.browse(
            self._browser(),
            category=args.get("category"),
            path=args.get("path"),
            search=args.get("search"),
            depth=int(args.get("depth", 1)),
            limit=int(args.get("limit", 100)),
        )

    def _op_load_item(self, args):
        uri = args.get("uri")
        if not uri:
            raise browser_ops.BrowserOpError("uri is required for load_item")

        browser = self._browser()
        item = browser_ops.find_by_uri(browser, uri, category=args.get("category"))
        if item is None:
            raise browser_ops.BrowserOpError("uri not found in browser tree: %s" % uri)
        if not getattr(item, "is_loadable", False):
            raise browser_ops.BrowserOpError("item is not loadable: %s" % uri)

        # Capture pre-load device set on the focused track so we can report
        # the new device id after load.
        before_ids = self._focused_track_device_ids()
        browser.load_item(item)
        after_ids = self._focused_track_device_ids()
        new_ids = [d for d in after_ids if d not in before_ids]
        return {
            "loaded": True,
            "deviceId": new_ids[0] if new_ids else None,
            "deviceCountBefore": len(before_ids),
            "deviceCountAfter": len(after_ids),
        }

    def _song(self):
        song = self.application().get_document()
        if song is None:
            raise automation_ops.AutomationOpError("Live document unavailable")
        return song

    def _resolve_clip_and_param(self, args):
        clip_ref = args.get("clip") or {}
        target = args.get("target")
        clip, track = automation_ops.resolve_clip(self._song(), clip_ref)
        param = None
        if target is not None:
            param = automation_ops.resolve_parameter(track, target)
        return clip, param

    def _op_automation_write(self, args):
        clip, param = self._resolve_clip_and_param(args)
        if param is None:
            raise automation_ops.AutomationOpError(
                "target is required for automation_write"
            )
        return automation_ops.write_points(
            clip,
            param,
            args.get("points") or [],
            clear_first=bool(args.get("clearFirst")),
        )

    def _op_automation_read(self, args):
        clip, param = self._resolve_clip_and_param(args)
        if param is None:
            raise automation_ops.AutomationOpError(
                "target is required for automation_read"
            )
        return automation_ops.read_points(
            clip,
            param,
            step_beats=args.get("stepBeats"),
            max_points=args.get("maxPoints"),
        )

    def _op_automation_clear(self, args):
        clip, param = self._resolve_clip_and_param(args)
        return automation_ops.clear(clip, param)

    def _focused_track_device_ids(self):
        try:
            song = self.application().get_document()
            track = song.view.selected_track
            return [str(d._live_ptr) if hasattr(d, "_live_ptr") else id(d)
                    for d in track.devices]
        except Exception:
            return []

    # ----------------------------------------------------------- responses

    def _ok(self, req_id, result):
        return {"id": req_id, "ok": True, "result": result}

    def _error(self, req_id, code, message):
        return {"id": req_id, "ok": False,
                "error": {"code": code, "message": message}}

    def _log(self, message):
        try:
            self.log_message("[adj-bridge] %s" % message)
        except Exception:  # pragma: no cover - log_message itself failing
            print("[adj-bridge] %s" % message)

    # ----------------------------------------------------------- shutdown

    def disconnect(self):
        if self._socket is not None:
            try:
                self._socket.close()
            except Exception:
                pass
            self._socket = None
        try:
            ControlSurface.disconnect(self)
        except Exception:
            pass
