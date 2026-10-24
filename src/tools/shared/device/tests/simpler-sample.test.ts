// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

import { beforeEach, describe, expect, it } from "vitest";
import { dbToLiveGain } from "#src/tools/shared/gain-utils.ts";
import {
  type RegisteredMockObject,
  children,
  livePath,
  registerMockObject,
  updateDevice,
} from "#src/tools/device/update/tests/update-device-test-helpers.ts";

const KICK = "/Users/me/Samples/kick.wav";

/**
 * Register the Live application with a version string
 * @param version - Value get_version_string returns
 */
function registerLiveVersion(version: string): void {
  registerMockObject("live_app", {
    path: "live_app",
    type: "Application",
    methods: { get_version_string: () => version },
  });
}

/**
 * Register a Simpler device
 * @param id - Mock object ID
 * @param properties - Extra properties
 * @returns The registered mock
 */
function registerSimpler(
  id: string,
  properties: Record<string, unknown> = {},
): RegisteredMockObject {
  return registerMockObject(id, {
    path: livePath.track(0).device(0),
    type: "Device",
    properties: {
      class_display_name: "Simpler",
      multi_sample_mode: 0,
      ...properties,
    },
  });
}

describe("updateDevice - Simpler sample", () => {
  beforeEach(() => {
    registerLiveVersion("12.4.1");
  });

  it("loads a sample file into a Simpler", () => {
    const simpler = registerSimpler("sim1");

    const result = updateDevice({ ids: "sim1", params: `sample=${KICK}` });

    expect(simpler.call).toHaveBeenCalledWith("replace_sample", KICK);
    expect(result).toStrictEqual({ id: "sim1" });
  });

  it("matches the sample param case-insensitively", () => {
    const simpler = registerSimpler("sim1");

    updateDevice({ ids: "sim1", params: `Sample = ${KICK}` });

    expect(simpler.call).toHaveBeenCalledWith("replace_sample", KICK);
  });

  it("refuses a relative path", () => {
    const simpler = registerSimpler("sim1");

    updateDevice({ ids: "sim1", params: "sample=Samples/kick.wav" });

    expect(simpler.call).not.toHaveBeenCalledWith(
      "replace_sample",
      expect.anything(),
    );
    expect(outlet).toHaveBeenCalledWith(
      1,
      `updateDevice: 'sample' must be an absolute file path (got "Samples/kick.wav")`,
    );
  });

  it("accepts a Windows drive path", () => {
    const simpler = registerSimpler("sim1");

    updateDevice({ ids: "sim1", params: "sample=C:\\Samples\\kick.wav" });

    expect(simpler.call).toHaveBeenCalledWith(
      "replace_sample",
      "C:\\Samples\\kick.wav",
    );
  });

  it("refuses before Live 12.4", () => {
    registerLiveVersion("12.3.2");
    const simpler = registerSimpler("sim1");

    updateDevice({ ids: "sim1", params: `sample=${KICK}` });

    expect(simpler.call).not.toHaveBeenCalledWith(
      "replace_sample",
      expect.anything(),
    );
    expect(outlet).toHaveBeenCalledWith(
      1,
      "updateDevice: 'sample' requires Live 12.4.0 or later",
    );
  });

  it("refuses a device that is not a Simpler", () => {
    const sampler = registerSimpler("dev1", { class_display_name: "Operator" });

    updateDevice({ ids: "dev1", params: `sample=${KICK}` });

    expect(sampler.call).not.toHaveBeenCalledWith(
      "replace_sample",
      expect.anything(),
    );
    expect(outlet).toHaveBeenCalledWith(
      1,
      "updateDevice: 'sample' only applies to Simpler (got Operator)",
    );
  });

  it("refuses a Simpler in multi-sample mode", () => {
    registerSimpler("sim1", { multi_sample_mode: 1 });

    updateDevice({ ids: "sim1", params: `sample=${KICK}` });

    expect(outlet).toHaveBeenCalledWith(
      1,
      "updateDevice: 'sample' is not supported on Simpler in multi-sample mode",
    );
  });

  describe("gainDb", () => {
    let sample: RegisteredMockObject;

    beforeEach(() => {
      registerSimpler("sim1", { sample: children("smp1") });
      sample = registerMockObject("smp1", {
        properties: { file_path: KICK, gain: 0.4 },
      });
    });

    it("sets the loaded sample's gain in dB", () => {
      updateDevice({ ids: "sim1", params: "gainDb=-6" });

      expect(sample.set).toHaveBeenCalledWith("gain", dbToLiveGain(-6));
    });

    it("loads the sample before setting gain, whatever the line order", () => {
      const simpler = registerSimpler("sim1", { sample: children("smp1") });
      const order: string[] = [];

      simpler.call.mockImplementation((method: string) => {
        order.push(method);

        return method === "get_version_string" ? "12.4.1" : null;
      });
      sample.set.mockImplementation((prop: string) => order.push(prop));

      updateDevice({ ids: "sim1", params: `gainDb=-3\nsample=${KICK}` });

      expect(order).toStrictEqual(["replace_sample", "gain"]);
    });

    it("refuses a non-numeric gain", () => {
      updateDevice({ ids: "sim1", params: "gainDb=loud" });

      expect(sample.set).not.toHaveBeenCalled();
      expect(outlet).toHaveBeenCalledWith(
        1,
        `updateDevice: 'gainDb' must be a number in dB (got "loud")`,
      );
    });

    it("refuses when no sample is loaded", () => {
      registerSimpler("sim2", { sample: children() });

      updateDevice({ ids: "sim2", params: "gainDb=-6" });

      expect(outlet).toHaveBeenCalledWith(
        1,
        "updateDevice: 'gainDb' requires a loaded sample",
      );
    });
  });

  describe("on a drum pad or chain", () => {
    it("applies params to the Simpler in a drum pad's first chain", () => {
      registerMockObject("pad1", {
        type: "DrumPad",
        properties: { chains: children("chain1") },
      });
      registerMockObject("chain1", {
        type: "DrumChain",
        properties: { devices: children("fx1", "sim1") },
      });
      registerMockObject("fx1", {
        properties: { class_display_name: "Saturator" },
      });
      const simpler = registerSimpler("sim1");

      const result = updateDevice({ ids: "pad1", params: `sample=${KICK}` });

      expect(simpler.call).toHaveBeenCalledWith("replace_sample", KICK);
      expect(result).toStrictEqual({ id: "pad1" });
    });

    it("applies params to the Simpler in a chain", () => {
      registerMockObject("chain1", {
        type: "DrumChain",
        properties: { devices: children("sim1") },
      });
      const simpler = registerSimpler("sim1");

      updateDevice({ ids: "chain1", params: `sample=${KICK}` });

      expect(simpler.call).toHaveBeenCalledWith("replace_sample", KICK);
    });

    it("warns when the pad has no Simpler", () => {
      registerMockObject("pad1", {
        type: "DrumPad",
        properties: { chains: children() },
      });

      const result = updateDevice({ ids: "pad1", params: `sample=${KICK}` });

      expect(outlet).toHaveBeenCalledWith(
        1,
        "updateDevice: 'params' on a DrumPad applies to its Simpler, and it has none. Add one with adj-create-device deviceName=Simpler at this path first",
      );
      expect(result).toStrictEqual({ id: "pad1" });
    });
  });
});
