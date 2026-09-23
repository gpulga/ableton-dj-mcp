# Ableton DJ MCP - Live Browser Bridge tests
# Copyright (C) 2026 Gabriel Pulga
# SPDX-License-Identifier: GPL-3.0-or-later

"""Unit tests for BrowserBridge's send-failure fallback. Live/ControlSurface
are not imported here; BrowserBridge.py falls back to a stub base class when
they're unavailable, so the module imports cleanly outside Live."""

import json
import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, os.pardir, os.pardir))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from live_browser_bridge.BrowserBridge import BrowserBridge  # type: ignore  # noqa: E402


class FakeSocket(object):
    def __init__(self, side_effects):
        self.side_effects = list(side_effects)
        self.sent = []

    def sendto(self, data, addr):
        effect = self.side_effects.pop(0)
        self.sent.append(json.loads(data.decode("utf-8")))
        if isinstance(effect, Exception):
            raise effect


def _make_bridge(socket_):
    # Bypass __init__ (which binds a real UDP socket and starts a thread).
    bridge = BrowserBridge.__new__(BrowserBridge)
    bridge._socket = socket_
    bridge._log = lambda message: None
    return bridge


class SendFallbackTest(unittest.TestCase):
    def test_oversized_reply_sends_reply_too_large(self):
        sock = FakeSocket([OSError(40, "Message too long"), None])
        bridge = _make_bridge(sock)

        bridge._send("addr", {"id": "req_1", "ok": True, "result": {"items": []}})

        self.assertEqual(len(sock.sent), 2)
        fallback = sock.sent[1]
        self.assertEqual(fallback["id"], "req_1")
        self.assertFalse(fallback["ok"])
        self.assertEqual(fallback["error"]["code"], "REPLY_TOO_LARGE")

    def test_other_send_failure_sends_send_failed(self):
        sock = FakeSocket([OSError(9, "Bad file descriptor"), None])
        bridge = _make_bridge(sock)

        bridge._send("addr", {"id": "req_2", "ok": True, "result": {}})

        fallback = sock.sent[1]
        self.assertEqual(fallback["error"]["code"], "SEND_FAILED")

    def test_fallback_send_failure_does_not_raise(self):
        sock = FakeSocket([OSError(40, "Message too long"), OSError(9, "still broken")])
        bridge = _make_bridge(sock)

        bridge._send("addr", {"id": "req_3", "ok": True, "result": {}})  # must not raise

    def test_missing_id_skips_fallback(self):
        sock = FakeSocket([OSError(40, "Message too long")])
        bridge = _make_bridge(sock)

        bridge._send("addr", {"id": None, "ok": True, "result": {}})

        self.assertEqual(len(sock.sent), 1)

    def test_successful_send_does_not_trigger_fallback(self):
        sock = FakeSocket([None])
        bridge = _make_bridge(sock)

        bridge._send("addr", {"id": "req_4", "ok": True, "result": {}})

        self.assertEqual(len(sock.sent), 1)


class FakeNonBlockingSocket(object):
    """Datagrams queued up front; empty queue raises like a real
    non-blocking socket. Entries may be exceptions to raise instead."""

    def __init__(self, incoming):
        self.incoming = list(incoming)
        self.sent = []

    def recvfrom(self, bufsize):
        if not self.incoming:
            raise BlockingIOError(35, "Resource temporarily unavailable")
        item = self.incoming.pop(0)
        if isinstance(item, Exception):
            raise item
        return item, ("127.0.0.1", 50000)

    def sendto(self, data, addr):
        self.sent.append(json.loads(data.decode("utf-8")))


def _request(req_id, op, args=None):
    return json.dumps({"id": req_id, "op": op, "args": args or {}}).encode("utf-8")


class MainThreadPollTest(unittest.TestCase):
    def test_request_is_answered_in_the_same_tick(self):
        sock = FakeNonBlockingSocket([_request("r1", "ping")])
        bridge = _make_bridge(sock)

        bridge.update_display()

        self.assertEqual(len(sock.sent), 1)
        self.assertEqual(sock.sent[0]["id"], "r1")
        self.assertTrue(sock.sent[0]["ok"])
        self.assertIn("version", sock.sent[0]["result"])

    def test_empty_socket_is_a_no_op(self):
        sock = FakeNonBlockingSocket([])
        bridge = _make_bridge(sock)

        bridge.update_display()  # must not raise or block

        self.assertEqual(sock.sent, [])

    def test_caps_requests_per_tick(self):
        sock = FakeNonBlockingSocket([_request("r%d" % i, "ping") for i in range(10)])
        bridge = _make_bridge(sock)

        bridge._poll_socket(max_items=8)
        self.assertEqual(len(sock.sent), 8)

        bridge._poll_socket(max_items=8)
        self.assertEqual([m["id"] for m in sock.sent[8:]], ["r8", "r9"])

    def test_invalid_json_gets_an_error_reply(self):
        sock = FakeNonBlockingSocket([b"not json"])
        bridge = _make_bridge(sock)

        bridge.update_display()

        self.assertFalse(sock.sent[0]["ok"])
        self.assertEqual(sock.sent[0]["error"]["code"], "INVALID_ARGS")

    def test_missing_op_gets_an_error_reply_with_its_id(self):
        sock = FakeNonBlockingSocket([json.dumps({"id": "r2"}).encode("utf-8")])
        bridge = _make_bridge(sock)

        bridge.update_display()

        self.assertEqual(sock.sent[0]["id"], "r2")
        self.assertEqual(sock.sent[0]["error"]["code"], "INVALID_ARGS")

    def test_non_object_json_gets_an_error_reply(self):
        sock = FakeNonBlockingSocket([b"[1, 2]"])
        bridge = _make_bridge(sock)

        bridge.update_display()

        self.assertIsNone(sock.sent[0]["id"])
        self.assertEqual(sock.sent[0]["error"]["code"], "INVALID_ARGS")

    def test_recv_error_is_skipped_and_polling_continues(self):
        sock = FakeNonBlockingSocket([ConnectionResetError(54, "reset"), _request("r3", "ping")])
        bridge = _make_bridge(sock)

        bridge.update_display()

        self.assertEqual([m["id"] for m in sock.sent], ["r3"])

    def test_unknown_op_is_answered_not_raised(self):
        sock = FakeNonBlockingSocket([_request("r4", "nope")])
        bridge = _make_bridge(sock)

        bridge.update_display()

        self.assertEqual(sock.sent[0]["error"]["code"], "INVALID_ARGS")

    def test_tick_never_raises(self):
        bridge = _make_bridge(FakeNonBlockingSocket([]))
        bridge._poll_socket = lambda: (_ for _ in ()).throw(RuntimeError("boom"))

        bridge.update_display()  # swallowed and logged

    def test_closed_socket_is_a_no_op(self):
        bridge = _make_bridge(None)

        bridge.update_display()


if __name__ == "__main__":
    unittest.main()
