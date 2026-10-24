// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

import { livePath } from "#src/shared/live-api-path-builders.ts";
import { noteNameToMidi } from "#src/shared/pitch.ts";
import * as console from "#src/shared/v8-max-console.ts";
import { select } from "#src/tools/control/select.ts";
import { findChainSimpler } from "#src/tools/shared/device/simpler-sample.ts";
import {
  parseCommaSeparatedIds,
  unwrapSingleResult,
} from "#src/tools/shared/utils.ts";
import {
  getColorForIndex,
  parseCommaSeparatedColors,
} from "#src/tools/shared/validation/color-utils.ts";
import { validateExclusiveParams } from "#src/tools/shared/validation/id-validation.ts";
import {
  getNameForIndex,
  parseNames,
} from "#src/tools/shared/validation/name-utils.ts";
import {
  applyOrWarnSidechainRouting,
  moveDeviceToPath,
  moveDrumChainToPath,
  setParamValues,
  updateABCompare,
  // updateCollapsedState, // Kept for potential future use
  updateMacroCount,
  updateMacroVariation,
} from "./helpers/update-device-helpers.ts";
import {
  type ResolvedTarget,
  resolveIdToTarget,
  resolvePathToTargetSafe,
} from "./helpers/update-device-target-resolution-helpers.ts";
import {
  isChainType,
  isDeviceType,
  isRackDevice,
  isValidUpdateType,
  warnIfSet,
} from "./helpers/update-device-type-helpers.ts";
import { wrapDevicesInRack } from "./helpers/update-device-wrap-helpers.ts";

interface UpdateProperties {
  toPath?: string;
  name?: string;
  // collapsed?: boolean; // Kept for potential future use
  params?: string;
  macroVariation?: string;
  macroVariationIndex?: number;
  macroCount?: number;
  abCompare?: string;
  mute?: boolean;
  solo?: boolean;
  color?: string;
  chokeGroup?: number;
  mappedPitch?: string;
  sidechainInputRoutingTypeId?: string;
  sidechainInputRoutingChannelId?: string;
}

interface UpdateDeviceArgs extends UpdateProperties {
  ids?: string;
  path?: string;
  wrapInRack?: boolean;
  focus?: boolean;
}

interface UpdateOptions extends UpdateProperties {
  isDrumPadPath?: boolean;
}

/**
 * Update device(s), chain(s), or drum pad(s) by ID or path
 * @param args - The parameters
 * @param args.ids - Comma-separated ID(s)
 * @param args.path - Device/chain/drum-pad path
 * @param args.toPath - Move device to this path (devices only)
 * @param args.name - Display name (not drum pads)
 * @param args.params - JSON: {"paramName": value} (devices only)
 * @param args.macroVariation - Rack variation action (racks only)
 * @param args.macroVariationIndex - Rack variation index (racks only)
 * @param args.macroCount - Rack visible macro count 0-16 (racks only)
 * @param args.abCompare - A/B Compare action (devices only)
 * @param args.mute - Mute state (chains/drum pads only)
 * @param args.solo - Solo state (chains/drum pads only)
 * @param args.color - Color #RRGGBB (chains only)
 * @param args.chokeGroup - Choke group 0-16 (drum chains only)
 * @param args.mappedPitch - Output MIDI note (drum chains only)
 * @param args.sidechainInputRoutingTypeId - Sidechain input source track identifier (Compressor only)
 * @param args.sidechainInputRoutingChannelId - Sidechain input channel identifier (Compressor only)
 * @param args.wrapInRack - Wrap device(s) in a new rack
 * @param args.focus - Select the device and show device detail view
 * @param _context - Internal context object (unused)
 * @returns Updated object info(s)
 */
export function updateDevice(
  {
    ids,
    path,
    toPath,
    name,
    params,
    macroVariation,
    macroVariationIndex,
    macroCount,
    abCompare,
    mute,
    solo,
    color,
    chokeGroup,
    mappedPitch,
    sidechainInputRoutingTypeId,
    sidechainInputRoutingChannelId,
    wrapInRack,
    focus,
  }: UpdateDeviceArgs,
  _context: Partial<ToolContext> = {},
): Record<string, unknown> | Record<string, unknown>[] | null {
  validateExclusiveParams(ids, path, "ids", "path");

  const wasOverridden = params != null && isAutomationOverridden();
  let result: Record<string, unknown> | Record<string, unknown>[] | null;

  if (wrapInRack) {
    result = wrapDevicesInRack({ ids, path, toPath, name }) as Record<
      string,
      unknown
    > | null;
  } else {
    const items = parseCommaSeparatedIds(path ?? ids);
    const parsedNames = parseNames(name, items.length, "updateDevice");
    const parsedColors = parseCommaSeparatedColors(color, items.length);

    const updateOptions: UpdateOptions = {
      toPath,
      name,
      params,
      macroVariation,
      macroVariationIndex,
      macroCount,
      abCompare,
      mute,
      solo,
      color,
      chokeGroup,
      mappedPitch,
      sidechainInputRoutingTypeId,
      sidechainInputRoutingChannelId,
    };

    result = updateMultipleTargets(
      items,
      path ? resolvePathToTargetSafe : resolveIdToTarget,
      path ? "path" : "id",
      updateOptions,
      parsedNames,
      parsedColors,
    );
  }

  if (params != null && !wasOverridden && isAutomationOverridden()) {
    console.warn(
      "updateDevice: this write overrode automation. Live stops playing automation and clip envelopes on the changed params until re-enabled (adj-playback action re-enable-automation). Finish sound design before automating, or re-enable after",
    );
  }

  if (focus && result != null) {
    const lastResult = Array.isArray(result) ? result.at(-1) : result;
    const lastId = lastResult?.id as string | undefined;

    if (lastId) {
      select({ deviceId: lastId, detailView: "device" });
    }
  }

  return result;
}

/**
 * @returns Whether Live is overriding automation (its Re-Enable Automation
 *   button is lit)
 */
function isAutomationOverridden(): boolean {
  return (
    (LiveAPI.from(livePath.liveSet).getProperty(
      "re_enable_automation_enabled",
    ) as number) > 0
  );
}

/**
 * Update multiple targets with common logic for path/ID resolution
 * @param items - Array of paths or IDs
 * @param resolveItem - Function to resolve item to ResolvedTarget
 * @param itemType - "path" or "id" for error messages
 * @param updateOptions - Options to pass to updateTarget
 * @param parsedNames - Comma-separated names array, or null
 * @param parsedColors - Comma-separated colors array, or null
 * @returns Single result or array of results
 */
function updateMultipleTargets(
  items: string[],
  resolveItem: (item: string) => ResolvedTarget | null,
  itemType: string,
  updateOptions: UpdateOptions,
  parsedNames: string[] | null,
  parsedColors: string[] | null,
): Record<string, unknown> | Record<string, unknown>[] {
  const results: Record<string, unknown>[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i] as string;
    const resolved = resolveItem(item);

    if (!resolved) {
      console.warn(`updateDevice: target not found at ${itemType} "${item}"`);
      continue;
    }

    // Merge resolution metadata (like isDrumPadPath) into options
    const optionsWithMetadata: UpdateOptions = {
      ...updateOptions,
      name: getNameForIndex(updateOptions.name, i, parsedNames),
      color: getColorForIndex(updateOptions.color, i, parsedColors),
      isDrumPadPath: resolved.isDrumPadPath,
    };

    const result = updateTarget(resolved.target, optionsWithMetadata);

    if (result) {
      results.push(result);
    }
  }

  return unwrapSingleResult(results);
}

/**
 * Update a single target (device, chain, or drum pad)
 * @param target - Live API object to update
 * @param options - Update options
 * @returns Result with ID or null if update failed
 */
function updateTarget(
  target: LiveAPI,
  options: UpdateOptions,
): { id: string } | null {
  const type = target.type;

  // Validate type is updatable
  if (!isValidUpdateType(type)) {
    console.warn(`cannot update ${type} objects`);

    return null;
  }

  // Handle move operation first (before other updates)
  if (options.toPath != null) {
    if (isDeviceType(type)) {
      moveDeviceToPath(target, options.toPath);
    } else if (type === "DrumChain") {
      moveDrumChainToPath(
        target,
        options.toPath,
        Boolean(options.isDrumPadPath),
      );
    } else {
      console.warn(`cannot move ${type}`);
    }
  }

  // Name works on devices and chains, but DrumPad names are read-only
  if (options.name != null) {
    if (type === "DrumPad") {
      console.warn("updateDevice: 'name' is read-only for DrumPad");
    } else {
      target.set("name", options.name);
    }
  }

  if (isDeviceType(type)) {
    updateDeviceProperties(target, type, options);
  } else {
    updateNonDeviceProperties(target, type, options);
  }

  return { id: target.id };
}

/**
 * Update device-specific properties
 * @param target - Device to update
 * @param type - Device type
 * @param options - Update options
 */
function updateDeviceProperties(
  target: LiveAPI,
  type: string,
  options: UpdateOptions,
): void {
  const {
    params,
    macroVariation,
    macroVariationIndex,
    macroCount,
    abCompare,
    mute,
    solo,
    color,
    chokeGroup,
    mappedPitch,
    sidechainInputRoutingTypeId,
    sidechainInputRoutingChannelId,
  } = options;

  // collapsed — kept for potential future use
  // if (options.collapsed != null) {
  //   updateCollapsedState(target, options.collapsed);
  // }

  if (params != null) {
    setParamValues(target, params);
  }

  if (abCompare != null) {
    updateABCompare(target, abCompare);
  }

  // Rack-only properties
  if (isRackDevice(type)) {
    if (macroVariation != null || macroVariationIndex != null) {
      updateMacroVariation(target, macroVariation, macroVariationIndex);
    }

    if (macroCount != null) {
      updateMacroCount(target, macroCount);
    }
  } else {
    warnIfSet("macroVariation", macroVariation, type);
    warnIfSet("macroVariationIndex", macroVariationIndex, type);
    warnIfSet("macroCount", macroCount, type);
  }

  // Compressor-only: sidechain input routing
  applyOrWarnSidechainRouting(
    target,
    type,
    sidechainInputRoutingTypeId,
    sidechainInputRoutingChannelId,
  );

  // Warn for non-device properties on devices
  warnIfSet("mute", mute, type);
  warnIfSet("solo", solo, type);
  warnIfSet("color", color, type);
  warnIfSet("chokeGroup", chokeGroup, type);
  warnIfSet("mappedPitch", mappedPitch, type);
}

/**
 * Update chain/drum pad properties
 * @param target - Chain or drum pad to update
 * @param type - Target type
 * @param options - Update options
 */
function updateNonDeviceProperties(
  target: LiveAPI,
  type: string,
  options: UpdateOptions,
): void {
  if (options.params != null) {
    applyParamsToChainSimpler(target, type, options.params);
  }

  // Warn for device-only properties
  warnIfSet("macroVariation", options.macroVariation, type);
  warnIfSet("macroVariationIndex", options.macroVariationIndex, type);
  warnIfSet("macroCount", options.macroCount, type);
  warnIfSet("abCompare", options.abCompare, type);
  // Never applicable here (Chain/DrumPad types), always warns
  applyOrWarnSidechainRouting(
    target,
    type,
    options.sidechainInputRoutingTypeId,
    options.sidechainInputRoutingChannelId,
  );

  // Mute/solo work on Chain, DrumChain, DrumPad
  if (options.mute != null) {
    target.set("mute", options.mute ? 1 : 0);
  }

  if (options.solo != null) {
    target.set("solo", options.solo ? 1 : 0);
  }

  // Color works on Chain and DrumChain (not DrumPad)
  if (isChainType(type)) {
    if (options.color != null) {
      target.setColor(options.color);
    }
  } else {
    warnIfSet("color", options.color, type);
  }

  // DrumChain only: chokeGroup, mappedPitch
  if (type === "DrumChain") {
    updateDrumChainProperties(target, options);
  } else {
    warnIfSet("chokeGroup", options.chokeGroup, type);
    warnIfSet("mappedPitch", options.mappedPitch, type);
  }
}

/**
 * Update drum chain properties: choke group and output note
 * @param target - DrumChain to update
 * @param options - Update options
 */
function updateDrumChainProperties(
  target: LiveAPI,
  options: UpdateOptions,
): void {
  if (options.chokeGroup != null) {
    target.set("choke_group", options.chokeGroup);
  }

  if (options.mappedPitch != null) {
    const midiNote = noteNameToMidi(options.mappedPitch);

    if (midiNote != null) {
      target.set("out_note", midiNote);
    } else {
      console.warn(`updateDevice: invalid note name "${options.mappedPitch}"`);
    }
  }
}

/**
 * Apply params on a drum pad or chain to the Simpler it plays, so a pad path
 * can take `sample=<file>` directly
 * @param target - DrumPad, DrumChain, or Chain
 * @param type - Target type
 * @param params - name=value lines
 */
function applyParamsToChainSimpler(
  target: LiveAPI,
  type: string,
  params: string,
): void {
  const simpler = findChainSimpler(target);

  if (simpler == null) {
    console.warn(
      `updateDevice: 'params' on a ${type} applies to its Simpler, and it has none. Add one with adj-create-device deviceName=Simpler at this path first`,
    );

    return;
  }

  setParamValues(simpler, params);
}
