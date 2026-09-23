---
title: live-python-background-threads-starved
domain: dev
validated: 2026-09-23
evidence:
  "raw UDP ping to live_browser_bridge in Live 12.4.6: 700 ms p50 with a socket
  thread, 100 ms p50 with socket polling in update_display (#326)"
---

## Fact

Live's embedded Python runs background threads very rarely. A remote script that
receives or replies on its own thread adds hundreds of ms to every round trip,
even when the work itself is trivial. Doing non-blocking socket I/O inside
`update_display` (called ~every 100 ms on the main thread) caps a round trip at
one tick.

## Evidence

With the old design (socket thread blocked in `recvfrom` with a 0.25 s timeout,
work queued to the main thread, reply queued back), a no-op `ping` took 614-700
ms (p50 700) over 12 runs; `browse` took the same. After moving receive,
dispatch and reply into `update_display` with a non-blocking socket: ping and
browse 100 ms p50, `adj-automate` write/read/clear 51/92/107 ms.

## Apply when

Changing `live_browser_bridge/BrowserBridge.py` or adding a new remote-script
op: keep all socket I/O on the main-thread tick; don't add threads for I/O.
