// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, it } from "vitest";
import { electronicMusicSkills } from "./electronic-music.ts";
import {
  CORE_PRODUCTION_SECTIONS,
  GUIDE_TOPICS,
  GUIDE_TOPIC_NAMES,
  guideText,
  productionSkillsSummary,
  splitSections,
} from "./guides.ts";
import { productionTechniquesSkills } from "./production-techniques.ts";
import { skills } from "./standard.ts";

type Ref = readonly [string, string];

const allRefs: Ref[] = [
  ...Object.values(GUIDE_TOPICS).flatMap(
    (topic): readonly Ref[] => topic.sections,
  ),
  ...CORE_PRODUCTION_SECTIONS,
];

describe("guides", () => {
  it("uses every source section exactly once, so no guidance is lost", () => {
    const expected = [
      ...[...splitSections(electronicMusicSkills).keys()].map((h) => `em:${h}`),
      ...[...splitSections(productionTechniquesSkills).keys()].map(
        (h) => `pt:${h}`,
      ),
    ].sort();
    const used = allRefs.map(([source, heading]) => `${source}:${heading}`);

    expect(used.toSorted()).toStrictEqual(expected);
  });

  it("serves each topic's sections verbatim", () => {
    const drums = guideText("drums");

    expect(drums).toContain(
      splitSections(electronicMusicSkills).get("Drum Patterns"),
    );
    expect(drums).toContain(
      splitSections(productionTechniquesSkills).get("Drums"),
    );
  });

  it("lists every topic in the adj-connect summary", () => {
    const summary = productionSkillsSummary();

    for (const topic of GUIDE_TOPIC_NAMES) {
      expect(summary).toContain(`\`${topic}\``);
    }
  });

  it("keeps core production rules in adj-connect and topic content out", () => {
    expect(skills).toContain("### Workflow Rules");
    expect(skills).toContain("### Humanization");
    expect(skills).not.toContain("### Genre-Specific Music Theory");
    expect(skills).not.toContain("### Drum Patterns");
  });

  it("splitSections keys sections by heading", () => {
    const sections = splitSections("intro\n### A\none\n### B\ntwo\n");

    expect([...sections.keys()]).toStrictEqual(["A", "B"]);
    expect(sections.get("B")).toBe("### B\ntwo");
  });
});
