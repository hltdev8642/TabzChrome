# Claude Code Quick Reference

## Common Flags

| Flag | Description |
|------|-------------|
| `-p, --print` | Non-interactive mode (pipes, scripts) |
| `-c, --continue` | Continue last conversation |
| `-r, --resume` | Resume by session ID or picker |
| `--model <model>` | Use specific model (`sonnet`, `opus`, `haiku`) |
| `--agent <agent>` | Use custom agent |
| `--dangerously-skip-permissions` | Bypass all permission checks |

## Quick Launch

[Continue Last Session](tabz:spawn?cmd=claude%20-c&name=Claude%20Continue)

[Resume Session Picker](tabz:spawn?cmd=claude%20-r&name=Claude%20Resume)

[Opus Model](tabz:spawn?cmd=claude%20--model%20opus&name=Claude%20Opus)

[Haiku Model](tabz:spawn?cmd=claude%20--model%20haiku&name=Claude%20Haiku)

## Output Formats (with --print)

```bash
# Text output (default)
claude -p "explain this"

# JSON output
claude -p --output-format json "explain this"

# Streaming JSON
claude -p --output-format stream-json "explain this"
```

## Tool Control

```bash
# Allow only specific tools
claude --allowed-tools "Bash(git:*) Read"

# Deny specific tools
claude --disallowed-tools "Edit Write"

# Disable all tools
claude -p --tools ""
```

## Agents & System Prompts

```bash
# Use custom agent
claude --agent conductor:conductor

# Custom system prompt
claude --system-prompt "You are a code reviewer"

# Append to default prompt
claude --append-system-prompt "Focus on security"
```

## Session Management

```bash
# Fork a session (new ID from existing)
claude --resume abc123 --fork-session

# Specific session ID
claude --session-id "uuid-here"

# No persistence (ephemeral)
claude -p --no-session-persistence "query"
```

## MCP & Plugins

```bash
# Load MCP config
claude --mcp-config ./mcp.json

# Strict MCP (ignore other configs)
claude --strict-mcp-config --mcp-config ./mcp.json

# Load plugin directory
claude --plugin-dir ./my-plugins
```

## Budget Control (--print mode)

```bash
# Max spend limit
claude -p --max-budget-usd 1.00 "analyze codebase"
```

## Commands

| Command | Description |
|---------|-------------|
| `claude mcp` | Manage MCP servers |
| `claude plugin` | Manage plugins |
| `claude doctor` | Check auto-updater health |
| `claude update` | Check/install updates |
