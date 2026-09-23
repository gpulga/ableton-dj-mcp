// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

// Builds the two release assets from the committed dist/ + device sources:
//
//   release/ableton-dj-mcp-<version>.zip   device files + Python bridge, laid
//                                          out like Live's User Library
//   release/ableton-dj-mcp-<version>.mcpb  Claude Desktop extension (portal +
//                                          manifest), installs by double-click
//
// Requires `zip` on PATH (macOS and the ubuntu CI runner ship it) and network
// access for `npx @anthropic-ai/mcpb`.

import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, join } from "node:path";
import {
  BRIDGE_EXCLUDED,
  BRIDGE_SURFACE_NAME,
  bridgeSourceDir,
  DEVICE_FILES,
  distDir,
  repoRoot,
} from "../shared/device-files.ts";

const MCPB_CLI = "@anthropic-ai/mcpb@2.1.2";
const PORTAL_FILE = "ableton-dj-mcp-portal.js";
const DEVICE_FOLDER = join("Presets", "MIDI Effects", "Max MIDI Effect");

const pkg = JSON.parse(
  readFileSync(join(repoRoot, "package.json"), "utf8"),
) as { version: string; homepage: string; description: string };

const outDir = join(repoRoot, "release");
const stageDir = join(outDir, "stage");
const baseName = `ableton-dj-mcp-${pkg.version}`;

/**
 * Run a command, exiting the script with its status on failure.
 * @param command - Executable name
 * @param args - Arguments
 * @param cwd - Working directory
 */
function run(command: string, args: string[], cwd: string): void {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.status !== 0) {
    console.error(`package-release: '${command}' failed (${result.status}).`);
    process.exit(result.status ?? 1);
  }
}

/**
 * Stage and zip the device + bridge in User Library layout.
 * @returns Path to the created zip
 */
function packageZip(): string {
  const root = join(stageDir, baseName);
  const deviceDir = join(root, DEVICE_FOLDER);
  const bridgeDir = join(root, "Remote Scripts", BRIDGE_SURFACE_NAME);

  mkdirSync(deviceDir, { recursive: true });

  for (const { file, dir } of DEVICE_FILES) {
    copyFileSync(join(dir, file), join(deviceDir, file));
  }

  cpSync(bridgeSourceDir, bridgeDir, {
    recursive: true,
    filter: (source) => !BRIDGE_EXCLUDED.includes(basename(source)),
  });
  copyFileSync(join(repoRoot, "LICENSE"), join(root, "LICENSE"));
  writeFileSync(join(root, "INSTALL.txt"), installText());

  const zipPath = join(outDir, `${baseName}.zip`);

  run("zip", ["-rqX", zipPath, baseName], stageDir);

  return zipPath;
}

/**
 * Stage the portal with a manifest and pack it as a Claude Desktop extension.
 * @returns Path to the created .mcpb
 */
function packageMcpb(): string {
  const root = join(stageDir, "mcpb");

  mkdirSync(join(root, "server"), { recursive: true });
  copyFileSync(join(distDir, PORTAL_FILE), join(root, "server", PORTAL_FILE));
  copyFileSync(join(repoRoot, "LICENSE"), join(root, "LICENSE"));
  writeFileSync(
    join(root, "manifest.json"),
    `${JSON.stringify(mcpbManifest(), null, 2)}\n`,
  );

  const mcpbPath = join(outDir, `${baseName}.mcpb`);

  run("npx", ["-y", MCPB_CLI, "pack", root, mcpbPath], repoRoot);

  return mcpbPath;
}

/**
 * Claude Desktop extension manifest (MCPB spec 0.4).
 * @returns Manifest object
 */
function mcpbManifest(): Record<string, unknown> {
  return {
    manifest_version: "0.4",
    name: "ableton-dj-mcp",
    display_name: "Ableton DJ MCP",
    version: pkg.version,
    description: pkg.description,
    long_description:
      "Lets Claude read and edit your open Ableton Live set: tracks, clips, " +
      "MIDI notes, devices, scenes, automation and playback.\n\n" +
      "**Also needed:** the Max for Live device inside Live. Download " +
      `\`${baseName}.zip\` from the same release and follow its INSTALL.txt.`,
    author: { name: "Gabriel Pulga", url: "https://github.com/gpulga" },
    repository: { type: "git", url: `${pkg.homepage}.git` },
    homepage: pkg.homepage,
    documentation: `${pkg.homepage}/blob/main/docs/Setup.md`,
    support: `${pkg.homepage}/issues`,
    license: "GPL-3.0-or-later",
    keywords: ["ableton", "ableton-live", "music", "midi", "max-for-live"],
    server: {
      type: "node",
      entry_point: `server/${PORTAL_FILE}`,
      mcp_config: {
        command: "node",
        args: [`\${__dirname}/server/${PORTAL_FILE}`],
        env: { ADJ_AUTO_BOOT: "${user_config.auto_boot}" },
      },
    },
    user_config: {
      auto_boot: {
        type: "boolean",
        title: "Auto-launch Ableton Live (macOS)",
        description:
          "Open Live automatically when a tool is used and Live isn't " +
          "running. Needs the device saved in your default Live set.",
        default: false,
        required: false,
      },
    },
    compatibility: {
      platforms: ["darwin", "win32"],
      runtimes: { node: ">=20.0.0" },
    },
  };
}

/**
 * Plain-text install guide shipped inside the zip.
 * @returns INSTALL.txt contents
 */
function installText(): string {
  return `Ableton DJ MCP ${pkg.version}
Lets Claude (or any MCP client) control Ableton Live.
Full guide: ${pkg.homepage}/blob/main/docs/Setup.md

Requires Ableton Live 12.3+ with Max for Live, on macOS or Windows.

1. Copy into your Ableton User Library (merge with existing folders):
     macOS:   ~/Music/Ableton/User Library/
     Windows: Documents\\Ableton\\User Library\\
   The "Presets" and "Remote Scripts" folders in this zip go there as-is.

2. Restart Live. Then:
   - Settings (Preferences) > Link, Tempo & MIDI > Control Surface:
     pick "${BRIDGE_SURFACE_NAME}".
   - Browser > Max for Live > Max MIDI Effect: drag "Ableton_DJ_MCP" onto
     a track (a return track is best). Wait for "MCP server running on :3350".
   - Recommended: File > Save Live Set as Default Set.

3. Connect your AI:
   - Claude Desktop: double-click ${baseName}.mcpb (same release page).
   - Other clients: see the full guide above.

4. Ask your AI: "connect to ableton".
`;
}

for (const { file, dir } of [
  ...DEVICE_FILES,
  { file: PORTAL_FILE, dir: distDir },
]) {
  if (!existsSync(join(dir, file))) {
    console.error(`package-release: missing ${join(dir, file)}`);
    process.exit(1);
  }
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(stageDir, { recursive: true });

const assets = [packageZip(), packageMcpb()];

rmSync(stageDir, { recursive: true, force: true });
console.log("\nRelease assets:");

for (const asset of assets) {
  console.log(`  ${asset}`);
}
