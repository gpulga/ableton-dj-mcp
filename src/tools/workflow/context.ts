// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

import {
  type MemoryResult,
  type SamplesResult,
  handleForgetMemory,
  handleReadMemory,
  handleSearchSamples,
  handleWriteMemory,
} from "./context-helpers.ts";

interface ContextArgs {
  action?: string;
  fact?: string;
  about?: string;
  content?: string;
  search?: string;
}

type ContextResult = MemoryResult | SamplesResult;

/**
 * Project context tool for Ableton DJ MCP (memory + samples)
 * @param args - The parameters
 * @param args.action - Action to perform (read, write, forget, search)
 * @param args.fact - Fact id (read one, write, forget)
 * @param args.about - One-line fact description (write; required for a new fact)
 * @param args.content - Fact text (required for write)
 * @param args.search - Search filter (for search)
 * @param toolContext - The context object
 * @returns Result varies by action
 */
export function context(
  { action, fact, about, content, search }: ContextArgs = {},
  toolContext: Partial<ToolContext> = {},
): ContextResult {
  switch (action) {
    case "read":
      return handleReadMemory(fact, toolContext);
    case "write":
      return handleWriteMemory({ fact, about, content }, toolContext);
    case "forget":
      return handleForgetMemory(fact, toolContext);
    case "search":
      return handleSearchSamples(search, toolContext);
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}
