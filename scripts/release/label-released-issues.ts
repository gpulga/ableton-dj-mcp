// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

// Labels every issue a release closed, and the PRs that closed it, with the
// release's version (e.g. "2.6.0"), so the version that shipped a fix or
// feature stays visible on the issue.
//
//   node scripts/release/label-released-issues.ts ableton-dj-mcp-v2.6.0
//
// The PRs in a release are the "(#N)" suffixes squash merges leave on the
// commits since the previous release tag. An issue counts when the PR closes
// it (Fixes/Closes/Resolves) or references it with "Refs #N" and the issue is
// closed by now. Requires `gh` (authenticated) and `git` with tags fetched.

import { execFileSync } from "node:child_process";

const TAG_PREFIX = "ableton-dj-mcp-v";
const LABEL_COLOR = "0e8a16";
const ISSUE_REF = /\b(?:fix(?:es|ed)?|close[sd]?|resolve[sd]?|refs?)\s+#(\d+)/gi;

const tag = process.argv[2];

if (!tag?.startsWith(TAG_PREFIX)) {
  console.error(`usage: label-released-issues.ts ${TAG_PREFIX}<version>`);
  process.exit(1);
}

const version = tag.slice(TAG_PREFIX.length);
const previousTag = run("git", [
  "describe",
  "--tags",
  "--abbrev=0",
  "--match",
  `${TAG_PREFIX}*`,
  `${tag}^`,
]);
const subjects = run("git", ["log", "--format=%s", `${previousTag}..${tag}`]);
const prNumbers = [...subjects.matchAll(/\(#(\d+)\)$/gm)].map((m) =>
  Number(m[1]),
);

ensureLabel(version);

const labeled = new Set<number>();

for (const pr of prNumbers) {
  const issues = releasedIssues(pr);

  if (issues.length === 0) continue;

  addLabel(pr, version);

  for (const issue of issues) {
    if (!labeled.has(issue)) {
      addLabel(issue, version);
      labeled.add(issue);
    }
  }
}

const labeledList = [...labeled].map((n) => "#" + String(n)).join(" ");

console.log(
  `${version}: labeled ${labeled.size} issue(s) from ${prNumbers.length} PR(s) since ${previousTag}: ${labeledList || "none"}`,
);

/**
 * Closed issues a PR fixed or referenced
 * @param pr - PR number
 * @returns Issue numbers
 */
function releasedIssues(pr: number): number[] {
  const view = JSON.parse(
    run("gh", ["pr", "view", String(pr), "--json", "body,closingIssuesReferences"]),
  ) as { body: string; closingIssuesReferences: { number: number }[] };
  const closing = view.closingIssuesReferences.map((issue) => issue.number);
  const referenced = [...view.body.matchAll(ISSUE_REF)]
    .map((m) => Number(m[1]))
    .filter((n) => n !== pr && !closing.includes(n) && isClosedIssue(n));

  return [...new Set([...closing, ...referenced])];
}

/**
 * @param number - Issue or PR number
 * @returns Whether it is an issue (not a PR) and closed
 */
function isClosedIssue(number: number): boolean {
  try {
    const issue = JSON.parse(
      run("gh", ["api", `repos/{owner}/{repo}/issues/${number}`]),
    ) as { state: string; pull_request?: unknown };

    return issue.pull_request == null && issue.state === "closed";
  } catch {
    return false;
  }
}

/** @param name - Label to create if the repo doesn't have it */
function ensureLabel(name: string): void {
  run("gh", [
    "label",
    "create",
    name,
    "--color",
    LABEL_COLOR,
    "--description",
    `Shipped in ${name}`,
    "--force",
  ]);
}

/**
 * @param number - Issue or PR number
 * @param label - Label to add
 */
function addLabel(number: number, label: string): void {
  run("gh", ["issue", "edit", String(number), "--add-label", label]);
}

/**
 * @param command - Executable
 * @param args - Arguments
 * @returns Trimmed stdout
 */
function run(command: string, args: string[]): string {
  return execFileSync(command, args, { encoding: "utf8" }).trim();
}
