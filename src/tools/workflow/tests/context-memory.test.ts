// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

import { beforeEach, describe, expect, it } from "vitest";
import { context } from "../context.ts";

describe("context - memory actions", () => {
  let toolContext: Partial<ToolContext>;

  beforeEach(() => {
    toolContext = {
      memory: {
        enabled: false,
        writable: false,
        content: "",
      },
    };
  });

  describe("read action", () => {
    it("returns enabled: false when project context is disabled", () => {
      toolContext.memory!.enabled = false;
      const result = context({ action: "read" }, toolContext);

      expect(result).toStrictEqual({ enabled: false });
      expect(outlet).not.toHaveBeenCalled();
    });

    it("returns enabled: false when memory is missing", () => {
      const result = context({ action: "read" }, {});

      expect(result).toStrictEqual({ enabled: false });
      expect(outlet).not.toHaveBeenCalled();
    });

    it.each([
      ["writable", true],
      ["not writable", false],
    ])("returns the fact index when %s", (_, writable) => {
      toolContext.memory!.enabled = true;
      toolContext.memory!.writable = writable;
      toolContext.memory!.content = "old text\n## bass: Bass sound\nReese";

      const result = context({ action: "read" }, toolContext);

      expect(result).toStrictEqual({
        enabled: true,
        writable,
        facts: [
          { id: "notes", about: "old text" },
          { id: "bass", about: "Bass sound" },
        ],
      });
      expect(outlet).not.toHaveBeenCalled();
    });

    it("returns one fact's text", () => {
      toolContext.memory!.enabled = true;
      toolContext.memory!.content =
        "old text\n## bass: Bass sound\nReese\ndetuned";

      expect(
        context({ action: "read", fact: "bass" }, toolContext),
      ).toStrictEqual({
        enabled: true,
        writable: false,
        id: "bass",
        about: "Bass sound",
        content: "Reese\ndetuned",
      });
    });

    it("throws for an unknown fact, naming the known ones", () => {
      toolContext.memory!.enabled = true;
      toolContext.memory!.content = "old text\n## bass: Bass sound\nReese";

      expect(() =>
        context({ action: "read", fact: "keys" }, toolContext),
      ).toThrow("Unknown fact 'keys' - known facts: notes, bass");
    });

    it("says none when memory is empty", () => {
      toolContext.memory!.enabled = true;

      expect(() =>
        context({ action: "read", fact: "keys" }, toolContext),
      ).toThrow("known facts: none");
    });
  });

  describe("write action", () => {
    it("throws error when project context is disabled", () => {
      toolContext.memory!.enabled = false;
      expect(() =>
        context({ action: "write", content: "test" }, toolContext),
      ).toThrow("Project context is disabled");
      expect(outlet).not.toHaveBeenCalled();
    });

    it("throws error when memory is missing", () => {
      expect(() => context({ action: "write", content: "test" }, {})).toThrow(
        "Project context is disabled",
      );
      expect(outlet).not.toHaveBeenCalled();
    });

    it("throws error when project context is not writable", () => {
      toolContext.memory!.enabled = true;
      toolContext.memory!.writable = false;
      expect(() =>
        context({ action: "write", content: "test" }, toolContext),
      ).toThrow(
        "AI updates are disabled - enable 'Allow AI updates' in settings to let AI modify project context",
      );
      expect(outlet).not.toHaveBeenCalled();
    });

    it("throws error when content is missing", () => {
      toolContext.memory!.enabled = true;
      toolContext.memory!.writable = true;
      expect(() => context({ action: "write" }, toolContext)).toThrow(
        "Content required for write action",
      );
      expect(outlet).not.toHaveBeenCalled();
    });

    it("throws error when content is empty string", () => {
      toolContext.memory!.enabled = true;
      toolContext.memory!.writable = true;
      expect(() =>
        context({ action: "write", content: "" }, toolContext),
      ).toThrow("Content required for write action");
      expect(outlet).not.toHaveBeenCalled();
    });

    it.each([
      ["updates content when all conditions are met", ""],
      ["overwrites existing content", "old content"],
    ])("%s", (_, initialContent) => {
      toolContext.memory!.enabled = true;
      toolContext.memory!.writable = true;
      if (initialContent) toolContext.memory!.content = initialContent;

      const result = context(
        { action: "write", content: "new content" },
        toolContext,
      );

      expect(toolContext.memory!.content).toBe("new content");
      expect(result).toStrictEqual({
        enabled: true,
        writable: true,
        id: "notes",
        about: "new content",
        content: "new content",
      });
      expect(outlet).toHaveBeenCalledWith(0, "update_memory", "new content");
    });

    describe("facts", () => {
      beforeEach(() => {
        toolContext.memory!.enabled = true;
        toolContext.memory!.writable = true;
      });

      it("adds a fact to legacy memory without changing the old text", () => {
        toolContext.memory!.content = "old text\nline two";

        const result = context(
          {
            action: "write",
            fact: "bass",
            about: "Bass sound",
            content: "Reese",
          },
          toolContext,
        );

        const stored = "old text\nline two\n## bass: Bass sound\nReese";

        expect(toolContext.memory!.content).toBe(stored);
        expect(result).toStrictEqual({
          enabled: true,
          writable: true,
          id: "bass",
          about: "Bass sound",
          content: "Reese",
        });
        expect(outlet).toHaveBeenCalledExactlyOnceWith(
          0,
          "update_memory",
          stored,
        );
      });

      it("replaces only the written fact", () => {
        toolContext.memory!.content =
          "## bass: Bass\nReese\n\n## tempo: Tempo\n128";

        context({ action: "write", fact: "bass", content: "Sub" }, toolContext);

        expect(toolContext.memory!.content).toBe(
          "## bass: Bass\nSub\n## tempo: Tempo\n128",
        );
      });

      it("updates a fact's description when about is given", () => {
        toolContext.memory!.content = "## bass: Bass\nReese";

        context(
          {
            action: "write",
            fact: "bass",
            about: "Bass patch",
            content: "Sub",
          },
          toolContext,
        );

        expect(toolContext.memory!.content).toBe("## bass: Bass patch\nSub");
      });

      it("gives legacy notes a header when about is given", () => {
        toolContext.memory!.content = "old text";

        context(
          { action: "write", fact: "notes", about: "General", content: "new" },
          toolContext,
        );

        expect(toolContext.memory!.content).toBe("## notes: General\nnew");
      });

      it("keeps legacy text first when written into structured memory", () => {
        toolContext.memory!.content = "## bass: Bass\nReese";

        context({ action: "write", content: "loose note" }, toolContext);

        expect(toolContext.memory!.content).toBe(
          "loose note\n## bass: Bass\nReese",
        );
      });

      it("requires about for a new fact", () => {
        expect(() =>
          context(
            { action: "write", fact: "bass", content: "Reese" },
            toolContext,
          ),
        ).toThrow("about required when creating fact 'bass'");
        expect(outlet).not.toHaveBeenCalled();
      });

      it("rejects multi-line about", () => {
        expect(() =>
          context(
            { action: "write", fact: "bass", about: "a\nb", content: "Reese" },
            toolContext,
          ),
        ).toThrow("about must be a single line");
      });

      it("rejects content that contains a header line", () => {
        expect(() =>
          context(
            {
              action: "write",
              fact: "bass",
              about: "Bass",
              content: "Reese\n## tempo: Tempo",
            },
            toolContext,
          ),
        ).toThrow("must not contain fact header lines");
        expect(outlet).not.toHaveBeenCalled();
      });

      it("refuses a store over 10,000 chars and keeps memory unchanged", () => {
        toolContext.memory!.content = `## big: Big\n${"x".repeat(9_990)}`;

        expect(() =>
          context(
            {
              action: "write",
              fact: "more",
              about: "More",
              content: "y".repeat(50),
            },
            toolContext,
          ),
        ).toThrow(
          /Memory would be 10\d{3} chars \(max 10000\) - forget or shorten a fact/,
        );
        expect(toolContext.memory!.content).toBe(
          `## big: Big\n${"x".repeat(9_990)}`,
        );
        expect(outlet).not.toHaveBeenCalled();
      });
    });
  });

  describe("forget action", () => {
    beforeEach(() => {
      toolContext.memory!.enabled = true;
      toolContext.memory!.writable = true;
      toolContext.memory!.content = "old text\n## bass: Bass\nReese";
    });

    it("removes one fact and returns the remaining index", () => {
      const result = context({ action: "forget", fact: "notes" }, toolContext);

      expect(toolContext.memory!.content).toBe("## bass: Bass\nReese");
      expect(result).toStrictEqual({
        enabled: true,
        writable: true,
        facts: [{ id: "bass", about: "Bass" }],
      });
      expect(outlet).toHaveBeenCalledWith(
        0,
        "update_memory",
        "## bass: Bass\nReese",
      );
    });

    it("throws for an unknown fact", () => {
      expect(() =>
        context({ action: "forget", fact: "keys" }, toolContext),
      ).toThrow("Unknown fact 'keys' - known facts: notes, bass");
      expect(outlet).not.toHaveBeenCalled();
    });

    it("requires fact", () => {
      expect(() => context({ action: "forget" }, toolContext)).toThrow(
        "fact required for forget action",
      );
    });

    it("throws when not writable", () => {
      toolContext.memory!.writable = false;

      expect(() =>
        context({ action: "forget", fact: "bass" }, toolContext),
      ).toThrow("AI updates are disabled");
      expect(outlet).not.toHaveBeenCalled();
    });
  });

  it("throws error for unknown action", () => {
    expect(() => context({ action: "unknown-action" })).toThrow(
      "Unknown action: unknown-action",
    );
  });
});
