# Setup

Get from zero to "AI controls my Live set" in about 5 minutes.

**Contents:** [Requirements](#requirements) ·
[No-terminal install](#quick-install-without-a-terminal-claude-desktop) ·
[Install](#1-install) · [Finish in Live](#2-finish-in-live) ·
[Connect your AI](#3-connect-your-ai-client) · [Verify](#4-verify) ·
[For AI agents](#for-ai-agents-installing-this-for-a-user) · [Update](#update) ·
[Uninstall](#uninstall) · [Optional extras](#optional-extras) ·
[Troubleshooting](#troubleshooting)

## Requirements

- Ableton Live 12.3+ with Max for Live
- Node.js 24+ for the git install (`node -v` to check;
  [nodejs.org](https://nodejs.org)). Not needed for the Claude Desktop `.mcpb`
- macOS or Windows
- An MCP client (Claude Code, Claude Desktop, Cursor, …)

## Quick install without a terminal (Claude Desktop)

From the
[latest release](https://github.com/gpulga/ableton-dj-mcp/releases/latest)
download both files:

- **`ableton-dj-mcp-<version>.zip`**: unzip it and copy its `Presets` and
  `Remote Scripts` folders into your Ableton User Library (macOS:
  `~/Music/Ableton/User Library/`, Windows: `Documents\Ableton\User Library\`),
  merging with what's there. Then do [step 2](#2-finish-in-live).
- **`ableton-dj-mcp-<version>.mcpb`**: double-click it to install into Claude
  Desktop. No Node.js needed; Claude Desktop runs it.

Then ask Claude: "connect to ableton". For Claude Code or other clients, use the
git install below.

## 1. Install

```bash
git clone https://github.com/gpulga/ableton-dj-mcp.git
cd ableton-dj-mcp
npm run setup
```

No `npm install` or build is needed. The built files are committed, and the
setup scripts only use Node built-ins. `npm run setup`:

1. Copies the Max for Live device to your User Library:
   - macOS: `~/Music/Ableton/User Library/Presets/MIDI Effects/Max MIDI Effect/`
   - Windows:
     `%USERPROFILE%\Documents\Ableton\User Library\Presets\MIDI Effects\Max MIDI Effect\`
2. Copies the Python bridge (needed for browsing/loading presets and clip
   automation) to `User Library/Remote Scripts/AbletonDjMcp/`
3. Prints the connect command for your AI client, with this clone's absolute
   path filled in

Re-running it is safe, because it overwrites the previous install.

## 2. Finish in Live

These steps happen in Live's UI, so no script can do them:

1. **Restart Live** so it picks up the new files.
2. **Settings (Preferences) → Link, Tempo & MIDI → Control Surface** → choose
   **AbletonDjMcp** in an empty slot. Input/Output can stay "None".
3. **Load the device.** Browser → Max for Live → Max MIDI Effect → drag
   **Ableton_DJ_MCP** onto a track. A return or master track is best, since it
   won't be deleted by accident. Wait for the device to show
   `MCP server running on :3350`.
4. **Recommended: File → Save Live Set as Default Set.** Every new set then
   includes the device, so you never drag it in again.

## 3. Connect your AI client

Use the command `npm run setup` printed. It has your real path. The general
form:

**Claude Code**

```bash
claude mcp add ableton-dj-mcp -- node "/absolute/path/to/ableton-dj-mcp/dist/ableton-dj-mcp-portal.js"
```

Start a new Claude Code session afterwards. `/mcp` should list `ableton-dj-mcp`
as connected.

**Claude Desktop**: add this to `claude_desktop_config.json`, then restart the
app:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "ableton-dj-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/ableton-dj-mcp/dist/ableton-dj-mcp-portal.js"]
    }
  }
}
```

**Other MCP clients**: stdio command
`node /absolute/path/to/ableton-dj-mcp/dist/ableton-dj-mcp-portal.js`, or HTTP
at `http://localhost:3350/mcp`.

## 4. Verify

With Live open and the device loaded, ask your AI:

```
connect to ableton
```

It calls `adj-connect` and should report `connected: true` with your Live
version. Try something small next: _"what tracks are in my set?"_

From a terminal,
`curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3350/mcp` prints a
non-zero status when the device is up.

## For AI agents installing this for a user

Run steps 1 and 3 yourself, and walk the user through step 2. Checklist:

1. **Preflight.** `node -v` must be ≥ 24. If it isn't, stop and tell the user to
   install Node 24+. Confirm Ableton Live 12.3+ with Max for Live is installed.
   Ask the user if you can't tell. The OS must be macOS or Windows.
2. **Install.** Clone to a stable location, such as `~/ableton-dj-mcp`. Don't
   use a temp dir, because the MCP config points at this path. Then run
   `npm run setup` inside it. Don't run `npm install`, since it isn't needed.
3. **Register.** Run the exact `claude mcp add …` line that setup printed. For
   other clients, write the printed JSON into their config. Don't overwrite
   other servers already in the file.
4. **Hand off the Live steps.** Relay [step 2](#2-finish-in-live) to the user in
   plain words and wait for them to confirm the device shows
   `MCP server running on :3350`.
5. **Verify.** MCP tools load when a session starts. Tell the user to start a
   new AI session, and in it call `adj-connect`. For a quick check before that,
   run the `curl` in [Verify](#4-verify).
6. Report back: install path, what was registered, and anything the user still
   has to do.

When operating Live, always call `adj-connect` first. It returns the skills and
conventions for using the other tools. Full catalog:
[Tools-Reference.md](Tools-Reference.md).

## Update

```bash
cd ableton-dj-mcp
git pull
npm run setup
```

Then remove and re-add the device in Live, or restart Live.

## Uninstall

1. `claude mcp remove ableton-dj-mcp`, or delete the entry from your client
   config.
2. Delete from your User Library: `Presets/MIDI Effects/Max MIDI Effect/` (the
   `Ableton_DJ_MCP.amxd`, `*.maxpat`, `live-api-adapter.js`, `mcp-server.mjs`
   files) and `Remote Scripts/AbletonDjMcp/`.
3. Delete the cloned folder.

## Optional extras

### Auto-launch Live (macOS)

Add `ADJ_AUTO_BOOT=true` to the server's environment. When the AI calls a tool
and `:3350` is down, the portal opens Live and waits up to 30s. This requires
the default set to include the device ([step 2.4](#2-finish-in-live)). It never
relaunches a Live that's already open.

```bash
claude mcp add ableton-dj-mcp -e ADJ_AUTO_BOOT=true -- node "/absolute/path/to/dist/ableton-dj-mcp-portal.js"
```

For Claude Desktop, add `"env": { "ADJ_AUTO_BOOT": "true" }` to the server
entry.

### Launch Live from the terminal

```bash
npm run start:live               # open Live
npm run start:live -- path.als   # open a specific set
```

### Music workspace

```bash
npm run init:workspace
```

This creates a private, gitignored `workspace/` for project notes, genre notes
and your own AI instructions (`workspace/AI.md`). Start your AI client from
inside `workspace/` for music sessions, so it loads music context instead of
developer context.

## Troubleshooting

| Symptom                                           | Fix                                                                                       |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `connection refused :3350` / "device not running" | Device isn't loaded in the open set. Drag it onto a track ([step 2.3](#2-finish-in-live)) |
| AI doesn't see any `adj-*` tools                  | Start a new AI session / restart the client after adding the server                       |
| Device not in Live's browser                      | Restart Live, or right-click User Library → Refresh. Re-run `npm run setup`               |
| `bpatcher: error loading patcher tab-*.maxpat`    | Incomplete install. Re-run `npm run setup`                                                |
| `adj-browse` / preset loading / automation errors | Bridge not enabled. Do [step 2.2](#2-finish-in-live), then restart Live                   |
| Auto-launch opens Live but `:3350` never comes up | Default set lacks the device. Do [step 2.4](#2-finish-in-live)                            |
| `setup: Node 24+ required`                        | Install Node 24+ from nodejs.org                                                          |
| Wrong version shown in device console             | Stale install. `git pull && npm run setup`, then reload the device                        |

Still stuck? [Open an issue](https://github.com/gpulga/ableton-dj-mcp/issues)
with your OS, Live version, and the device console output.
