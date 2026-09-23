# AGENTS.md

Ableton DJ MCP lets an AI read and control Ableton Live over MCP.

- **User wants to install it**: follow
  [`docs/Setup.md` → For AI agents](docs/Setup.md#for-ai-agents-installing-this-for-a-user).
  Short version: Node 24+, clone, `npm run setup`, register the printed command
  with the MCP client, then walk the user through the steps in Live's UI. Don't
  run `npm install` or `npm run build`. End users don't need them.
- **User wants to make music with it**: call `adj-connect` first. It returns
  usage skills. Tool catalog:
  [`docs/Tools-Reference.md`](docs/Tools-Reference.md).
- **User wants to change the code**: read [`CLAUDE.md`](CLAUDE.md). It is the
  single source for dev workflow, coding rules, and PR conventions.
