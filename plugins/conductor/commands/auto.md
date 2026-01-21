---
name: gg-auto
description: "Event-driven worker orchestration - spawns workers, delegates monitoring to background agent, handles events as they come"
context:
  skills:
    - spawner:terminals           # TabzChrome API patterns
---

# Auto Mode - Event-Driven Orchestration

Orchestrate parallel workers using background monitoring. You stay free to work with the user while a haiku watcher monitors in the background.

## How It Works

```
1. Spawn workers for ready issues
2. Kick off background watcher (haiku)
3. You're FREE - help user plan, groom backlog, answer questions
4. When watcher returns with event → handle it → spawn new watcher
5. Repeat until all work done
```

**Key difference from old approach**: You don't poll. You delegate monitoring to a cheap background agent and stay available.

---

## Step 1: Pre-flight

```bash
# Check TabzChrome
curl -sf http://localhost:8129/api/health >/dev/null || { echo "TabzChrome not running"; exit 1; }

# Start beads daemon
bd daemon status >/dev/null 2>&1 || bd daemon start

# Clear old events
rm -f /tmp/worker-events.jsonl /tmp/worker-status.json

# Ensure tmuxplexer monitor is running
MONITOR_SCRIPT=$(find ~/plugins ~/.claude/plugins ~/projects/TabzChrome/plugins -name "monitor-workers.sh" 2>/dev/null | head -1)
[ -n "$MONITOR_SCRIPT" ] && "$MONITOR_SCRIPT" --spawn
```

## Step 2: Check Current State

```bash
# Current workers
curl -sf http://localhost:8129/api/agents | jq '[.data[] | {name, id}]'

# Ready issues
bd ready --json | jq -r '.[] | "\(.id): \(.title)"'

# In progress
bd list --status in_progress --json | jq -r '.[] | "\(.id): \(.title)"'
```

## Step 3: Spawn Workers

For each ready issue (up to 3 workers total):

```python
Task(
    subagent_type="general-purpose",
    model="haiku",
    prompt="/spawner:spawn ISSUE-ID",
    description="Spawn ISSUE-ID"
)
```

**Spawn in parallel** - multiple Task calls in one message.

## Step 4: Start Background Watcher

After spawning, kick off the watcher:

```python
Task(
    subagent_type="conductor:worker-watcher",
    prompt="Monitor workers. Return when: issue closes, critical alert (context >=75%), worker asking for input, or after 20 polls (~10 min).",
    description="Watch workers",
    run_in_background=True
)
```

**Now you're free.** Help the user with planning, grooming, or other tasks.

## Step 5: Handle Watcher Events

When the background watcher returns, it will report one of:

| Event Type | Action |
|------------|--------|
| `completed` | Run cleanup: `Task(prompt="/cleanup:done ISSUE-ID")` |
| `critical` | Notify user - worker at high context |
| `asking` | Notify user - worker needs input |
| `stale` | Check if worker is stuck |
| `timeout` | Just a check-in, spawn new watcher |

After handling the event:
1. Check if more ready issues exist
2. Spawn workers to fill slots
3. Spawn a new watcher
4. Return to being available

## Step 6: Wave Complete

When watcher reports no workers and no ready issues:

```bash
# Final sync
bd sync
git push

echo "Wave complete!"
```

---

## Example Flow

```
User: "Let's run gg-auto"
Conductor: [Pre-flight checks pass]
Conductor: [Spawns 3 workers: bd-001, bd-002, bd-003]
Conductor: [Kicks off background watcher]
Conductor: "Workers spawned and watcher running. What would you like to work on?"

User: "Let's plan the next feature - dark mode"
Conductor: [Helps plan dark mode, creates issues, etc.]

[Background watcher returns]: "completed: bd-001 closed"
Conductor: "bd-001 finished! Running cleanup..."
Conductor: [Spawns cleanup task]
Conductor: [Checks for more ready work, spawns bd-004]
Conductor: [Spawns new watcher]
Conductor: "Cleaned up bd-001, spawned bd-004. Back to dark mode planning?"

User: "Yes, what about the toggle component?"
[Conversation continues naturally...]
```

---

## Quick Commands

| Action | How |
|--------|-----|
| Spawn worker | `Task(subagent_type="general-purpose", model="haiku", prompt="/spawner:spawn ID")` |
| Cleanup | `Task(subagent_type="general-purpose", model="haiku", prompt="/cleanup:done ID")` |
| Start watcher | `Task(subagent_type="conductor:worker-watcher", ..., run_in_background=True)` |
| Manual status | `jq . /tmp/worker-status.json` |
| Check own context | `$MONITOR_SCRIPT --self` |

## Self-Monitoring

If your own context gets high (≥70%), you can safely:
1. Tell the user "I need to restart to free up context"
2. Run `/wipe:wipe`
3. Resume with `/conductor:auto`

All state lives in beads and the watcher - nothing is lost.

## Notes

- Watcher is cheap (haiku) and disposable
- You stay present for the user instead of busy-looping
- Events come to you - you don't poll for them
- Multiple watchers can run if needed (they're independent)
