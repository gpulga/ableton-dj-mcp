// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

// Shared resolvers for Live User Library subdirectories. Used by
// scripts/install/install-device.ts, scripts/dev-hot.ts, and scripts/install/install-bridge.ts
// so they all target the same paths on every platform.

import { homedir, platform } from "node:os";
import { join } from "node:path";

/**
 * Resolve the platform-specific root of Live's per-user library, or null on
 * unsupported platforms (Live runs on macOS/Windows only).
 * @returns Absolute path or null
 */
export function resolveUserLibraryRoot(): string | null {
  const home = homedir();

  switch (platform()) {
    case "darwin":
      return join(home, "Music", "Ableton", "User Library");
    case "win32":
      return join(home, "Documents", "Ableton", "User Library");
    default:
      return null;
  }
}

/**
 * Resolve Live's per-user Max MIDI Effect preset directory for the current
 * platform.
 * @returns Absolute path on macOS/Windows, null on unsupported platforms
 */
export function resolveUserLibraryDir(): string | null {
  const root = resolveUserLibraryRoot();

  return root === null
    ? null
    : join(root, "Presets", "MIDI Effects", "Max MIDI Effect");
}

/**
 * Resolve the Remote Scripts directory inside Live's per-user library. This
 * is where Live looks for Python control surface scripts (the browser
 * bridge ships into here).
 * @returns Absolute path or null on unsupported platforms
 */
export function resolveRemoteScriptsDir(): string | null {
  const root = resolveUserLibraryRoot();

  return root === null ? null : join(root, "Remote Scripts");
}
