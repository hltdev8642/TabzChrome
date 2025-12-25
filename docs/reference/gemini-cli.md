# Gemini CLI Quick Reference

## Common Flags

| Flag | Description |
|------|-------------|
| `-m, --model` | Specify model |
| `-y, --yolo` | Auto-approve all actions |
| `-s, --sandbox` | Run in sandbox mode |
| `-r, --resume` | Resume session (`latest` or index) |
| `-i, --prompt-interactive` | Run prompt then stay interactive |

## Quick Launch

[YOLO Mode](tabz:spawn?cmd=gemini%20-y&name=Gemini%20YOLO)

[Sandbox Mode](tabz:spawn?cmd=gemini%20-s&name=Gemini%20Sandbox)

[Resume Latest](tabz:spawn?cmd=gemini%20-r%20latest&name=Gemini%20Resume)

## Approval Modes

```bash
# Default - prompt for approval
gemini --approval-mode default

# Auto-approve edits only
gemini --approval-mode auto_edit

# Auto-approve everything (YOLO)
gemini --approval-mode yolo
```

## Output Formats

```bash
# Text output
gemini -o text "query"

# JSON output
gemini -o json "query"

# Streaming JSON
gemini -o stream-json "query"
```

## Extensions & Tools

```bash
# List available extensions
gemini -l

# Use specific extensions
gemini -e extension1 -e extension2

# Allow specific tools
gemini --allowed-tools tool1 tool2
```

## Session Management

```bash
# Resume most recent
gemini -r latest

# Resume by index
gemini -r 5

# List available sessions
gemini --list-sessions

# Delete session
gemini --delete-session 3
```

## Include Directories

```bash
# Add workspace directories
gemini --include-directories ~/other-project
```

## MCP Servers

```bash
# Allow specific MCP servers
gemini --allowed-mcp-server-names server1 server2

# Manage MCP
gemini mcp
```

## Accessibility

```bash
# Screen reader mode
gemini --screen-reader
```

## Commands

| Command | Description |
|---------|-------------|
| `gemini mcp` | Manage MCP servers |
| `gemini extensions` | Manage extensions |
