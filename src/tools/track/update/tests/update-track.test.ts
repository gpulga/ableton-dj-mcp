// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

import { beforeEach, describe, expect, it, vi } from "vitest";
import { livePath } from "#src/shared/live-api-path-builders.ts";
import {
  type RegisteredMockObject,
  mockNonExistentObjects,
  registerMockObject,
} from "#src/test/mocks/mock-registry.ts";
import { MONITORING_STATE } from "#src/tools/constants.ts";
import { updateTrack } from "../update-track.ts";
import "#src/live-api-adapter/live-api-extensions.ts";

describe("updateTrack", () => {
  let track123: RegisteredMockObject;
  let track456: RegisteredMockObject;
  let track789: RegisteredMockObject;

  beforeEach(() => {
    track123 = registerMockObject("123", { path: livePath.track(0) });
    track456 = registerMockObject("456", { path: livePath.track(1) });
    track789 = registerMockObject("789", { path: livePath.track(2) });
  });

  it("should update a single track by ID", async () => {
    const result = await updateTrack({
      ids: "123",
      name: "Updated Track",
      color: "#FF0000",
      mute: true,
      solo: false,
      arm: true,
    });

    expect(track123.set).toHaveBeenCalledWith("name", "Updated Track");
    expect(track123.set).toHaveBeenCalledWith("color", 16711680);
    expect(track123.set).toHaveBeenCalledWith("mute", true);
    expect(track123.set).toHaveBeenCalledWith("solo", false);
    expect(track123.set).toHaveBeenCalledWith("arm", true);
    expect(result).toStrictEqual({ id: "123" });
  });

  it("arms after routing and monitoring, which can disarm the track", async () => {
    const armed = registerMockObject("321", {
      path: livePath.track(3),
      properties: { arm: 1 },
    });

    await updateTrack({
      ids: "321",
      monitoringState: "off",
      arm: true,
    });

    const props = armed.set.mock.calls.map((call: unknown[]) => call[0]);

    expect(props.at(-1)).toBe("arm");
    expect(props.indexOf("current_monitoring_state")).toBeLessThan(
      props.indexOf("arm"),
    );
    expect(outlet).not.toHaveBeenCalledWith(1, expect.stringContaining("arm"));
  });

  it("warns when arm doesn't stick", async () => {
    registerMockObject("322", {
      path: livePath.track(4),
      properties: { arm: 0 },
    });

    await updateTrack({ ids: "322", arm: true });

    expect(outlet).toHaveBeenCalledWith(
      1,
      "updateTrack: arm true did not stick on track 322 (check the track can be armed and has an input)",
    );
  });

  it("should update multiple tracks by comma-separated IDs", async () => {
    const result = await updateTrack({
      ids: "123, 456",
      color: "#00FF00",
      mute: true,
    });

    expect(track123.set).toHaveBeenCalledWith("color", 65280);
    expect(track123.set).toHaveBeenCalledWith("mute", true);
    expect(track123.set).toHaveBeenCalledTimes(2);
    expect(track456.set).toHaveBeenCalledTimes(2);

    expect(result).toStrictEqual([{ id: "123" }, { id: "456" }]);
  });

  it("should handle 'id ' prefixed track IDs", async () => {
    const result = await updateTrack({
      ids: "id 123",
      name: "Prefixed ID Track",
    });

    expect(track123.set).toHaveBeenCalledWith("name", "Prefixed ID Track");
    expect(result).toStrictEqual({ id: "123" });
  });

  it("should not update properties when not provided", async () => {
    const result = await updateTrack({
      ids: "123",
      name: "Only Name Update",
    });

    expect(track123.set).toHaveBeenCalledWith("name", "Only Name Update");
    expect(track123.set).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual({ id: "123" });
  });

  it("should handle boolean false values correctly", async () => {
    const result = await updateTrack({
      ids: "123",
      mute: false,
      solo: false,
      arm: false,
    });

    expect(track123.set).toHaveBeenCalledWith("mute", false);
    expect(track123.set).toHaveBeenCalledWith("solo", false);
    expect(track123.set).toHaveBeenCalledWith("arm", false);
    expect(result).toStrictEqual({ id: "123" });
  });

  it("should throw error when ids is missing", async () => {
    await expect(
      updateTrack({} as unknown as Parameters<typeof updateTrack>[0]),
    ).rejects.toThrow("updateTrack failed: ids is required");
    await expect(
      updateTrack({ name: "Test" } as unknown as Parameters<
        typeof updateTrack
      >[0]),
    ).rejects.toThrow("updateTrack failed: ids is required");
  });

  it("should log warning when track ID doesn't exist", async () => {
    mockNonExistentObjects();

    const result = await updateTrack({ ids: "nonexistent" });

    expect(result).toStrictEqual([]);
    expect(outlet).toHaveBeenCalledWith(
      1,
      'updateTrack: id "nonexistent" does not exist',
    );
  });

  it("should skip invalid track IDs in comma-separated list and update valid ones", async () => {
    mockNonExistentObjects();

    const result = await updateTrack({ ids: "123, nonexistent", name: "Test" });

    expect(result).toStrictEqual({ id: "123" });
    expect(outlet).toHaveBeenCalledWith(
      1,
      'updateTrack: id "nonexistent" does not exist',
    );
    expect(track123.set).toHaveBeenCalledWith("name", "Test");
  });

  it("should return single object for single ID and array for comma-separated IDs", async () => {
    const singleResult = await updateTrack({ ids: "123", name: "Single" });
    const arrayResult = await updateTrack({
      ids: "123, 456",
      name: "Multiple",
    });

    expect(singleResult).toStrictEqual({ id: "123" });
    expect(arrayResult).toStrictEqual([{ id: "123" }, { id: "456" }]);
  });

  it("should handle whitespace in comma-separated IDs", async () => {
    const result = await updateTrack({
      ids: " 123 , 456 , 789 ",
      color: "#0000FF",
    });

    expect(result).toStrictEqual([{ id: "123" }, { id: "456" }, { id: "789" }]);
  });

  it("should filter out empty IDs from comma-separated list", async () => {
    const result = await updateTrack({
      ids: "123,,456,  ,789",
      name: "Filtered",
    });

    expect(track123.set).toHaveBeenCalledTimes(1);
    expect(track456.set).toHaveBeenCalledTimes(1);
    expect(track789.set).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual([{ id: "123" }, { id: "456" }, { id: "789" }]);
  });

  describe("routing properties", () => {
    it("should update routing properties when provided", async () => {
      const result = await updateTrack({
        ids: "123",
        inputRoutingTypeId: "17",
        inputRoutingChannelId: "1",
        outputRoutingTypeId: "25",
        outputRoutingChannelId: "26",
      });

      expect(track123.set).toHaveBeenCalledWith(
        "input_routing_type",
        '{"input_routing_type":{"identifier":17}}',
      );
      expect(track123.set).toHaveBeenCalledWith(
        "input_routing_channel",
        '{"input_routing_channel":{"identifier":1}}',
      );
      expect(track123.set).toHaveBeenCalledWith(
        "output_routing_type",
        '{"output_routing_type":{"identifier":25}}',
      );
      expect(track123.set).toHaveBeenCalledWith(
        "output_routing_channel",
        '{"output_routing_channel":{"identifier":26}}',
      );

      expect(result).toStrictEqual({ id: "123" });
    });

    it("should update monitoring state when provided", async () => {
      const result = await updateTrack({
        ids: "123",
        monitoringState: MONITORING_STATE.AUTO,
      });

      expect(track123.set).toHaveBeenCalledWith("current_monitoring_state", 1);

      expect(result).toStrictEqual({ id: "123" });
    });

    it("should update monitoring state for all valid values", async () => {
      // Test IN state
      await updateTrack({
        ids: "123",
        monitoringState: MONITORING_STATE.IN,
      });
      expect(track123.set).toHaveBeenCalledWith("current_monitoring_state", 0);

      // Test OFF state
      await updateTrack({
        ids: "456",
        monitoringState: MONITORING_STATE.OFF,
      });
      expect(track456.set).toHaveBeenCalledWith("current_monitoring_state", 2);
    });

    it("should warn and skip for invalid monitoring state", async () => {
      // Should not throw, just warn and skip the monitoring state update
      const result = await updateTrack({
        ids: "123",
        monitoringState: "invalid",
      });

      expect(result).toStrictEqual({ id: "123" });
    });

    it("should handle mixed routing and basic properties", async () => {
      const result = await updateTrack({
        ids: "123",
        name: "Test Track",
        color: "#FF0000",
        mute: true,
        inputRoutingTypeId: "17",
        monitoringState: MONITORING_STATE.IN,
      });

      expect(track123.set).toHaveBeenCalledWith("name", "Test Track");
      expect(track123.set).toHaveBeenCalledWith("color", 16711680);
      expect(track123.set).toHaveBeenCalledWith("mute", true);
      expect(track123.set).toHaveBeenCalledWith(
        "input_routing_type",
        '{"input_routing_type":{"identifier":17}}',
      );
      expect(track123.set).toHaveBeenCalledWith("current_monitoring_state", 0);

      expect(result).toStrictEqual({ id: "123" });
    });

    it("should handle routing properties in bulk operations", async () => {
      const result = await updateTrack({
        ids: "123, 456",
        outputRoutingTypeId: "25",
        monitoringState: MONITORING_STATE.AUTO,
      });

      expect(track123.set).toHaveBeenCalledWith(
        "output_routing_type",
        '{"output_routing_type":{"identifier":25}}',
      );
      expect(track456.set).toHaveBeenCalledWith(
        "output_routing_type",
        '{"output_routing_type":{"identifier":25}}',
      );
      expect(track123.set).toHaveBeenCalledWith("current_monitoring_state", 1);
      expect(track456.set).toHaveBeenCalledWith("current_monitoring_state", 1);

      expect(result).toStrictEqual([{ id: "123" }, { id: "456" }]);
    });

    it("should not update routing properties when not provided", async () => {
      const result = await updateTrack({
        ids: "123",
        name: "Only Name Update",
      });

      // Should only have the name call, no routing calls
      expect(track123.set).toHaveBeenCalledTimes(1);
      expect(track123.set).toHaveBeenCalledWith("name", "Only Name Update");

      expect(result).toStrictEqual({ id: "123" });
    });
  });

  describe("arrangementFollower parameter", () => {
    it("should set arrangementFollower to true (track follows arrangement)", async () => {
      const result = await updateTrack({
        ids: "123",
        arrangementFollower: true,
      });

      expect(track123.set).toHaveBeenCalledWith("back_to_arranger", 0);

      expect(result).toStrictEqual({ id: "123" });
    });

    it("should set arrangementFollower to false (track doesn't follow arrangement)", async () => {
      const result = await updateTrack({
        ids: "123",
        arrangementFollower: false,
      });

      expect(track123.set).toHaveBeenCalledWith("back_to_arranger", 1);

      expect(result).toStrictEqual({ id: "123" });
    });

    it("should set arrangementFollower for multiple tracks", async () => {
      const result = await updateTrack({
        ids: "123,456",
        arrangementFollower: true,
      });

      expect(track123.set).toHaveBeenCalledWith("back_to_arranger", 0);
      expect(track456.set).toHaveBeenCalledWith("back_to_arranger", 0);

      expect(result).toStrictEqual([{ id: "123" }, { id: "456" }]);
    });

    it("should combine arrangementFollower with other parameters", async () => {
      const result = await updateTrack({
        ids: "123",
        name: "Updated Track",
        mute: true,
        arrangementFollower: false,
      });

      expect(track123.set).toHaveBeenCalledWith("name", "Updated Track");
      expect(track123.set).toHaveBeenCalledWith("mute", true);
      expect(track123.set).toHaveBeenCalledWith("back_to_arranger", 1);

      expect(result).toStrictEqual({ id: "123" });
    });
  });

  describe("folded parameter", () => {
    it("should fold a group track", async () => {
      track123.get.mockImplementation((prop: string) =>
        prop === "is_foldable" ? [1] : [0],
      );

      const result = await updateTrack({
        ids: "123",
        folded: true,
      });

      expect(track123.set).toHaveBeenCalledWith("fold_state", 1);
      expect(result).toStrictEqual({ id: "123" });
    });

    it("should unfold a group track", async () => {
      track123.get.mockImplementation((prop: string) =>
        prop === "is_foldable" ? [1] : [0],
      );

      const result = await updateTrack({
        ids: "123",
        folded: false,
      });

      expect(track123.set).toHaveBeenCalledWith("fold_state", 0);
      expect(result).toStrictEqual({ id: "123" });
    });

    it("should throw a descriptive error when folded is set on a non-foldable track", async () => {
      // track123 defaults to is_foldable: 0 (not a group track)
      await expect(updateTrack({ ids: "123", folded: true })).rejects.toThrow(
        "updateTrack failed: folded requires a group track (track 123 is not foldable)",
      );
    });

    it("should not touch fold_state when folded is not provided", async () => {
      const result = await updateTrack({
        ids: "123",
        name: "Only Name Update",
      });

      expect(track123.set).not.toHaveBeenCalledWith(
        "fold_state",
        expect.anything(),
      );
      expect(result).toStrictEqual({ id: "123" });
    });

    it("should fold/unfold across multiple group tracks", async () => {
      track123.get.mockImplementation((prop: string) =>
        prop === "is_foldable" ? [1] : [0],
      );
      track456.get.mockImplementation((prop: string) =>
        prop === "is_foldable" ? [1] : [0],
      );

      const result = await updateTrack({
        ids: "123,456",
        folded: true,
      });

      expect(track123.set).toHaveBeenCalledWith("fold_state", 1);
      expect(track456.set).toHaveBeenCalledWith("fold_state", 1);
      expect(result).toStrictEqual([{ id: "123" }, { id: "456" }]);
    });
  });

  describe("color quantization verification", () => {
    it("should emit warning when color is quantized by Live", async () => {
      const consoleModule = await import("#src/shared/v8-max-console.ts");
      const consoleSpy = vi.spyOn(consoleModule, "warn");

      // Override get to return quantized color (different from input)
      track123.get.mockImplementation((prop: string) => {
        if (prop === "color") {
          return [16725558]; // #FF3636 (quantized from #FF0000)
        }

        return [0];
      });

      await updateTrack({
        ids: "123",
        color: "#FF0000",
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        "Requested track color #FF0000 was mapped to nearest palette color #FF3636. Live uses a fixed color palette.",
      );

      consoleSpy.mockRestore();
    });

    it("should not emit warning when color matches exactly", async () => {
      const consoleModule = await import("#src/shared/v8-max-console.ts");
      const consoleSpy = vi.spyOn(consoleModule, "warn");

      // Override get to return exact color (same as input)
      track123.get.mockImplementation((prop: string) => {
        if (prop === "color") {
          return [16711680]; // #FF0000 (exact match)
        }

        return [0];
      });

      await updateTrack({
        ids: "123",
        color: "#FF0000",
      });

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should emit warning for each track when updating multiple tracks", async () => {
      const consoleModule = await import("#src/shared/v8-max-console.ts");
      const consoleSpy = vi.spyOn(consoleModule, "warn");

      const colorMock = (prop: string) => {
        if (prop === "color") {
          return [1768495]; // #1AFC2F (quantized from #00FF00)
        }

        return [0];
      };

      track123.get.mockImplementation(colorMock);
      track456.get.mockImplementation(colorMock);

      await updateTrack({
        ids: "123,456",
        color: "#00FF00",
      });

      expect(consoleSpy).toHaveBeenCalledTimes(2);
      expect(consoleSpy).toHaveBeenNthCalledWith(
        1,
        "Requested track color #00FF00 was mapped to nearest palette color #1AFC2F. Live uses a fixed color palette.",
      );
      expect(consoleSpy).toHaveBeenNthCalledWith(
        2,
        "Requested track color #00FF00 was mapped to nearest palette color #1AFC2F. Live uses a fixed color palette.",
      );

      consoleSpy.mockRestore();
    });

    it("should not verify color if color parameter is not provided", async () => {
      const consoleModule = await import("#src/shared/v8-max-console.ts");
      const consoleSpy = vi.spyOn(consoleModule, "warn");

      await updateTrack({
        ids: "123",
        name: "No color update",
      });

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
