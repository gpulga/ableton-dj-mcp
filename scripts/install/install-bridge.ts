// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

// Installs the Live Browser Bridge Python remote script into Ableton's
// per-user Remote Scripts directory.
//
//   Source: live_browser_bridge/   (repo root, ships verbatim)
//   Dest:   <Live User Library>/Remote Scripts/AbletonDjMcp/
//
// Live discovers the surface by directory name; the dest dir name is the
// label that appears in Preferences → Link/Tempo/MIDI → Control Surface.
// The remote-script entry point is __init__.py exposing create_instance.

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { platform } from "node:os";
import { join } from "node:path";
import {
  BRIDGE_EXCLUDED,
  BRIDGE_SURFACE_NAME,
  bridgeSourceDir as sourceDir,
} from "../shared/device-files.ts";
import { resolveRemoteScriptsDir } from "../shared/user-library-path.ts";

if (!existsSync(sourceDir)) {
  console.error(`install-bridge failed: missing source dir ${sourceDir}`);
  process.exit(1);
}

const targetRoot = resolveRemoteScriptsDir();

if (targetRoot === null) {
  console.error(
    `install-bridge: unsupported platform '${platform()}'. ` +
      "Ableton Live runs on macOS or Windows only.",
  );
  process.exit(1);
}

const targetDir = join(targetRoot, BRIDGE_SURFACE_NAME);

if (!existsSync(targetRoot)) {
  mkdirSync(targetRoot, { recursive: true });
}

if (existsSync(targetDir)) {
  // Wipe a stale install so removed files don't linger. Only deletes inside
  // our own surface dir, never the parent Remote Scripts dir.
  rmSync(targetDir, { recursive: true, force: true });
}

mkdirSync(targetDir, { recursive: true });

copyTree(sourceDir, targetDir, BRIDGE_EXCLUDED);

console.log("");
console.log(`Installed bridge to: ${targetDir}`);
console.log("");
console.log("Next steps:");
console.log("  1. Quit Ableton Live if it is running.");
console.log("  2. Start Live (`npm run start:live` or open it manually).");
console.log("  3. Live → Preferences → Link/Tempo/MIDI →");
console.log("     pick 'AbletonDjMcp' under Control Surface.");
console.log("");
console.log(
  "After enabling, the bridge listens on udp:11077 (override with " +
    "ADJ_BRIDGE_PORT). adj-browse and adj-create-device --browserUri are " +
    "then available.",
);

interface CopyOptions {
  excludedSegments: Set<string>;
}

/**
 * Recursively copy a directory tree.
 * @param fromDir - Source directory
 * @param toDir - Destination directory (must already exist)
 * @param excluded - Directory or file names to skip at any depth
 */
function copyTree(fromDir: string, toDir: string, excluded: string[]): void {
  const opts: CopyOptions = { excludedSegments: new Set(excluded) };

  copyTreeImpl(fromDir, toDir, opts);
}

/**
 * Internal recursive worker for copyTree.
 * @param fromDir - Source directory
 * @param toDir - Destination directory (must exist)
 * @param opts - Excluded segment set, computed once by copyTree
 */
function copyTreeImpl(fromDir: string, toDir: string, opts: CopyOptions): void {
  for (const entry of readdirSync(fromDir)) {
    if (opts.excludedSegments.has(entry)) continue;
    const sourcePath = join(fromDir, entry);
    const targetPath = join(toDir, entry);
    const info = statSync(sourcePath);

    if (info.isDirectory()) {
      mkdirSync(targetPath, { recursive: true });
      copyTreeImpl(sourcePath, targetPath, opts);
    } else if (info.isFile()) {
      copyFileSync(sourcePath, targetPath);
      console.log(`  copied ${entry}`);
    }
  }
}
