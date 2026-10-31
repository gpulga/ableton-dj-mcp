// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

import {
  type FactSummary,
  LEGACY_FACT_ID,
  type MemoryFact,
  factText,
  isFactHeader,
  legacyAbout,
  parseMemory,
  serializeMemory,
  summarizeFacts,
} from "./memory-store.ts";
import { readSamples } from "./read-samples.ts";

export interface MemoryResult {
  enabled: boolean;
  writable?: boolean;
  facts?: FactSummary[];
  id?: string;
  about?: string;
  content?: string;
}

export interface SamplesResult {
  sampleFolder: string;
  samples: string[];
}

export interface WriteMemoryArgs {
  fact?: string;
  about?: string;
  content?: string;
}

const MEMORY_MAX_CHARS = 10_000;

/**
 * Handle read action
 * @param fact - Fact id to read; omit for the index
 * @param context - The context object
 * @returns Fact index, or one fact's text
 */
export function handleReadMemory(
  fact: string | undefined,
  context: Partial<ToolContext> = {},
): MemoryResult {
  const memory = context.memory;

  if (!memory?.enabled) {
    return { enabled: false };
  }

  const facts = parseMemory(memory.content);

  if (fact == null) {
    return {
      enabled: true,
      writable: memory.writable,
      facts: summarizeFacts(facts),
    };
  }

  return factResult(findFact(facts, fact), memory.writable);
}

/**
 * Handle write action: create or replace one fact
 * @param args - Write arguments
 * @param args.fact - Fact id (default: the legacy `notes` fact)
 * @param args.about - One-line description (required for a new fact)
 * @param args.content - Fact text
 * @param context - The context object
 * @returns The written fact
 */
export function handleWriteMemory(
  { fact = LEGACY_FACT_ID, about, content }: WriteMemoryArgs,
  context: Partial<ToolContext> = {},
): MemoryResult {
  const memory = requireWritableMemory(context);

  if (!content) {
    throw new Error("Content required for write action");
  }

  if (content.split("\n").some(isFactHeader)) {
    throw new Error(
      "Content must not contain fact header lines (## <id>: <about>) - write each fact separately",
    );
  }

  if (about?.includes("\n")) {
    throw new Error("about must be a single line");
  }

  const facts = parseMemory(memory.content);
  const existing = facts.find((f) => f.id === fact);
  const lines = content.split("\n");
  let written: MemoryFact;

  if (existing) {
    written = existing;
    written.lines = lines;

    if (about != null) {
      written.about = about;
      written.headed = true;
    } else if (!written.headed) {
      written.about = legacyAbout(content);
    }
  } else if (about != null) {
    written = { id: fact, about, lines, headed: true };
    facts.push(written);
  } else if (fact === LEGACY_FACT_ID) {
    // Plain write with no facts API: keep it as headerless text, as before
    written = { id: fact, about: legacyAbout(content), lines, headed: false };
    facts.unshift(written);
  } else {
    throw new Error(`about required when creating fact '${fact}'`);
  }

  saveMemory(memory, facts);

  return factResult(written, memory.writable);
}

/**
 * Handle forget action: remove one fact
 * @param fact - Fact id to remove
 * @param context - The context object
 * @returns Remaining fact index
 */
export function handleForgetMemory(
  fact: string | undefined,
  context: Partial<ToolContext> = {},
): MemoryResult {
  const memory = requireWritableMemory(context);

  if (fact == null) {
    throw new Error("fact required for forget action");
  }

  const facts = parseMemory(memory.content);
  const removed = findFact(facts, fact);
  const remaining = facts.filter((f) => f !== removed);

  saveMemory(memory, remaining);

  return {
    enabled: true,
    writable: memory.writable,
    facts: summarizeFacts(remaining),
  };
}

function requireWritableMemory(
  context: Partial<ToolContext>,
): NonNullable<ToolContext["memory"]> {
  const memory = context.memory;

  if (!memory?.enabled) {
    throw new Error("Project context is disabled");
  }

  if (!memory.writable) {
    throw new Error(
      "AI updates are disabled - enable 'Allow AI updates' in settings to let AI modify project context",
    );
  }

  return memory;
}

function findFact(facts: MemoryFact[], id: string): MemoryFact {
  const fact = facts.find((f) => f.id === id);

  if (!fact) {
    const known = facts.map((f) => f.id).join(", ") || "none";

    throw new Error(`Unknown fact '${id}' - known facts: ${known}`);
  }

  return fact;
}

function factResult(fact: MemoryFact, writable: boolean): MemoryResult {
  return {
    enabled: true,
    writable,
    id: fact.id,
    about: fact.about,
    content: factText(fact),
  };
}

function saveMemory(
  memory: NonNullable<ToolContext["memory"]>,
  facts: MemoryFact[],
): void {
  const content = serializeMemory(facts);

  if (content.length > MEMORY_MAX_CHARS) {
    throw new Error(
      `Memory would be ${content.length} chars (max ${MEMORY_MAX_CHARS}) - forget or shorten a fact`,
    );
  }

  memory.content = content;

  // Send update to Max patch via outlet
  outlet(0, "update_memory", content);
}

/**
 * Handle search action by delegating to existing readSamples() function
 * @param search - Optional search filter
 * @param context - The context object
 * @returns Samples result with sample folder and file list
 */
export function handleSearchSamples(
  search: string | undefined,
  context: Partial<ToolContext> = {},
): SamplesResult {
  return readSamples({ search }, context);
}
