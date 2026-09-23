# How to Write a Music Finding

Format spec for `workspace/findings/`. Loaded by `/update-docs` skill before
writing. AI-optimized: lazy loading, no duplicates, no boilerplate.

Mirror of `docs/findings/HOW-TO-WRITE.md` (the tool/dev findings spec) but tuned
for music production knowledge.

## What goes here

Validated music production knowledge captured during real sessions. Each finding
is one technique, one observation, or one rule with concrete evidence from your
own work.

## What does NOT go here

- Tool bugs or feature requests → file as a GitHub issue in
  `gpulga/ableton-dj-mcp` instead
- Generic music theory available anywhere on the web
- Things from a tutorial or article (unless you tested them yourself and it
  worked)
- Speculation: "I think X would sound good"
- Restating what's already in `AI.md`

## Validation bar

A music finding is valid only if proven in a real session by ONE of:

- A clip you generated that sounded right (cite project + clip name)
- A reference track analysis you completed (cite track + timestamp)
- An A/B test where one approach clearly worked better (cite both)
- A failure that taught you what NOT to do (cite the symptom)
- A technique you applied across multiple projects with consistent results

If you can't point to a specific session, project, or audio output → don't write
the finding.

## File layout

```
workspace/findings/
├── INDEX.md                 ← always loaded, one line per finding
├── HOW-TO-WRITE.md          ← this file
├── genre/                   ← genre-specific patterns (techno, house, psy, etc.)
├── technique/               ← cross-genre techniques (mixing, arrangement, sound design)
└── sound-design/            ← specific sound recipes (pads, leads, kicks, basses)
```

Add new domains as needed. Mirror the routing-by-glob pattern.

## Filename rules

- Path: `<domain>/<slug>.md`
- Slug: kebab-case, ≤ 5 words
- Slug names the technique, not the symptom: `bass-off-beat-rule` not
  `bass-sounds-bad-fix`
- Lowercase only

## Strict file template

```markdown
---
title: <slug-matches-filename>
domain: <genre|technique|sound-design>
genre: <house|techno|melodic-techno|psy|indie-dance|all>
validated: <YYYY-MM-DD>
evidence: <project name | reference track | session description>
---

## Fact

<one or two sentences. The technique itself. No buildup.>

## Evidence

<concrete proof: project where it worked, reference track that uses it, A/B
comparison, or failed attempt that taught the lesson.>

## Apply when

<condition that triggers relevance: genre, section type, instrument, or
production stage.>
```

### Section rules

- Exactly 3 sections: Fact, Evidence, Apply when
- No "Background", "Why", "History" — they rot
- No marketing language ("warm", "punchy", "magic") without explaining HOW
- Code blocks for exact parameters only — bar|beat notation, velocity, BPM
- Reference real artists/tracks if the technique came from analysis

## INDEX rules

`INDEX.md` is always loaded by AI sessions in `workspace/`. Keep it lean.

Format per line:

```
- [<slug>](<domain>/<slug>.md) [<glob>,<glob>] — <summary>
```

Globs match against:

- Genre keywords in your prompt (`techno`, `psy`, `melodic`)
- Section keywords (`intro`, `breakdown`, `peak`, `outro`)
- Instrument keywords (`bass`, `kick`, `lead`, `pad`)
- Project file paths (`projects/melodic-track/**`)

Examples:

```
- [bass-off-beat-rule](technique/bass-off-beat-rule.md) [bass*, melodic*, techno*] — first bass hit at 1.25 not 1, creates pump against kick
- [psy-acid-bassline](genre/psy-acid-bassline.md) [psy*, acid*, bass*] — 16th-note pattern with filter env, root + b2 + root within bar
```

Summary ≤ 120 chars. Sort alphabetically within domain.

## Deduplication

Before writing:

1. Read INDEX
2. grep for keywords from the candidate finding
3. If match → read existing file → extend or skip
4. If no match → new file

Two files for same fact = wasted context.

## Anti-patterns

- ❌ "Tried X, didn't work, will try Y" — not validated yet, save when Y works
- ❌ "Generic minor key sounds emotional" — too generic, not actionable
- ❌ Multiple findings stuffed in one file
- ❌ "Use this for any genre" — too broad, hurts routing
- ❌ Documenting a one-off accident as a rule

## When in doubt, skip

Better to capture nothing than to capture noise. Bad findings rot the knowledge
base faster than good ones grow it.

## Tool vs music findings

| Discovery type                             | Where to capture                                   |
| ------------------------------------------ | -------------------------------------------------- |
| MCP tool bug or missing feature            | GitHub issue in `gpulga/ableton-dj-mcp`            |
| MCP tool quirk that affects how you use it | `docs/findings/dev/` (in tool repo, public)        |
| Music technique that worked                | `workspace/findings/technique/` (here, private)    |
| Genre-specific pattern from analysis       | `workspace/findings/genre/` (here, private)        |
| Sound design recipe                        | `workspace/findings/sound-design/` (here, private) |

When unsure: if it's about HOW to use the tool, it's tool. If it's about WHAT to
make musically, it's music.
