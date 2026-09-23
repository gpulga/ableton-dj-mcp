// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

// Installs the Max for Live device into Ableton's User Library so it shows up
// in the browser permanently. Eliminates the per-session Finder drag.
//
// Source:  max-for-live-device/Ableton_DJ_MCP.amxd + *.maxpat (static assets)
//          dist/live-api-adapter.js + dist/mcp-server.mjs (built bundles)
// Dest:    <Live User Library>/Presets/MIDI Effects/Max MIDI Effect/
//
// Idempotent: overwrites existing files of the same name.

import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { platform } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveUserLibraryDir } from "../shared/user-library-path.ts";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../..");
const sourceDir = join(repoRoot, "max-for-live-device");
const distDir = join(repoRoot, "dist");

const STATIC_FILES = [
  "Ableton_DJ_MCP.amxd",
  "server-status.maxpat",
  "tab-main.maxpat",
  "tab-context.maxpat",
  "tab-setup.maxpat",
] as const;

const BUILT_FILES = ["live-api-adapter.js", "mcp-server.mjs"] as const;

const DEVICE_FILES = [
  ...STATIC_FILES.map((file) => ({ file, dir: sourceDir })),
  ...BUILT_FILES.map((file) => ({ file, dir: distDir })),
];

/**
 * Verify all source files exist before copying.
 */
function assertSourcesExist(): void {
  for (const { file, dir } of DEVICE_FILES) {
    const sourcePath = join(dir, file);

    if (!existsSync(sourcePath)) {
      console.error(`install-device failed: missing ${sourcePath}`);
      console.error(
        dir === distDir
          ? "Run `npm run build` first."
          : "max-for-live-device/ is missing a tracked asset — check your clone.",
      );
      process.exit(1);
    }
  }
}

assertSourcesExist();

const targetDir = resolveUserLibraryDir();

if (targetDir === null) {
  console.error(
    `install-device: unsupported platform '${platform()}'. ` +
      `Ableton Live runs on macOS or Windows only.`,
  );
  process.exit(1);
}

if (!existsSync(targetDir)) {
  mkdirSync(targetDir, { recursive: true });
  console.log(`install-device: created ${targetDir}`);
}

for (const { file, dir } of DEVICE_FILES) {
  const sourcePath = join(dir, file);
  const targetPath = join(targetDir, file);

  copyFileSync(sourcePath, targetPath);
  console.log(`  copied ${file}`);
}

console.log("");
console.log(`Installed to: ${targetDir}`);
console.log("");
console.log("Next steps:");
console.log("  1. Restart Ableton Live (or refresh User Library in Browser)");
console.log("  2. In Live's browser: Categories → Max for Live → Max MIDI");
console.log("     Effect → 'Ableton DJ MCP' should appear");
console.log("  3. Drag onto any MIDI track to load");
console.log("");
console.log(
  "Optional: open a Live set with the device on a return track, then",
);
console.log(
  "File → Save Live Set as Default Set. Every new Live set will then",
);
console.log("auto-load the device.");
