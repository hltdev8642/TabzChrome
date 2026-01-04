---
description: "Spawn multiple Claude workers with skill-aware prompts to tackle beads issues in parallel"
---

# Beads Swarm - Parallel Issue Processing

Spawn multiple Claude workers to tackle beads issues in parallel, with skill-aware prompting and environment preparation.

## Quick Start

```bash
# Interactive: select issues and worker count
/bd-swarm

# Auto mode: process entire backlog autonomously
/bd-swarm --auto
```

## Workflow Overview

```
1. Get ready issues      →  bd ready
2. Create worktrees      →  git worktree add (parallel isolation)
3. Spawn workers         →  TabzChrome spawn API
4. Send prompts          →  tmux send-keys with skill hints
5. Monitor via tmuxplexer →  Background window polling
6. Complete pipeline     →  Merge → Sync → Push
```

---

## Monitoring Workers

**Key change**: Instead of a watcher subagent, monitor workers directly via tmuxplexer in a background window.

### Spawn Monitor

```bash
# Spawn tmuxplexer --watcher as background window (window 2)
plugins/conductor/scripts/monitor-workers.sh --spawn
```

The monitor shows all AI sessions with:
- Status: idle, processing, tool_use, awaiting_input
- Context %
- Current tool

### Poll Status

```bash
# Get parsed worker statuses
plugins/conductor/scripts/monitor-workers.sh --status
# Output: ctt-worker-abc|tool_use|45

# Get summary
plugins/conductor/scripts/monitor-workers.sh --summary
# Output: WORKERS:3 WORKING:2 IDLE:0 AWAITING:1 STALE:0

# Check specific issue
plugins/conductor/scripts/monitor-workers.sh --check-issue TabzChrome-abc
# Output: CLOSED or OPEN
```

### Decision Logic

Poll every ~2 minutes and decide:

| Status | Action |
|--------|--------|
| `tool_use` / `processing` | Working, leave alone |
| `awaiting_input` / `idle` | At prompt - check if issue closed or stuck |
| `stale` (5+ min no activity) | May be hung, investigate pane |
| Issue closed | Worker done, ready for cleanup |

**Note:** `awaiting_input` means worker is at prompt (ready for input), not necessarily AskUserQuestion. Check the actual pane to see if they're waiting on something.

### Drill Down

Only capture worker panes when needed:

```bash
tmux capture-pane -t <worker-session> -p -S -50
```

---

## Interactive Mode (Default)

### 1. Get Ready Issues

```bash
bd ready --json | jq -r '.[] | "\(.id): [\(.priority)] [\(.type)] \(.title)"' | head -5
```

### 2. Select Worker Count

Ask user: How many workers? (2, 3, 4, 5)

### 3. Create Worktrees

```bash
for ISSUE in TabzChrome-abc TabzChrome-def; do
  WORKTREE="${PROJECT_DIR}-worktrees/${ISSUE}"
  mkdir -p "$(dirname "$WORKTREE")"
  git worktree add "$WORKTREE" -b "feature/${ISSUE}" 2>/dev/null || \
  git worktree add "$WORKTREE" HEAD

  # Install deps
  [ -f "$WORKTREE/package.json" ] && [ ! -d "$WORKTREE/node_modules" ] && \
    (cd "$WORKTREE" && npm ci 2>/dev/null || npm install)
done
```

### 4. Spawn Workers

```bash
TOKEN=$(cat /tmp/tabz-auth-token)
bd update <issue-id> --status in_progress

curl -s -X POST http://localhost:8129/api/spawn \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: $TOKEN" \
  -d '{"name": "Claude: <issue-id>", "workingDir": "<worktree>", "command": "claude --dangerously-skip-permissions"}'
```

### 5. Send Skill-Aware Prompts

```bash
SESSION="ctt-claude-xxx"
sleep 4

if ! tmux has-session -t "$SESSION" 2>/dev/null; then
  echo "ERROR: Session does not exist"
  exit 1
fi

tmux send-keys -t "$SESSION" -l '## Task
<issue-id>: <title>

<description>

## Skills
Run `/ui-styling:ui-styling` or `/xterm-js` based on task type.

## Completion
When done: `/worker-done <issue-id>`'
sleep 0.3
tmux send-keys -t "$SESSION" C-m
```

### 6. Start Monitor & Poll

```bash
# Spawn background monitor
plugins/conductor/scripts/monitor-workers.sh --spawn

# Poll every 2 minutes
while true; do
  SUMMARY=$(plugins/conductor/scripts/monitor-workers.sh --summary)
  echo "[$(date)] $SUMMARY"

  # Check if all issues closed
  ALL_CLOSED=true
  for ISSUE in $ISSUES; do
    if ! bd show "$ISSUE" 2>/dev/null | grep -q "Status: closed"; then
      ALL_CLOSED=false
      break
    fi
  done

  if $ALL_CLOSED; then
    echo "All issues closed - running completion pipeline"
    break
  fi

  sleep 120
done
```

### 7. Completion Pipeline

When all workers done:

```bash
# Merge branches
cd "$PROJECT_DIR"
for ISSUE in $ISSUES; do
  git merge "feature/${ISSUE}" --no-edit
done

# Cleanup worktrees
for ISSUE in $ISSUES; do
  git worktree remove "${PROJECT_DIR}-worktrees/${ISSUE}" --force
  git branch -d "feature/${ISSUE}"
done

# Sync and push
bd sync && git push origin main

# Notify
mcp-cli call tabz/tabz_speak '{"text": "Sprint complete"}'
```

---

## Auto Mode (`--auto`)

Fully autonomous backlog completion. Runs until `bd ready` returns empty.

### Wave Loop

```bash
WAVE=1
while true; do
  READY=$(bd ready --json | jq -r '.[].id')
  [ -z "$READY" ] && break

  echo "=== Wave $WAVE: $(echo "$READY" | wc -l) issues ==="

  # Spawn all ready issues
  for ISSUE in $READY; do
    spawn_worker "$ISSUE"
  done

  # Monitor until wave complete
  monitor_wave "$READY"

  # Merge wave results
  merge_wave "$READY"

  WAVE=$((WAVE + 1))
done

# Final completion
bd sync && git push origin main
echo "Backlog complete!"
```

### Auto Mode Differences

| Aspect | Interactive | Auto |
|--------|-------------|------|
| Worker count | Ask user | All ready issues |
| Waves | One wave | Repeat until empty |
| Decisions | AskUserQuestion | Reasonable defaults |
| Context check | Manual | Auto /wipe at 75% |

### Context Recovery

If conductor hits 75% context:

```bash
# Save state
echo "$WAVE" > /tmp/bd-swarm-wave.txt

# Trigger /wipe with handoff
# Resume with: /bd-swarm --auto --resume
```

---

## Worker Expectations

Each worker will:
1. Read issue with `bd show <id>`
2. Implement feature/fix
3. Build and test
4. Run `/worker-done <issue-id>` (reviews, commits, closes issue)

---

## Skill Matching

Match skills to issue content:

| Keywords | Skill |
|----------|-------|
| terminal, xterm, pty | `/xterm-js` |
| ui, component, modal, button | `/ui-styling:ui-styling` |
| plugin, skill, agent | `/plugin-development:plugin-development` |
| debug, fix, error, bug | Debugging patterns |

---

## Notes

- Workers run in isolated worktrees (prevents conflicts)
- Monitor via tmuxplexer background window (no watcher subagent)
- User can switch to monitor window via status bar click
- Check actual pane content before nudging idle workers
