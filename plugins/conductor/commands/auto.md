---
name: gg-auto
description: "Event-driven worker orchestration - spawns workers, delegates monitoring to background agent, handles events as they come"
context:
  skills:
    - tabz:terminals              # tmux send-keys, TabzChrome API patterns
    - spawner:terminals           # Worktree setup, init scripts
---

# Auto Mode - Event-Driven Orchestration

Orchestrate parallel workers using background monitoring. You stay free to work with the user while a haiku watcher monitors in the background.

## How It Works

```
1. Activate /tabz:terminals skill (for tmux patterns)
2. Use haiku to initialize worktrees (parallel)
3. YOU spawn terminals and send prompts (reliable)
4. Kick off background watcher (haiku)
5. You're FREE - help user plan, groom backlog, answer questions
6. When watcher returns with event → handle it → spawn new watcher
7. Repeat until all work done
```

**Key insight**: Haiku is good for parallel init work, but YOU (conductor) should spawn terminals and send prompts - you can recover if something fails.

---

## Step 1: Pre-flight & Load Skills

**First, activate the terminals skill:**
```python
Skill(skill="tabz:terminals")  # Loads tmux send-keys patterns
```

**Then run pre-flight checks:**
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

## Step 3: Initialize Worktrees (Haiku, Parallel)

Use haiku agents to create worktrees and install deps in parallel:

```python
# For each ready issue (up to 3), run in parallel:
Task(
    subagent_type="general-purpose",
    model="haiku",
    prompt="""Initialize worktree for ISSUE-ID:
1. bd worktree create ".worktrees/ISSUE-ID" --branch "feature/ISSUE-ID"
2. Run init script: INIT_SCRIPT=$(find ~/plugins ~/.claude/plugins -name "init-worktree.sh" -path "*spawner*" 2>/dev/null | head -1); [ -n "$INIT_SCRIPT" ] && $INIT_SCRIPT ".worktrees/ISSUE-ID"
3. Report success or failure""",
    description="Init ISSUE-ID worktree"
)
```

**Run these in parallel** - multiple Task calls in one message.

## Step 4: Spawn Terminals & Send Prompts (YOU do this)

After haiku finishes init, YOU spawn the terminals and send prompts.
This ensures reliability - if a prompt fails, you can retry.

```bash
ISSUE_ID="ISSUE-ID"
WORKDIR=$(pwd)
TOKEN=$(cat /tmp/tabz-auth-token)

# Spawn terminal
curl -s -X POST http://localhost:8129/api/spawn \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: $TOKEN" \
  -d "{
    \"name\": \"$ISSUE_ID\",
    \"workingDir\": \"$WORKDIR/.worktrees/$ISSUE_ID\",
    \"command\": \"BEADS_WORKING_DIR=$WORKDIR claude\"
  }"

# Wait for Claude to boot
sleep 8

# Get session ID
SESSION=$(curl -s http://localhost:8129/api/agents | jq -r --arg id "$ISSUE_ID" '.data[] | select(.name == $id) | .id')

# Build pep-talk prompt
TITLE=$(bd show "$ISSUE_ID" --json | jq -r '.[0].title // "the task"')
PROMPT="You've got $ISSUE_ID - $TITLE.

Check \`bd show $ISSUE_ID\` for details and notes, then make it happen!

When done: commit, bd close $ISSUE_ID --reason 'summary', push your branch."

# Send prompt via tmux (from /tabz:terminals skill)
tmux send-keys -t "$SESSION" -l "$PROMPT"
sleep 0.5
tmux send-keys -t "$SESSION" Enter

# Mark in progress
bd update "$ISSUE_ID" --status in_progress
```

**Spawn terminals sequentially** - wait for each to boot before sending prompt.

## Step 5: Start Background Watcher

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

## Step 6: Handle Watcher Events

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

## Step 7: Wave Complete

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
Conductor: [Activates /tabz:terminals skill]
Conductor: [Pre-flight checks pass]
Conductor: [Spawns 3 haiku agents to init worktrees in parallel]
Conductor: [Waits for inits to complete]
Conductor: [Spawns terminals and sends prompts directly]
Conductor: [Kicks off background watcher]
Conductor: "Workers spawned and watcher running. What would you like to work on?"

User: "Let's plan the next feature - dark mode"
Conductor: [Helps plan dark mode, creates issues, etc.]

[Background watcher returns]: "completed: bd-001 closed"
Conductor: "bd-001 finished! Running cleanup..."
Conductor: [Spawns cleanup task]
Conductor: [Checks for more ready work, inits bd-004 worktree, spawns terminal]
Conductor: [Spawns new watcher]
Conductor: "Cleaned up bd-001, spawned bd-004. Back to dark mode planning?"

User: "Yes, what about the toggle component?"
[Conversation continues naturally...]
```

---

## Quick Commands

| Action | How |
|--------|-----|
| Load terminal patterns | `Skill(skill="tabz:terminals")` |
| Init worktree (haiku) | `Task(model="haiku", prompt="bd worktree create .worktrees/ID ...")` |
| Spawn terminal (YOU) | `curl -X POST http://localhost:8129/api/spawn ...` |
| Send prompt (YOU) | `tmux send-keys -t "$SESSION" -l "$PROMPT"; tmux send-keys -t "$SESSION" Enter` |
| Cleanup | `Task(subagent_type="general-purpose", model="haiku", prompt="/cleanup:done ID")` |
| Start watcher | `Task(subagent_type="conductor:worker-watcher", ..., run_in_background=True)` |
| Manual status | `jq . /tmp/worker-status.json` |

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
