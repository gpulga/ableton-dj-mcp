# Releasing

How releases work + how to deploy a new version locally.

## Release process (automated)

Driven by [release-please](https://github.com/googleapis/release-please).

1. Write commits in [Conventional Commits](https://www.conventionalcommits.org/)
   format:
   - `feat: ...` → minor version bump
   - `fix: ...` → patch version bump
   - `perf: ...` → patch version bump
   - `chore: ...`, `ci: ...`, `docs: ...` → no release
   - `feat!: ...` or `BREAKING CHANGE:` footer → major version bump
2. Merge PRs to `main` as usual
3. Release-please opens a release PR
   (`chore(main): release ableton-dj-mcp X.Y.Z`) accumulating all unreleased
   changes
4. Merge the release PR
5. Release-please cuts the git tag, GitHub release, and CHANGELOG entry

## Files release-please updates

| File                                   | What                                                          |
| -------------------------------------- | ------------------------------------------------------------- |
| `package.json`                         | `version` field                                               |
| `package-lock.json`                    | `version` field                                               |
| `src/shared/version.ts`                | `VERSION` constant (via `// x-release-please-version` marker) |
| `CHANGELOG.md`                         | new release section                                           |
| `config/.release-please-manifest.json` | tracking                                                      |

To add a new file with a hardcoded version:

1. Annotate the version line:
   `export const X = "1.0.0"; // x-release-please-version`
2. Add to `config/release-please-config.json` under `extra-files`

## Deploying a new version locally

`dist/` is rebuilt once per release, not on every merge. The release workflow
([`release.yml`](../.github/workflows/release.yml)) runs
`RELEASE_BUILD=true npm run build` on the open release-please PR branch and
commits `dist/` there, so it lands on `main` together with the version bump.
Between releases, `dist/` on `main` is the last released build.
`npm run install:device` reads the built JS bundles directly from `dist/` (and
the static `.amxd`/`.maxpat` assets from `max-for-live-device/`).

After a release lands on `main`:

```bash
git checkout main && git pull
npm run install:device   # refresh the copy in your Live User Library
```

To run unreleased code from `main` or a local branch, run `npm run build` first.
Don't commit the resulting `dist/` changes — the release PR owns them.

Then in Ableton Live:

1. Eject the `Ableton_DJ_MCP` device from its MIDI track (or restart Live)
2. Re-drag the device onto the track (from User Library if installed via
   `npm run install:device`, otherwise from `max-for-live-device/`)
3. Verify console shows the new version:

```
node.script: [...] Ableton DJ MCP <new-version> running.
v8: [...] Ableton DJ MCP <new-version> Live API adapter ready
```

## Hot dev loop (no manual copy)

For active development, skip the manual `cp` + reload cycle:

```bash
npm run dev:hot
```

Runs `rollup -c -w` and a chokidar watcher on `dist/`. On every save:

1. Rollup rebuilds the bundle that changed.
2. Watcher copies `dist/live-api-adapter.js` + `dist/mcp-server.mjs` into
   `max-for-live-device/`.
3. `pkill -f mcp-server.mjs` kills the running node.script child; Max respawns
   it from the new bundle.

Edits to V8-only paths (`live-api-adapter.ts`) don't trigger Max to respawn the
v8 engine — click the device's reload button or eject + reinsert if you don't
see the new version line in the console.

This script is dev-only and writes to your local `max-for-live-device/`
(gitignored) for fast iteration. `dist/` itself is kept current on `main` by the
CI rebuild, independent of this loop.

## Why max-for-live-device/ still exists

The `.amxd` references sibling JS files via relative path
(`v8 ./live-api-adapter.js`, `node.script ./mcp-server.mjs`). If you drag
`max-for-live-device/Ableton_DJ_MCP.amxd` directly onto a track (the manual
install fallback in [Setup.md](Setup.md), instead of running
`npm run install:device`), those JS siblings need to physically exist next to it
— that's what `npm run dev:hot`'s watcher keeps populated during active
development. `npm run install:device` doesn't need this bridging: it reads the
built JS straight from `dist/` and only pulls the static `.amxd`/`.maxpat` files
from `max-for-live-device/`.

## Verifying a release end-to-end

```bash
# Confirm the bundle has the expected version baked in
grep -o '1\.[0-9]\.[0-9]' dist/live-api-adapter.js | sort -u
```

Should match the version in `package.json`.
