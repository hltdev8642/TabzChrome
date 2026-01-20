---
name: auto
description: "Autonomous worker loop - delegates to planner, prompt-writer, spawner, and cleanup plugins"
---

# Auto Mode - Autonomous Worker Loop

Lightweight orchestrator that coordinates the focused plugins to process work autonomously.

## Plugins Used

| Plugin | Command | Purpose |
|--------|---------|---------|
| planner | `/planner:plan` | Break down epics into tasks |
| prompt-writer | `/prompt-writer:write` | Prepare backlog issues with prompts |
| spawner | `/spawner:spawn` | Spawn workers for ready issues |
| cleanup | `/cleanup:done` | Merge and cleanup completed work |

## How It Works

1. **Pre-flight**: Check TabzChrome health, start beads daemon
2. **Dashboard**: Launch tmuxplexer --watcher for monitoring
3. **Prepare**: For each backlog issue without `ready` label, delegate to `/prompt-writer:write`
4. **Spawn**: For each ready issue (up to 3 parallel), delegate to `/spawner:spawn`
5. **Poll** every 30 seconds:
   - Query beads for closed issues
   - For closed issues, delegate to `/cleanup:done`
   - Spawn newly unblocked issues
6. **Done**: When no work remains, `bd sync && git push`

## Usage

```bash
/conductor:auto
```

**Max 3 workers** - workers spawn subagents, more causes resource contention.

## Orchestration Flow

### Phase 1: Pre-flight

```bash
# Check TabzChrome
curl -sf http://localhost:8129/api/health >/dev/null || { echo "TabzChrome not running"; exit 1; }

# Start beads daemon
bd daemon status >/dev/null 2>&1 || bd daemon start

# Launch dashboard
curl -s -X POST http://localhost:8129/api/spawn \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: $(cat /tmp/tabz-auth-token)" \
  -d '{"name": "Worker Dashboard", "workingDir": "~/projects/tmuxplexer", "command": "./tmuxplexer --watcher"}'
```

### Phase 2: Prepare Backlog

For each issue in backlog status without `ready` label:

```bash
# Use Task tool to spawn prompt-writer agent
Task(subagent_type="prompt-writer:writer", model="haiku", prompt="/prompt-writer:write ISSUE-ID")
```

Or via command:
```bash
claude -p "/prompt-writer:write ISSUE-ID"
```

### Phase 3: Spawn Workers

For each issue with `ready` label (up to MAX_WORKERS):

```bash
# Use Task tool to spawn worker
Task(subagent_type="spawner", prompt="/spawner:spawn ISSUE-ID")
```

Or directly:
```bash
claude -p "/spawner:spawn ISSUE-ID"
```

### Phase 4: Poll and Cleanup

Every 30 seconds:

```bash
# Get closed issues with active workers
CLOSED=$(bd list --status closed --label in_progress --json | jq -r '.[].id')

for ISSUE_ID in $CLOSED; do
  # Delegate cleanup
  claude -p "/cleanup:done $ISSUE_ID"
done

# Check for newly ready issues and spawn more workers
```

### Phase 5: Complete

When no active workers and no ready tasks:

```bash
bd sync
git push
echo "All work complete!"
```

## Implementation Notes

The conductor now delegates all heavy work:

| Task | Delegated To |
|------|--------------|
| Write prompts | `/prompt-writer:write` (Haiku) |
| Spawn terminals | `/spawner:spawn` (Haiku) |
| Merge/cleanup | `/cleanup:done` (Haiku) |
| Planning | `/planner:plan` (Sonnet) |

This keeps conductor lightweight and focused on coordination.

## Worker Workflow

Workers follow PRIME.md instructions (injected via beads hook):

1. Read issue context with `bd show` or MCP tools
2. Claim the issue (status = in_progress)
3. Do the work
4. Commit changes with issue ID in message
5. Add retro notes
6. Close the issue
7. Run `bd sync` and push branch

The conductor detects closed status via polling and delegates cleanup.

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| MAX_WORKERS | 3 | Maximum parallel workers |
| POLL_INTERVAL | 30s | How often to check status |

## Related Plugins

| Plugin | Purpose |
|--------|---------|
| `/prompt-writer` | Craft worker prompts from backlog issues |
| `/planner` | Break down features into tasks |
| `/spawner` | Spawn workers in worktrees |
| `/cleanup` | Merge and cleanup after completion |

## Notes

- Conductor is now a lightweight orchestrator
- All heavy work delegated to focused plugins
- Each plugin can use optimal model (Haiku for mechanical, Sonnet for reasoning)
- Workers follow PRIME.md - MCP tools and `bd sync` work in worktrees
