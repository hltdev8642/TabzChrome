# Codex CLI Quick Reference

## Common Flags

| Flag | Description |
|------|-------------|
| `-m, --model` | Specify model (e.g., `o3`) |
| `-s, --sandbox` | Sandbox policy |
| `-a, --ask-for-approval` | Approval policy |
| `-i, --image` | Attach image(s) to prompt |
| `--oss` | Use local OSS model (LM Studio/Ollama) |

## Quick Launch

[Full Access Mode](tabz:spawn?cmd=codex%20-s%20danger-full-access&name=Codex%20Full)

[Read-Only Sandbox](tabz:spawn?cmd=codex%20-s%20read-only&name=Codex%20ReadOnly)

[Resume Latest](tabz:spawn?cmd=codex%20resume%20--last&name=Codex%20Resume)

## Sandbox Policies

```bash
# Read-only (safest)
codex -s read-only

# Write to workspace only
codex -s workspace-write

# Full access (dangerous)
codex -s danger-full-access
```

[Read-Only](tabz:paste?text=codex%20-s%20read-only) | [Workspace Write](tabz:paste?text=codex%20-s%20workspace-write) | [Full Access](tabz:paste?text=codex%20-s%20danger-full-access)

## Approval Policies

```bash
# Only trusted commands auto-run
codex -a untrusted

# Run all, ask on failure
codex -a on-failure

# Model decides when to ask
codex -a on-request

# Never ask (YOLO)
codex -a never
```

[Untrusted](tabz:paste?text=codex%20-a%20untrusted) | [On Failure](tabz:paste?text=codex%20-a%20on-failure) | [On Request](tabz:paste?text=codex%20-a%20on-request) | [Never Ask](tabz:paste?text=codex%20-a%20never)

## Non-Interactive Mode

```bash
# Execute prompt and exit
codex exec "fix the bug in main.py"

# Code review
codex review
```

[Exec Example](tabz:paste?text=codex%20exec%20%22fix%20the%20bug%20in%20main.py%22) | [Code Review](tabz:paste?text=codex%20review)

## Image Input

```bash
# Attach screenshot
codex -i screenshot.png "explain this UI"

# Multiple images
codex -i img1.png -i img2.png "compare these"
```

## Local Models (OSS)

```bash
# Use local model (auto-detect)
codex --oss

# Specify provider
codex --oss --local-provider lmstudio
codex --oss --local-provider ollama
```

## Configuration

```bash
# Override config value
codex -c model="o3"

# Enable feature
codex --enable feature-name

# Disable feature
codex --disable feature-name

# Use config profile
codex -p my-profile
```

## Session Management

```bash
# Resume picker
codex resume

# Resume most recent
codex resume --last

# Apply last diff as git patch
codex apply
```

## Commands

| Command | Description |
|---------|-------------|
| `codex exec` | Non-interactive mode |
| `codex review` | Code review |
| `codex resume` | Resume session |
| `codex apply` | Apply diff as git patch |
| `codex mcp` | MCP server management |
| `codex sandbox` | Debug sandbox |
