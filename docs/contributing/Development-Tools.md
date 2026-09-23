# Development Tools

Essential tools for testing, debugging, and validating Ableton DJ MCP
functionality. Claude Code should use these tools to ensure quality and
investigate issues.

## CLI Tool

**Purpose:** Direct MCP server interaction for end-to-end testing. Claude Code
should use this to verify changes work correctly before considering tasks
complete.

### Basic Commands

```bash
# Show server info (default)
node scripts/adj-client.ts

# List available tools
node scripts/adj-client.ts tools/list

# Call a tool with JSON arguments
node scripts/adj-client.ts tools/call adj-read-live-set '{}'
node scripts/adj-client.ts tools/call adj-duplicate '{"type": "scene", "id": "7", "destination": "arrangement", "arrangementStart": "5|1"}'

# Use a different server URL
node scripts/adj-client.ts http://localhost:6274/mcp tools/list

# Show help
node scripts/adj-client.ts --help
```

### Testing Workflow

Claude Code should use the CLI tool to:

1. Verify tool implementations work correctly
2. Test edge cases with specific arguments
3. Validate state changes in Live
4. Ensure error handling works as expected

**Important:** Always ask for user permission before using the CLI tool to
update state in Ableton Live.

## Raw Live API Tool

Available only when built with the raw API flag enabled:
`ENABLE_RAW_LIVE_API=true npm run build` (there is no `build:debug` /
`dev:debug` script — the flag is a build-time env var read by
`config/rollup.config.mjs`).

### Purpose

Direct Live API access for investigation, debugging, and exploring API behavior.
Claude Code should use this when:

- Investigating unexpected Live API behavior
- Debugging complex state issues
- Exploring undocumented API features
- Verifying assumptions about how the Live API works

Not included in production builds.

### Usage Examples

```bash
# Multiple operation types on live_set tempo
node scripts/adj-client.ts tools/call adj-raw-live-api '{
  "path": "live_set",
  "operations": [
    {"type": "get", "property": "tempo"},
    {"type": "getProperty", "property": "tempo"}
  ]
}'

# Explore track properties
node scripts/adj-client.ts tools/call adj-raw-live-api '{
  "path": "live_set tracks 0",
  "operations": [
    {"type": "info"},
    {"type": "getChildIds"}
  ]
}'

# Navigate and modify
node scripts/adj-client.ts tools/call adj-raw-live-api '{
  "operations": [
    {"type": "goto", "value": "live_set tracks 0"},
    {"type": "set", "property": "name", "value": "My Track"},
    {"type": "get", "property": "name"}
  ]
}'
```

### Operation Types

**Core operations:**

- `get_property` - Get property value using Live API convention
- `set_property` - Set property value
- `call_method` - Call a method

**Convenience shortcuts:**

- `get` - Alias for get_property
- `set` - Alias for set_property
- `call` - Alias for call_method
- `goto` - Navigate to a new path
- `info` - Get object information

**Extension methods:**

- `getProperty` - Get property with cleaner interface
- `getChildIds` - Get child object IDs
- `exists` - Check if object exists
- `getColor` - Get color as hex string
- `setColor` - Set color from hex string

### Important Limitations

- **Warning location**: When running multiple operations, Live API warnings
  appear at the end without indicating which operation triggered them
- **Debugging tip**: Run operations individually to isolate which operation
  causes warnings
- **Max operations**: 50 operations per tool call to prevent performance issues
- **Full access**: This tool provides unrestricted Live API access - use with
  caution

## MCP Inspector

For comprehensive MCP protocol debugging:

```bash
npx @modelcontextprotocol/inspector
```

Then open:
http://localhost:6274/?transport=streamable-http&serverUrl=http://localhost:3350/mcp

Provides:

- Full protocol trace
- Request/response inspection
- Tool testing interface
- Performance metrics

## Build Warnings

### Expected Warnings

Circular dependency warnings from `zod-to-json-schema` are harmless:

```
Circular dependency: node_modules/zod-to-json-schema/...
```

These come from the MCP SDK's dependencies and don't affect functionality.

### Build Validation

After `npm run build`, verify all three bundles exist in `dist/`:

1. `dist/mcp-server.mjs` (large — bundles @modelcontextprotocol/sdk + express)
2. `dist/live-api-adapter.js`
3. `dist/ableton-dj-mcp-portal.js`
4. No unexpected errors in build output

Deploying these to Live requires copying them into `max-for-live-device/`. See
[Releasing.md](../Releasing.md).

## Testing Workflows

### Quick Development Loop

```bash
# Terminal 1: Auto-rebuild
npm run dev

# Terminal 2: Run tests in watch mode
npm run test:watch

# Terminal 3: Test specific functionality
node scripts/adj-client.ts tools/call adj-read-live-set '{}'
```

### Full Validation

```bash
# Clean build (raw Live API tool enabled — there is no `npm run clean` script)
rm -rf dist
ENABLE_RAW_LIVE_API=true npm run build

# Run all tests with coverage
npm run test:coverage
# Console shows summary totals; see coverage/coverage-summary.txt for per-file breakdown
# Or open coverage/index.html for visual report

# Format check
npm run format:check

# Manual testing against the running device
node scripts/adj-client.ts tools/list
```

## Debugging Tips

### Enable Verbose Logging

The portal (stdio bridge) writes log files when these are set in its MCP client
env:

```bash
claude mcp add ableton-dj-mcp -e ENABLE_LOGGING=true -e VERBOSE_LOGGING=true \
  -- node "/absolute/path/to/ableton-dj-mcp/dist/ableton-dj-mcp-portal.js"
```

### Check Log Files

**macOS:**

```bash
tail -f ~/Library/Logs/Ableton\ DJ\ MCP/*.log
```

**Windows:**

```bash
Get-Content "$env:LOCALAPPDATA\Ableton DJ MCP\Logs\*.log" -Tail 10 -Wait
```

### Max Console

In Ableton Live, open Max window to see:

- `Max.post()` output
- Error messages
- MCP request/response logging

### Common Issues

**Tool descriptions not updating:**

- Toggle extension off/on in Claude Desktop settings

**Connection timeouts:**

- Check Ableton DJ MCP device shows "Running" in Live
- Verify port 3350 is not blocked
- Try reloading the Max device

**State sync issues:**

- Use `adj-read-live-set` to refresh state
- Check for timing-sensitive operations
- Consider optimistic updates for playback
