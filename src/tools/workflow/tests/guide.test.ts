// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, it } from "vitest";
import { guideText } from "#src/skills/guides.ts";
import { guide } from "../guide.ts";

describe("guide", () => {
  it("returns the topic and its guide text", () => {
    expect(guide({ topic: "bass" })).toStrictEqual({
      topic: "bass",
      guide: guideText("bass"),
    });
  });
});
