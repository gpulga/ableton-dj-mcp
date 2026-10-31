// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Project memory is one string (saved with the Live Set) split into facts.
 * Each fact opens with a header line `## <id>: <about>`. Text before the
 * first header is the legacy fact `notes` and has no header of its own.
 */

export const LEGACY_FACT_ID = "notes";
const LEGACY_ABOUT_MAX = 80;
const HEADER_PATTERN = /^## ([a-z0-9-]{1,40}): (.*)$/;

export interface MemoryFact {
  id: string;
  about: string;
  /** Lines after the header (kept as lines so serializing is lossless) */
  lines: string[];
  /** false only for the legacy text before the first header */
  headed: boolean;
}

export interface FactSummary {
  id: string;
  about: string;
}

/**
 * Split a memory string into facts
 * @param content - Stored memory string
 * @returns Facts in store order
 */
export function parseMemory(content: string): MemoryFact[] {
  const facts: MemoryFact[] = [];
  const preamble: string[] = [];

  for (const line of content.split("\n")) {
    const match = HEADER_PATTERN.exec(line);

    if (match) {
      facts.push({
        id: match[1] as string,
        about: match[2] as string,
        lines: [],
        headed: true,
      });
    } else {
      (facts.at(-1)?.lines ?? preamble).push(line);
    }
  }

  const legacyText = preamble.join("\n");

  if (legacyText.trim() !== "") {
    facts.unshift({
      id: LEGACY_FACT_ID,
      about: legacyAbout(legacyText),
      lines: preamble,
      headed: false,
    });
  }

  return facts;
}

/**
 * Join facts back into one memory string
 * @param facts - Facts in store order
 * @returns Memory string; parseMemory(serializeMemory(f)) restores f
 */
export function serializeMemory(facts: MemoryFact[]): string {
  return facts
    .map((fact) =>
      (fact.headed
        ? [`## ${fact.id}: ${fact.about}`, ...fact.lines]
        : fact.lines
      ).join("\n"),
    )
    .join("\n");
}

/**
 * Whether the string holds at least one fact header
 * @param content - Stored memory string
 * @returns True when structured
 */
export function hasFactHeaders(content: string): boolean {
  return content.split("\n").some(isFactHeader);
}

/**
 * Whether a line would be read as a fact header
 * @param line - One line of text
 * @returns True when it matches the header format
 */
export function isFactHeader(line: string): boolean {
  return HEADER_PATTERN.test(line);
}

/**
 * Text of a fact, without its header
 * @param fact - Fact to read
 * @returns Fact body
 */
export function factText(fact: MemoryFact): string {
  return fact.lines.join("\n");
}

/**
 * Description for legacy text: its first non-blank line, cut short
 * @param text - Legacy memory text
 * @returns One-line description
 */
export function legacyAbout(text: string): string {
  const firstLine = text.split("\n").find((line) => line.trim() !== "") ?? "";

  return firstLine.trim().slice(0, LEGACY_ABOUT_MAX);
}

/**
 * Index entries for facts
 * @param facts - Facts in store order
 * @returns id + about per fact
 */
export function summarizeFacts(facts: MemoryFact[]): FactSummary[] {
  return facts.map(({ id, about }) => ({ id, about }));
}
