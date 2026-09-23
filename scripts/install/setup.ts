// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

// One-command end-user setup. Runs from a fresh clone — no `npm install` or
// build needed, because dist/ is committed and the installers only use Node
// built-ins.
//
//   1. Installs the Max for Live device into Live's User Library
//   2. Installs the Python browser bridge into Live's Remote Scripts
//   3. Prints the exact commands to connect an AI client, with this clone's
//      absolute portal path filled in

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir, platform } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MIN_NODE_MAJOR = 24;

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../..");
const portalPath = join(repoRoot, "dist", "ableton-dj-mcp-portal.js");

/**
 * Exit with a clear message when Node is older than the supported version.
 */
function assertNodeVersion(): void {
  const major = Number(process.versions.node.split(".")[0]);

  if (major < MIN_NODE_MAJOR) {
    console.error(
      `setup: Node ${MIN_NODE_MAJOR}+ required, found ${process.versions.node}. ` +
        "Install the current LTS from https://nodejs.org and re-run.",
    );
    process.exit(1);
  }
}

/**
 * Run a sibling install script with the current Node binary, exiting on failure.
 * @param script - File name inside scripts/
 */
function runStep(script: string): void {
  console.log(`\n== ${script} ==`);
  const result = spawnSync(process.execPath, [join(here, script)], {
    stdio: "inherit",
  });

  if (result.status !== 0) {
    console.error(`setup: ${script} failed (exit ${result.status}).`);
    process.exit(result.status ?? 1);
  }
}

/**
 * Path of the Claude Desktop config file for this OS.
 * @returns Absolute path, or a description when the OS is unsupported
 */
function claudeDesktopConfigPath(): string {
  if (platform() === "win32") {
    return String.raw`%APPDATA%\Claude\claude_desktop_config.json`;
  }

  return join(
    homedir(),
    "Library",
    "Application Support",
    "Claude",
    "claude_desktop_config.json",
  );
}

/**
 * Print the per-client connection instructions with real paths filled in.
 */
function printClientInstructions(): void {
  const desktopConfig = {
    mcpServers: {
      "ableton-dj-mcp": { command: "node", args: [portalPath] },
    },
  };

  console.log("\n== Connect your AI client ==");
  console.log("\nClaude Code:");
  console.log(`  claude mcp add ableton-dj-mcp -- node "${portalPath}"`);
  console.log(`\nClaude Desktop — merge into ${claudeDesktopConfigPath()}:`);
  console.log(
    JSON.stringify(desktopConfig, null, 2)
      .split("\n")
      .map((line) => `  ${line}`)
      .join("\n"),
  );
  console.log("\nOther MCP clients (stdio):");
  console.log(`  node "${portalPath}"`);
}

/**
 * Print the manual steps inside Ableton Live that no script can do.
 */
function printLiveSteps(): void {
  console.log("\n== Finish in Ableton Live ==");
  console.log("  1. Restart Live.");
  console.log(
    "  2. Settings → Link, Tempo & MIDI → Control Surface → pick 'AbletonDjMcp'.",
  );
  console.log(
    "  3. Browser → Max for Live → Max MIDI Effect → drag 'Ableton_DJ_MCP' onto a track.",
  );
  console.log("     Wait for 'MCP server running on :3350'.");
  console.log(
    "  4. (Recommended) File → Save Live Set as Default Set, so every new set has the device.",
  );
  console.log('\nThen ask your AI: "connect to ableton".\n');
}

assertNodeVersion();

if (!existsSync(portalPath)) {
  console.error(
    `setup: missing ${portalPath}. Your clone looks incomplete — re-clone the repo.`,
  );
  process.exit(1);
}

runStep("install-device.ts");
runStep("install-bridge.ts");
printLiveSteps();
printClientInstructions();
