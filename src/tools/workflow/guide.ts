// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

import { type GuideTopic, guideText } from "#src/skills/guides.ts";

interface GuideArgs {
  topic: GuideTopic;
}

interface GuideResult {
  topic: GuideTopic;
  guide: string;
}

/**
 * Return the production guide for a topic.
 * @param args - The parameters
 * @param args.topic - Guide topic
 * @returns Topic and its guide text
 */
export function guide({ topic }: GuideArgs): GuideResult {
  return { topic, guide: guideText(topic) };
}
