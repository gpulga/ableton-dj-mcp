// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

// Genre and production guidance, served on demand by adj-guide instead of on
// every adj-connect (~18 KB, ~4.5k tokens per session; #326). Topics are built
// verbatim from the sections in electronic-music.ts and production-techniques.ts,
// so those files stay the single source of the content.

import { electronicMusicSkills } from "./electronic-music.ts";
import { productionTechniquesSkills } from "./production-techniques.ts";

const SOURCES = {
  em: electronicMusicSkills,
  pt: productionTechniquesSkills,
} as const;

type SourceKey = keyof typeof SOURCES;
type SectionRef = readonly [SourceKey, string];

/**
 * Split a skills markdown string into its `###` sections, keyed by heading.
 * @param markdown - Skills text
 * @returns Map of heading text to the full section (heading included)
 */
export function splitSections(markdown: string): Map<string, string> {
  const sections = new Map<string, string>();

  for (const part of markdown.split(/^(?=### )/m).slice(1)) {
    const heading = part.slice(4, part.indexOf("\n")).trim();

    sections.set(heading, part.trim());
  }

  return sections;
}

const sectionsBySource: Record<SourceKey, Map<string, string>> = {
  em: splitSections(SOURCES.em),
  pt: splitSections(SOURCES.pt),
};

/**
 * Join referenced sections into one markdown block.
 * @param refs - [source, heading] pairs
 * @returns Joined section text
 */
function joinSections(refs: readonly SectionRef[]): string {
  return refs
    .map(([source, heading]) => {
      const section = sectionsBySource[source].get(heading);

      if (section === undefined) {
        throw new Error(`Missing skills section "${heading}" in ${source}`);
      }

      return section;
    })
    .join("\n\n");
}

export const GUIDE_TOPICS = {
  genres: {
    summary:
      "BPM, scales, chord progressions and structure per genre (house, indie dance, tech house, afro house, melodic techno, techno, psytrance), swing",
    sections: [
      ["em", "Genre Conventions"],
      ["em", "Genre-Specific Music Theory"],
      ["em", "Time Signatures and Groove"],
    ],
  },
  drums: {
    summary: "kick, clap, hat and percussion patterns; velocity grooves; fills",
    sections: [
      ["em", "Drum Patterns"],
      ["pt", "Drums"],
    ],
  },
  bass: {
    summary: "driving and off-beat bass, layering, breakdown bass",
    sections: [
      ["em", "Bass Patterns"],
      ["pt", "Bass"],
    ],
  },
  melodic: {
    summary: "leads, pads, chords, plucks, arps, sound design",
    sections: [
      ["em", "Lead Patterns (Melodic Techno)"],
      ["pt", "Leads"],
      ["pt", "Pads & Chords"],
      ["pt", "Plucks & Arps"],
      ["em", "Sound Design Rules"],
    ],
  },
  arrangement: {
    summary: "section templates, energy curves, reveals and breakdowns",
    sections: [
      ["em", "Arrangement Structure"],
      ["em", "Energy Curve Guidance"],
      ["pt", "Arrangement & Energy"],
    ],
  },
  "fx-automation": {
    summary: "risers, downfilters, impacts, transitions, adj-automate recipes",
    sections: [
      ["em", "FX & Transitions"],
      ["pt", "FX & Transitions"],
      ["pt", "Automation (adj-automate recipes)"],
    ],
  },
  velocity: {
    summary: "velocity ranges per element across genres",
    sections: [["em", "Velocity Reference (all genres)"]],
  },
} as const satisfies Record<
  string,
  { summary: string; sections: readonly SectionRef[] }
>;

export type GuideTopic = keyof typeof GUIDE_TOPICS;

export const GUIDE_TOPIC_NAMES = Object.keys(GUIDE_TOPICS) as [
  GuideTopic,
  ...GuideTopic[],
];

// General production behavior that applies to every music task; stays in
// adj-connect's skills rather than behind a topic.
export const CORE_PRODUCTION_SECTIONS: readonly SectionRef[] = [
  ["em", "Production Workflow"],
  ["pt", "Humanization"],
  ["pt", "Workflow Rules"],
];

/**
 * Full guide text for a topic.
 * @param topic - Guide topic
 * @returns Markdown guide
 */
export function guideText(topic: GuideTopic): string {
  return joinSections(GUIDE_TOPICS[topic].sections);
}

/**
 * Skills block for adj-connect: core production rules plus an index of the
 * on-demand guides.
 * @returns Markdown block
 */
export function productionSkillsSummary(): string {
  const index = GUIDE_TOPIC_NAMES.map(
    (topic) => `- \`${topic}\`: ${GUIDE_TOPICS[topic].summary}`,
  ).join("\n");

  return `## Electronic Music Production

${joinSections(CORE_PRODUCTION_SECTIONS)}

### Production Guides

Genre and production know-how loads on demand. Before writing parts for a genre, arranging, or designing FX, call \`adj-guide\` with the relevant topic (once per topic per session):
${index}
`;
}
