// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

import { beforeEach, describe, expect, it, vi } from "vitest";
import { calculateBeatPositions } from "../helpers/update-clip-timing-helpers.ts";

describe("update-clip-timing-helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("calculateBeatPositions", () => {
    it("should warn when firstStart exceeds end_marker", () => {
      const mockClip = {
        getProperty: vi.fn((prop: string) => {
          if (prop === "end_marker") return 4; // 1 bar at 4/4

          return 0;
        }),
      };

      const result = calculateBeatPositions({
        firstStart: "3|1", // 8 beats > end_marker (4)
        timeSigNumerator: 4,
        timeSigDenominator: 4,
        clip: mockClip as unknown as LiveAPI,
        isLooping: true,
      });

      expect(outlet).toHaveBeenCalledWith(
        1,
        expect.stringContaining("firstStart parameter ignored"),
      );
      expect(outlet).toHaveBeenCalledWith(
        1,
        expect.stringContaining("exceeds clip content boundary"),
      );
      expect(result.startMarkerBeats).toBeNull();
      expect(result.firstStartBeats).toBe(8); // Still calculated, just not applied
    });

    it("should set startMarkerBeats when firstStart is within end_marker", () => {
      vi.mocked(outlet).mockClear();

      const mockClip = {
        getProperty: vi.fn((prop: string) => {
          if (prop === "end_marker") return 8; // 2 bars at 4/4

          return 0;
        }),
      };

      const result = calculateBeatPositions({
        firstStart: "1|3", // 2 beats < end_marker (8)
        timeSigNumerator: 4,
        timeSigDenominator: 4,
        clip: mockClip as unknown as LiveAPI,
        isLooping: true,
      });

      expect(outlet).not.toHaveBeenCalledWith(1, expect.anything());
      expect(result.startMarkerBeats).toBe(2);
      expect(result.firstStartBeats).toBe(2);
    });

    it("keeps a looping clip's loop length when start moves past its end", () => {
      vi.mocked(outlet).mockClear();

      const props: Record<string, number> = {
        loop_start: 0,
        loop_end: 4,
        end_marker: 4,
      };
      const mockClip = {
        getProperty: vi.fn((prop: string) => props[prop] ?? 0),
      };

      const result = calculateBeatPositions({
        start: "3|1", // 8 beats, past the 1-bar loop
        timeSigNumerator: 4,
        timeSigDenominator: 4,
        clip: mockClip as unknown as LiveAPI,
        isLooping: true,
      });

      expect(outlet).not.toHaveBeenCalledWith(1, expect.anything());
      expect(result.startBeats).toBe(8);
      expect(result.endBeats).toBe(12);
      expect(result.startMarkerBeats).toBe(8);
    });

    it("warns when a non-looping clip's start is past its end and no length is given", () => {
      vi.mocked(outlet).mockClear();

      const mockClip = {
        getProperty: vi.fn((prop: string) => (prop === "end_marker" ? 4 : 0)),
      };

      const result = calculateBeatPositions({
        start: "3|1",
        timeSigNumerator: 4,
        timeSigDenominator: 4,
        clip: mockClip as unknown as LiveAPI,
        isLooping: false,
      });

      expect(outlet).toHaveBeenCalledWith(
        1,
        "start marker not moved - start 8 is at or past the clip's end (4); pass length to move the end too",
      );
      expect(result.startMarkerBeats).toBeNull();
    });

    it("moves the start marker past the old end when length moves the end too", () => {
      const mockClip = {
        getProperty: vi.fn((prop: string) => (prop === "end_marker" ? 4 : 0)),
      };

      const result = calculateBeatPositions({
        start: "3|1",
        length: "1:0",
        timeSigNumerator: 4,
        timeSigDenominator: 4,
        clip: mockClip as unknown as LiveAPI,
        isLooping: false,
      });

      expect(result.endBeats).toBe(12);
      expect(result.startMarkerBeats).toBe(8);
    });
  });
});
