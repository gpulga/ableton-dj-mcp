// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

// Loading a sample into Simpler (#94). `sample` and `gainDb` are pseudo-params
// on adj-update-device, named after the fields adj-read-device returns for a
// Simpler, so a read can be fed straight back as a write.

import { isNewerVersion } from "#src/shared/version-check.ts";
import { DEVICE_CLASS } from "#src/tools/constants.ts";
import { dbToLiveGain } from "#src/tools/shared/gain-utils.ts";

/** Simpler's `replace_sample` was added to the Live API in Live 12.4. */
const REPLACE_SAMPLE_MIN_VERSION = "12.4.0";

const SAMPLE_PARAM = "sample";
const GAIN_PARAM = "gaindb";

export type SimplerSampleParam = "sample" | "gainDb";

/**
 * Identify a Simpler pseudo-param by name (case-insensitive)
 * @param name - Param name from a name=value line
 * @returns The pseudo-param, or null for a regular device param
 */
export function simplerSampleParam(name: string): SimplerSampleParam | null {
  const lower = name.trim().toLowerCase();

  if (lower === SAMPLE_PARAM) return "sample";
  if (lower === GAIN_PARAM) return "gainDb";

  return null;
}

/**
 * Load an audio file into a Simpler, replacing its current sample
 * @param device - Simpler device
 * @param filePath - Absolute path to the audio file
 * @returns Why the load was refused, or null when it was sent to Live
 */
export function loadSimplerSample(
  device: LiveAPI,
  filePath: string,
): string | null {
  const path = filePath.trim();

  if (!isAbsolutePath(path)) {
    return `'sample' must be an absolute file path (got "${path}")`;
  }

  const refusal = simplerRefusal(device, "sample");

  if (refusal != null) {
    return refusal;
  }

  // Calling a function this Live doesn't have returns normally and does
  // nothing, so the version has to be checked up front.
  if (!supportsReplaceSample()) {
    return `'sample' requires Live ${REPLACE_SAMPLE_MIN_VERSION} or later`;
  }

  device.call("replace_sample", path);

  return null;
}

/**
 * Set the gain of a Simpler's loaded sample
 * @param device - Simpler device
 * @param dB - Gain in decibels
 * @returns Why the write was refused, or null when it was written
 */
export function setSimplerSampleGain(
  device: LiveAPI,
  dB: string | number,
): string | null {
  if (typeof dB !== "number") {
    return `'gainDb' must be a number in dB (got "${dB}")`;
  }

  const refusal = simplerRefusal(device, "gainDb");

  if (refusal != null) {
    return refusal;
  }

  const sample = device.getChildren("sample")[0];

  if (!sample?.getProperty("file_path")) {
    return `'gainDb' requires a loaded sample`;
  }

  sample.set("gain", dbToLiveGain(dB));

  return null;
}

/**
 * Find the Simpler a drum pad or chain plays: the first Simpler in the chain
 * (a pad's first chain)
 * @param target - DrumPad, DrumChain, or Chain
 * @returns The Simpler device, or null when the chain has none
 */
export function findChainSimpler(target: LiveAPI): LiveAPI | null {
  const chain =
    target.type === "DrumPad" ? target.getChildren("chains")[0] : target;

  if (chain == null) {
    return null;
  }

  return (
    chain
      .getChildren("devices")
      .find(
        (device) =>
          device.getProperty("class_display_name") === DEVICE_CLASS.SIMPLER,
      ) ?? null
  );
}

/**
 * Guard a single-sample Simpler write
 * @param device - Device to write
 * @param param - Pseudo-param name, for the message
 * @returns Why the device can't take the write, or null when it can
 */
function simplerRefusal(device: LiveAPI, param: string): string | null {
  const className = device.getProperty("class_display_name") as string;

  if (className !== DEVICE_CLASS.SIMPLER) {
    return `'${param}' only applies to Simpler (got ${className})`;
  }

  // The Live API can't take Simpler out of multi-sample mode
  if ((device.getProperty("multi_sample_mode") as number) > 0) {
    return `'${param}' is not supported on Simpler in multi-sample mode`;
  }

  return null;
}

/**
 * @returns True when this Live has Simpler's replace_sample
 */
function supportsReplaceSample(): boolean {
  const raw = LiveAPI.from("live_app").call("get_version_string");
  const version = Array.isArray(raw) ? String(raw[0]) : String(raw);

  return !isNewerVersion(version, REPLACE_SAMPLE_MIN_VERSION);
}

/**
 * Whether a path is absolute: POSIX (`/…`) or a Windows drive (`C:\…`, `C:/…`).
 * Live silently loads nothing from a relative path.
 * @param path - Path to check
 * @returns True when the path is absolute
 */
function isAbsolutePath(path: string): boolean {
  return path.startsWith("/") || /^[A-Za-z]:[/\\]/.test(path);
}
