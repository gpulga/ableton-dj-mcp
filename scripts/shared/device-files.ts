// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

// The files that make up the installed Max for Live device. Single source for
// install-device (User Library copy) and package-release (release zip).

import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

export const repoRoot = resolve(here, "../..");
export const deviceSourceDir = join(repoRoot, "max-for-live-device");
export const distDir = join(repoRoot, "dist");
export const bridgeSourceDir = join(repoRoot, "live_browser_bridge");

/** Folder name Live shows under Control Surface for the Python bridge. */
export const BRIDGE_SURFACE_NAME = "AbletonDjMcp";

/** Bridge entries that must not ship inside Live's load path. */
export const BRIDGE_EXCLUDED = ["tests", "__pycache__"];

const STATIC_FILES = [
  "Ableton_DJ_MCP.amxd",
  "server-status.maxpat",
  "tab-main.maxpat",
  "tab-context.maxpat",
  "tab-setup.maxpat",
] as const;

const BUILT_FILES = ["live-api-adapter.js", "mcp-server.mjs"] as const;

/** Every device file with the directory it is copied from. */
export const DEVICE_FILES = [
  ...STATIC_FILES.map((file) => ({ file, dir: deviceSourceDir })),
  ...BUILT_FILES.map((file) => ({ file, dir: distDir })),
];
