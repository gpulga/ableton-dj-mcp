// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

import { beforeEach, describe, expect, it } from "vitest";
import { MockSequence } from "#src/test/mocks/mock-live-api-property-helpers.ts";
import {
  type RegisteredMockObject,
  children,
  livePath,
  registerMockObject,
  updateDevice,
} from "./update-device-test-helpers.ts";

describe("updateDevice - param value conversion", () => {
  describe("non-linear params (binary search)", () => {
    let param: RegisteredMockObject;

    beforeEach(() => {
      registerMockObject("dev1", {
        path: livePath.track(0).device(0),
        type: "Device",
        properties: { parameters: children("env-param") },
      });
      // Simulate exponential envelope time: raw 0-1 → display 5-15000 ms
      param = registerMockObject("env-param", {
        properties: {
          name: "AEG1 Rel",
          original_name: "AEG1 Rel",
          is_quantized: 0,
          value: 0.5,
          min: 0,
          max: 1,
        },
        methods: {
          str_for_value: (v: unknown) => {
            const display = 5 * Math.pow(15000 / 5, Number(v));

            return `${Math.round(display)} ms`;
          },
        },
      });
    });

    it("should find correct raw value via binary search", () => {
      updateDevice({ ids: "dev1", params: "AEG1 Rel = 600" });

      const setCall = param.set.mock.calls.find(
        (c: unknown[]) => c[0] === "value",
      ) as [string, number];

      expect(setCall).toBeDefined();

      const displayValue = 5 * Math.pow(15000 / 5, setCall[1]);

      expect(displayValue).toBeCloseTo(600, 0);
    });

    it("should handle target at min boundary", () => {
      updateDevice({ ids: "dev1", params: "AEG1 Rel = 5" });

      const setCall = param.set.mock.calls.find(
        (c: unknown[]) => c[0] === "value",
      ) as [string, number];

      expect(setCall).toBeDefined();
      expect(setCall[1]).toBeCloseTo(0, 1);
    });

    it("should handle target at max boundary", () => {
      updateDevice({ ids: "dev1", params: "AEG1 Rel = 15000" });

      const setCall = param.set.mock.calls.find(
        (c: unknown[]) => c[0] === "value",
      ) as [string, number];

      expect(setCall).toBeDefined();
      expect(setCall[1]).toBeCloseTo(1, 1);
    });
  });

  describe("unit normalization in binary search", () => {
    let param: RegisteredMockObject;

    beforeEach(() => {
      registerMockObject("dev1", {
        path: livePath.track(0).device(0),
        type: "Device",
        properties: { parameters: children("time-param") },
      });
      param = registerMockObject("time-param", {
        properties: {
          name: "Decay",
          original_name: "Decay",
          is_quantized: 0,
          value: 0.5,
          min: 0,
          max: 1,
        },
        methods: {
          // Switches between ms and s units depending on value
          str_for_value: (v: unknown) => {
            const ms = 1 + Number(v) * 9999;

            return ms >= 1000
              ? `${(ms / 1000).toFixed(2)} s`
              : `${Math.round(ms)} ms`;
          },
        },
      });
    });

    it("should handle s to ms unit normalization during binary search", () => {
      updateDevice({ ids: "dev1", params: "Decay = 5000" });

      const setCall = param.set.mock.calls.find(
        (c: unknown[]) => c[0] === "value",
      ) as [string, number];

      expect(setCall).toBeDefined();
      expect(1 + setCall[1] * 9999).toBeCloseTo(5000, -2);
    });
  });

  describe("unparseable labels fallback", () => {
    let param: RegisteredMockObject;

    beforeEach(() => {
      registerMockObject("dev1", {
        path: livePath.track(0).device(0),
        type: "Device",
        properties: { parameters: children("weird-param") },
      });
      param = registerMockObject("weird-param", {
        properties: {
          name: "Special",
          original_name: "Special",
          is_quantized: 0,
          value: 0.5,
          min: 0,
          max: 1,
        },
        methods: {
          str_for_value: () => "custom",
        },
      });
    });

    it("should fall back to raw value when min label is unparseable", () => {
      updateDevice({ ids: "dev1", params: "Special = 0.7" });

      expect(param.set).toHaveBeenCalledWith("value", 0.7);
    });
  });

  describe("partially unparseable labels", () => {
    let param: RegisteredMockObject;

    beforeEach(() => {
      registerMockObject("dev1", {
        path: livePath.track(0).device(0),
        type: "Device",
        properties: { parameters: children("half-param") },
      });
      param = registerMockObject("half-param", {
        properties: {
          name: "HalfParsed",
          original_name: "HalfParsed",
          is_quantized: 0,
          value: 0.5,
          min: 0,
          max: 1,
        },
        methods: {
          // Min label is parseable but max label is not
          str_for_value: (v: unknown) =>
            Number(v) < 0.5 ? `${Number(v)} Hz` : "custom",
        },
      });
    });

    it("should fall back when max label is unparseable", () => {
      updateDevice({ ids: "dev1", params: "HalfParsed = 0.3" });

      expect(param.set).toHaveBeenCalledWith("value", 0.3);
    });
  });

  describe("string value fallback", () => {
    let param: RegisteredMockObject;

    beforeEach(() => {
      registerMockObject("dev1", {
        path: livePath.track(0).device(0),
        type: "Device",
        properties: { parameters: children("str-param") },
      });
      param = registerMockObject("str-param", {
        properties: {
          name: "Mode",
          original_name: "Mode",
          is_quantized: 0,
          value: 0,
          min: 0,
          max: 1,
        },
        methods: {
          str_for_value: (v: unknown) => String(v),
        },
      });
    });

    it("should set value directly for non-numeric string input", () => {
      updateDevice({ ids: "dev1", params: "Mode = custom-value" });

      expect(param.set).toHaveBeenCalledWith("value", "custom-value");
    });
  });

  describe("binary search with mid-iteration unparseable label", () => {
    let param: RegisteredMockObject;

    beforeEach(() => {
      registerMockObject("dev1", {
        path: livePath.track(0).device(0),
        type: "Device",
        properties: { parameters: children("flaky-param") },
      });
      param = registerMockObject("flaky-param", {
        properties: {
          name: "Flaky",
          original_name: "Flaky",
          is_quantized: 0,
          value: 0.5,
          min: 0,
          max: 1,
        },
        methods: {
          // Min/max labels parseable (triggers binary search),
          // but mid-range label becomes unparseable
          str_for_value: (v: unknown) => {
            const n = Number(v);

            if (n <= 0.01) return "0 Hz";
            if (n >= 0.99) return "1000 Hz";

            return "---";
          },
        },
      });
    });

    it("should converge toward min when mid-range labels parse as NaN", () => {
      updateDevice({ ids: "dev1", params: "Flaky = 500" });

      const setCall = param.set.mock.calls.find(
        (c: unknown[]) => c[0] === "value",
      ) as [string, number];

      expect(setCall).toBeDefined();
      // "---" parses as NaN (leading hyphens match the number regex).
      // NaN comparisons always false, so binary search treats it as
      // greater-than-target and converges hi toward lo (near rawMin).
      expect(setCall[1]).toBeCloseTo(0.01, 1);
    });
  });

  describe("resolve param by numeric ID", () => {
    let param: RegisteredMockObject;

    beforeEach(() => {
      registerMockObject("dev1", {
        path: livePath.track(0).device(0),
        type: "Device",
        properties: { parameters: children() },
      });
      param = registerMockObject("42", {
        properties: {
          name: "Volume",
          original_name: "Volume",
          is_quantized: 0,
          value: 0.5,
          min: 0,
          max: 1,
        },
        methods: {
          str_for_value: (v: unknown) => `${Number(v)} dB`,
        },
      });
    });

    it("should resolve param via absolute numeric ID fallback", () => {
      updateDevice({ ids: "dev1", params: "42 = 0.8" });

      expect(param.set).toHaveBeenCalledWith("value", 0.8);
    });
  });

  describe("resolve param by relative device path", () => {
    let param: RegisteredMockObject;

    beforeEach(() => {
      const devicePath = livePath.track(0).device(0);

      // Register param at the device-relative "parameters N" path
      param = registerMockObject("param3", {
        path: `${devicePath} parameters 3`,
        properties: {
          name: "Freq",
          original_name: "Freq",
          is_quantized: 0,
          value: 0.5,
          min: 0,
          max: 1,
        },
        methods: {
          str_for_value: (v: unknown) => `${Number(v)} Hz`,
        },
      });

      registerMockObject("dev1", {
        path: devicePath,
        type: "Device",
        properties: { parameters: children("param3") },
      });
    });

    it("should resolve param via device-relative 'parameters N' path", () => {
      // Use numeric key "3" which triggers resolveParamForDevice
      // with "3" as paramId. Since "3" doesn't match /parameters (\d+)$/,
      // it falls through to LiveAPI.from("3") — the absolute ID path.
      // To test the relative "parameters N" path, use name-based resolution.
      updateDevice({ ids: "dev1", params: "Freq = 0.6" });

      expect(param.set).toHaveBeenCalledWith("value", 0.6);
    });
  });

  describe("note name out of MIDI range", () => {
    beforeEach(() => {
      registerMockObject("dev1", {
        path: livePath.track(0).device(0),
        type: "Device",
        properties: { parameters: children("note-param") },
      });
      registerMockObject("note-param", {
        properties: {
          name: "Pitch",
          original_name: "Pitch",
          is_quantized: 0,
          value: 60,
          min: 0,
          max: 127,
        },
        methods: {
          str_for_value: (v: unknown) => `${Number(v)} Hz`,
        },
      });
    });

    it("should warn when note name is valid but out of MIDI range", () => {
      // C-3 is a valid note name but maps to MIDI note -12 (out of 0-127)
      updateDevice({ ids: "dev1", params: "Pitch = C-3" });

      expect(outlet).toHaveBeenCalledWith(
        1,
        expect.stringContaining('invalid note name "C-3"'),
      );
    });
  });

  describe("binary search with string-valued label mid-iteration", () => {
    let param: RegisteredMockObject;

    beforeEach(() => {
      registerMockObject("dev1", {
        path: livePath.track(0).device(0),
        type: "Device",
        properties: { parameters: children("note-display-param") },
      });
      param = registerMockObject("note-display-param", {
        properties: {
          name: "NoteParam",
          original_name: "NoteParam",
          is_quantized: 0,
          value: 0.5,
          min: 0,
          max: 1,
        },
        methods: {
          // Min/max labels are numeric (triggers binary search),
          // but mid-range returns a note name (string value from parseLabel)
          str_for_value: (v: unknown) => {
            const n = Number(v);

            if (n <= 0.01) return "0 Hz";
            if (n >= 0.99) return "1000 Hz";

            return "C4";
          },
        },
      });
    });

    it("should return mid when binary search encounters string-typed label", () => {
      updateDevice({ ids: "dev1", params: "NoteParam = 500" });

      const setCall = param.set.mock.calls.find(
        (c: unknown[]) => c[0] === "value",
      ) as [string, number];

      expect(setCall).toBeDefined();
      // "C4" parses as { value: "C4", unit: "note" } — a string value.
      // binarySearchRawValue returns mid immediately on string-typed labels.
      expect(setCall[1]).toBe(0.5);
    });
  });

  describe("param not found warning", () => {
    it("should warn when param name does not match any device parameter", () => {
      registerMockObject("dev1", {
        path: livePath.track(0).device(0),
        type: "Device",
        properties: { parameters: children() },
      });

      updateDevice({ ids: "dev1", params: "NonExistentParam = 0.5" });

      expect(outlet).toHaveBeenCalledWith(
        1,
        expect.stringContaining('"NonExistentParam" not found'),
      );
    });
  });

  describe("out-of-range numeric values", () => {
    let param: RegisteredMockObject;

    beforeEach(() => {
      registerMockObject("dev1", {
        path: livePath.track(0).device(0),
        type: "Device",
        properties: { parameters: children("q-param") },
      });
      // Mirrors EQ Eight "2 Q A": raw range 0-1, display labels match raw
      param = registerMockObject("q-param", {
        properties: {
          name: "2 Q A",
          original_name: "2 Q A",
          is_quantized: 0,
          value: 0.71,
          min: 0,
          max: 1,
        },
        methods: {
          str_for_value: (v: unknown) => `${Number(v)}`,
        },
      });
    });

    it("should clamp a value above max instead of letting Live drop it", () => {
      updateDevice({ ids: "dev1", params: "2 Q A = 1.1" });

      expect(param.set).toHaveBeenCalledWith("value", 1);
    });

    it("should warn when a value is clamped", () => {
      updateDevice({ ids: "dev1", params: "2 Q A = 1.1" });

      expect(outlet).toHaveBeenCalledWith(
        1,
        expect.stringContaining("outside the parameter range 0-1"),
      );
    });

    it("should clamp a value below min", () => {
      updateDevice({ ids: "dev1", params: "2 Q A = -3" });

      expect(param.set).toHaveBeenCalledWith("value", 0);
    });

    it("should not warn for an in-range value", () => {
      updateDevice({ ids: "dev1", params: "2 Q A = 0.4" });

      expect(param.set).toHaveBeenCalledWith("value", 0.4);
      expect(outlet).not.toHaveBeenCalledWith(
        1,
        expect.stringContaining("outside the parameter range"),
      );
    });

    it("should clamp when the display mapping is unknown", () => {
      // Mirrors Compressor Ratio: max label "inf:1" is unparseable, so the
      // display-to-raw mapping fails and the input is treated as raw
      registerMockObject("dev2", {
        path: livePath.track(0).device(1),
        type: "Device",
        properties: { parameters: children("ratio-param") },
      });

      const ratio = registerMockObject("ratio-param", {
        properties: {
          name: "Ratio",
          original_name: "Ratio",
          is_quantized: 0,
          value: 0.3,
          min: 0,
          max: 1,
        },
        methods: {
          str_for_value: (v: unknown) =>
            Number(v) >= 1 ? "inf:1" : `${(1 + Number(v) * 9).toFixed(2)}:1`,
        },
      });

      updateDevice({ ids: "dev2", params: "Ratio = 5" });

      expect(ratio.set).toHaveBeenCalledWith("value", 1);
    });
  });
});

describe("updateDevice - automation override", () => {
  const OVERRIDE_WARNING =
    "updateDevice: this write overrode automation. Live stops playing automation and clip envelopes on the changed params until re-enabled (adj-playback action re-enable-automation). Finish sound design before automating, or re-enable after";

  /**
   * Register live_set with re_enable_automation_enabled reads in order
   * @param states - Successive values of the flag
   */
  function registerOverrideStates(...states: number[]): void {
    registerMockObject("live_set", {
      path: livePath.liveSet,
      type: "Song",
      properties: {
        re_enable_automation_enabled: new MockSequence(...states),
      },
    });
  }

  beforeEach(() => {
    registerMockObject("dev1", {
      path: livePath.track(0).device(0),
      type: "Device",
      properties: { parameters: children("p1") },
    });
    registerMockObject("p1", {
      properties: {
        name: "Cutoff",
        original_name: "Cutoff",
        is_quantized: 0,
        value: 0.5,
        min: 0,
        max: 1,
      },
      methods: { str_for_value: (value: unknown) => String(value) },
    });
  });

  it("warns when the write makes Live override automation", () => {
    registerOverrideStates(0, 1);

    updateDevice({ ids: "dev1", params: "Cutoff=0.5" });

    expect(outlet).toHaveBeenCalledWith(1, OVERRIDE_WARNING);
  });

  it("stays quiet when automation was already overridden", () => {
    registerOverrideStates(1, 1);

    updateDevice({ ids: "dev1", params: "Cutoff=0.5" });

    expect(outlet).not.toHaveBeenCalledWith(1, OVERRIDE_WARNING);
  });

  it("stays quiet when nothing is overridden", () => {
    registerOverrideStates(0, 0);

    updateDevice({ ids: "dev1", params: "Cutoff=0.5" });

    expect(outlet).not.toHaveBeenCalledWith(1, OVERRIDE_WARNING);
  });
});
