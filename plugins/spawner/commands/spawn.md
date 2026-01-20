---
name: spawn
description: "Spawn a Claude worker for a ready issue"
argument-hint: "ISSUE_ID"
---

# Spawn Worker

Spawn a Claude terminal in an isolated git worktree to work on a beads issue.

## Usage

```bash
/spawner:spawn ISSUE-ID
```

## Prerequisites

### Check TabzChrome Health
```bash
curl -sf http://localhost:8129/api/health >/dev/null || echo "TabzChrome not running"
```

### Verify Issue is Ready
```python
issue = mcp__beads__show(issue_id="ISSUE-ID")
# Check: status is ready or open with 'ready' label
# Check: prepared.prompt exists in notes (optional)
```

## Workflow

### 1. Create Git Worktree

```bash
ISSUE_ID="ISSUE-ID"
WORKDIR=$(pwd)

git worktree add ".worktrees/$ISSUE_ID" -b "feature/$ISSUE_ID"
```

### 2. Initialize Dependencies (SYNCHRONOUS)

Initialize BEFORE spawning so worker doesn't waste time:

```bash
INIT_SCRIPT=$(find ~/plugins ~/.claude/plugins -name "init-worktree.sh" -path "*conductor*" 2>/dev/null | head -1)
[ -n "$INIT_SCRIPT" ] && $INIT_SCRIPT ".worktrees/$ISSUE_ID" 2>&1 | tail -5
```

The init script handles:
| Detected File | Action |
|---------------|--------|
| `package.json` | `npm ci` (or pnpm/yarn/bun) |
| `pyproject.toml` | `uv pip install -e .` |
| `requirements.txt` | `uv pip install -r requirements.txt` |
| `Cargo.toml` | `cargo fetch` |
| `go.mod` | `go mod download` |

### 3. Spawn Terminal via TabzChrome

**Using MCP (preferred):**
```python
tabz_spawn_profile(
    profileId="claude-worker",
    workingDir="~/projects/.worktrees/ISSUE-ID",
    name="ISSUE-ID"
)
```

**Using REST API:**
```bash
TOKEN=$(cat /tmp/tabz-auth-token)
PLUGIN_DIRS="--plugin-dir $HOME/.claude/plugins/marketplaces --plugin-dir $HOME/plugins/my-plugins"

curl -s -X POST http://localhost:8129/api/spawn \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: $TOKEN" \
  -d "{
    \"name\": \"$ISSUE_ID\",
    \"workingDir\": \"$WORKDIR/.worktrees/$ISSUE_ID\",
    \"command\": \"BEADS_NO_DAEMON=1 claude $PLUGIN_DIRS\"
  }"
```

**Key settings:**
- `name`: Use issue ID for easy lookup
- `BEADS_NO_DAEMON=1`: Worktrees share the DB
- `--plugin-dir`: Workers need access to plugins

### 4. Wait for Claude Initialization

```bash
echo "Waiting for Claude to initialize..."
sleep 8
```

Claude needs 8+ seconds to fully boot.

### 5. Get Session ID

```bash
SESSION=$(curl -s http://localhost:8129/api/agents | jq -r --arg id "$ISSUE_ID" '.data[] | select(.name == $id) | .id')
```

### 6. Send Prompt

**Standard prompt (workers follow PRIME.md):**
```bash
PROMPT="Complete beads issue $ISSUE_ID. Run: bd show $ISSUE_ID --json"
```

**Using safe-send-keys.sh (reliable for long prompts):**
```bash
SAFE_SEND_KEYS=$(find ~/plugins ~/.claude/plugins -name "safe-send-keys.sh" -path "*conductor*" 2>/dev/null | head -1)
"$SAFE_SEND_KEYS" "$SESSION" "$PROMPT"
```

**Fallback with tmux:**
```bash
tmux send-keys -t "$SESSION" -l "$PROMPT"
sleep 1
tmux send-keys -t "$SESSION" C-m
```

### 7. Update Issue Status

```python
mcp__beads__update(issue_id="ISSUE-ID", status="in_progress")
```

## Quick Reference

```bash
ISSUE_ID="ISSUE-ID"
WORKDIR=$(pwd)
TOKEN=$(cat /tmp/tabz-auth-token)

# Create worktree
git worktree add ".worktrees/$ISSUE_ID" -b "feature/$ISSUE_ID"

# Initialize deps
INIT_SCRIPT=$(find ~/plugins ~/.claude/plugins -name "init-worktree.sh" -path "*conductor*" 2>/dev/null | head -1)
[ -n "$INIT_SCRIPT" ] && $INIT_SCRIPT ".worktrees/$ISSUE_ID"

# Plugin directories
PLUGIN_DIRS="--plugin-dir $HOME/.claude/plugins/marketplaces --plugin-dir $HOME/plugins/my-plugins"

# Spawn terminal
curl -s -X POST http://localhost:8129/api/spawn \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: $TOKEN" \
  -d "{
    \"name\": \"$ISSUE_ID\",
    \"workingDir\": \"$WORKDIR/.worktrees/$ISSUE_ID\",
    \"command\": \"BEADS_NO_DAEMON=1 claude $PLUGIN_DIRS\"
  }"

# Wait and send prompt
sleep 8
SESSION=$(curl -s http://localhost:8129/api/agents | jq -r --arg id "$ISSUE_ID" '.data[] | select(.name == $id) | .id')
SAFE_SEND_KEYS=$(find ~/plugins ~/.claude/plugins -name "safe-send-keys.sh" -path "*conductor*" 2>/dev/null | head -1)
"$SAFE_SEND_KEYS" "$SESSION" "Complete beads issue $ISSUE_ID. Run: bd show $ISSUE_ID --json"
```

## Worker Dashboard

Monitor workers with tmuxplexer:

```bash
curl -s -X POST http://localhost:8129/api/spawn \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: $TOKEN" \
  -d '{
    "name": "Worker Dashboard",
    "workingDir": "/home/marci/projects/tmuxplexer",
    "command": "./tmuxplexer --watcher"
  }'
```

## Naming Convention

**Use issue ID as terminal name.** This enables:
- Easy lookup via `/api/agents`
- Clear display in dashboard
- Correlation: terminal = issue = branch = worktree

## Notes

- Initialize deps SYNCHRONOUSLY before spawning
- Wait 8+ seconds for Claude to boot before sending prompt
- Workers follow PRIME.md - they'll read the issue and work autonomously
- Use `BEADS_NO_DAEMON=1` in worker command (worktrees share DB)
- Pass `--plugin-dir` flags so workers have access to plugins
