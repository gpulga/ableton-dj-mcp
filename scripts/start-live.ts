// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

// Launches Ableton Live, optionally opening a specific .als file. Cross-platform.
//
// Usage:
//   npm run start:live                  -> open Live with whatever the OS launches by default
//   npm run start:live -- path.als      -> open Live with a specific .als
//
// macOS: uses `open -b com.ableton.live` (works across versions/editions) or
//        `open <path.als>` when a file is supplied.
// Windows: uses `start "" <path.als>` (relies on .als file association). Without
//          a path, falls back to launching the registered .als handler with no
//          file — Live must be installed and the user has done so before.

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { platform } from "node:os";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ABLETON_BUNDLE_ID = "com.ableton.live";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");

const filePath = resolveFileArg(process.argv.slice(2));

if (filePath !== null && !existsSync(filePath)) {
  console.error(`start-live failed: file not found at ${filePath}`);
  process.exit(1);
}

launchLive(filePath);

/**
 * Resolve which .als file (if any) to open. Supports:
 *   <path>          -> any explicit path, resolved against cwd
 *   (no args)       -> null, meaning launch Live with no file
 * @param argv - process.argv.slice(2)
 * @returns Absolute path to the .als file, or null
 */
function resolveFileArg(argv: string[]): string | null {
  if (argv.length === 0) {
    return null;
  }

  const first = argv[0];

  if (first === undefined) {
    return null;
  }

  // Relative paths resolve against INIT_CWD (the user's invocation dir, set by
  // npm) when present, otherwise against the repo root. Avoids process.cwd()
  // per the project's no-restricted-properties rule.
  const baseDir = process.env.INIT_CWD ?? repoRoot;

  return isAbsolute(first) ? first : resolve(baseDir, first);
}

/**
 * Launch Ableton Live, optionally opening a .als file.
 * Spawns detached and exits immediately — does not wait for Live to boot.
 * @param file - Absolute path to a .als file, or null
 */
function launchLive(file: string | null): void {
  const os = platform();

  if (os === "darwin") {
    const args = file === null ? ["-b", ABLETON_BUNDLE_ID] : [file];
    const child = spawn("open", args, { detached: true, stdio: "ignore" });

    child.on("error", (error) => {
      console.error(`start-live: failed to launch Live — ${error.message}`);
      process.exit(1);
    });

    child.unref();
    console.log(
      file === null
        ? `Launched Ableton Live (bundle ${ABLETON_BUNDLE_ID}).`
        : `Launched Ableton Live with ${file}.`,
    );

    return;
  }

  if (os === "win32") {
    if (file === null) {
      console.error(
        "start-live: launching Live without a file is not supported on Windows.",
      );
      console.error("Pass a .als file path or use `--template`.");
      process.exit(1);
    }

    const child = spawn("cmd.exe", ["/c", "start", "", file], {
      detached: true,
      stdio: "ignore",
    });

    child.on("error", (error) => {
      console.error(`start-live: failed to launch Live — ${error.message}`);
      process.exit(1);
    });

    child.unref();
    console.log(`Launched Ableton Live with ${file}.`);

    return;
  }

  console.error(
    `start-live: unsupported platform '${os}'. Ableton Live runs on macOS or Windows only.`,
  );
  process.exit(1);
}
