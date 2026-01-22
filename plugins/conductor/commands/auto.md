---
name: gg-auto
description: "Event-driven worker orchestration - spawns workers, delegates monitoring to background agent, handles events as they come"
---

# Auto Mode - Event-Driven Orchestration

Orchestrate parallel workers using MCP tools for direct control. You spawn terminals, send prompts, and monitor - staying free to help the user between events.

## Philosophy

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONDUCTOR (You)                               │
│  Direct control: spawn, prompt, monitor, announce               │
│  → MCP calls are instant (~100ms)                               │
│  → If spawning fails, retry immediately                         │
└─────────────────────────────────────────────────────────────────┘
         │                                    │
         ▼                                    ▼
┌─────────────────────┐           ┌─────────────────────┐
│   HAIKU SUBAGENTS   │           │      WORKERS        │
│  (context only)     │           │  (spawned Claudes)  │
├─────────────────────┤           ├─────────────────────┤
│ • Find relevant files│          │ • Work on issues    │
│ • Analyze codebase  │           │ • Run tests         │
│ • Gather context    │           │ • Commit & close    │
└─────────────────────┘           └─────────────────────┘
```

**You spawn directly** - haiku is only for context gathering.

---

## Step 1: Pre-flight Checks

```python
# Verify TabzChrome is running
terminals = tabz_list_terminals(state="all")
```

```bash
# Start beads daemon
bd daemon status >/dev/null 2>&1 || bd daemon start

# Launch tmuxplexer monitor (shows all workers + context %)
MONITOR_SCRIPT=$(find ~/plugins ~/.claude/plugins ~/projects/TabzChrome/plugins -name "monitor-workers.sh" 2>/dev/null | head -1)
[ -n "$MONITOR_SCRIPT" ] && "$MONITOR_SCRIPT" --spawn
```

The tmuxplexer monitor shows:
- All Claude sessions with their context %
- Current tool/status (working, idle, awaiting input)
- Visual indicator when workers need attention

## Step 2: Get Current State

```python
# Get ready issues via MCP
ready_issues = mcp__beads__ready()

# Get in-progress to check for existing workers
in_progress = mcp__beads__list(status="in_progress")

# List current workers
workers = tabz_list_terminals(state="active", response_format="json")
```

```bash
# Show ready work
bd ready --json | jq -r '.[] | "\(.id): \(.title)"'
```

## Step 3: Gather Context (Haiku, Parallel) - Optional

For complex issues, use haiku to gather context before spawning:

```python
# For each issue, gather context in parallel
for issue in ready_issues[:3]:
    Task(
        subagent_type="general-purpose",
        model="haiku",
        prompt=f"""Analyze issue {issue['id']} and gather context:

1. Read the issue: bd show {issue['id']}
2. Find relevant files that will need changes
3. Check for related tests
4. Note any dependencies or gotchas

Output a brief context summary (FILES, TESTS, NOTES).""",
        description=f"Context for {issue['id']}"
    )
```

## Step 4: Create Worktrees

Create worktrees for each issue (you do this directly - it's fast):

```bash
ISSUE_ID="bd-abc"
PROJECT_DIR=$(pwd)

# Create worktree with beads redirect
bd worktree create ".worktrees/$ISSUE_ID" --branch "feature/$ISSUE_ID"

# Init deps (optional - can overlap with Claude boot)
INIT_SCRIPT=$(find ~/plugins ~/.claude/plugins -name "init-worktree.sh" -path "*spawner*" 2>/dev/null | head -1)
[ -n "$INIT_SCRIPT" ] && $INIT_SCRIPT ".worktrees/$ISSUE_ID" &
```

**Note:** `bd worktree create` (not `git worktree add`) creates the `.beads/redirect` file that MCP tools need.

## Step 5: Spawn Workers (You Do This - Direct MCP)

```python
import time

PROJECT_DIR = "/path/to/project"  # Set to actual project path

for issue in ready_issues[:3]:
    issue_id = issue['id']
    title = issue.get('title', 'the task')

    # 1. Spawn terminal directly
    tabz_spawn_profile(
        profileId="claudula",  # Vanilla Claude profile
        workingDir=f"{PROJECT_DIR}/.worktrees/{issue_id}",
        name=issue_id,
        env={"BEADS_WORKING_DIR": PROJECT_DIR}
    )

    # 2. Wait for Claude boot
    time.sleep(8)

    # 3. Send prompt
    prompt = f"bd show {issue_id}"
    tabz_send_keys(terminal=issue_id, text=prompt)

    # 4. Claim issue and announce
    mcp__beads__update(issue_id=issue_id, status="in_progress")
    tabz_speak(text=f"{issue_id} spawned")
```

## Step 6: Start Background Watcher

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

## Step 7: Handle Watcher Events

When the background watcher returns, it will report one of:

| Event Type | Action |
|------------|--------|
| `completed` | Run cleanup: `/cleanup:done ISSUE-ID` |
| `critical` | Notify user - worker at high context |
| `asking` | Notify user - worker needs input |
| `stale` | Check if worker is stuck |
| `timeout` | Just a check-in, spawn new watcher |

After handling:
1. Check if more ready issues exist
2. Spawn workers to fill slots
3. Spawn a new watcher
4. Return to being available

## Step 8: Wave Complete

When watcher reports no workers and no ready issues:

```bash
bd sync
git push
```

```python
tabz_speak(text="Wave complete!")
```

---

## Monitoring Workers

### Via Tmuxplexer (Recommended)

Tmuxplexer shows all workers at a glance with context % and status:

```bash
MONITOR_SCRIPT=$(find ~/plugins ~/.claude/plugins ~/projects/TabzChrome/plugins -name "monitor-workers.sh" 2>/dev/null | head -1)

# Get summary: WORKERS:3 WORKING:2 IDLE:0 AWAITING:1 ASKING:0 STALE:0
"$MONITOR_SCRIPT" --summary

# Get detailed status for each worker
"$MONITOR_SCRIPT" --status
# Output: ctt-bd-abc|tool_use|45
#         ctt-bd-def|awaiting_input|62
#         ctt-bd-ghi|stale|78

# Check if specific issue is closed
"$MONITOR_SCRIPT" --check-issue bd-abc
```

| Status | Meaning |
|--------|---------|
| `tool_use` | Actively running tools |
| `processing` | Thinking |
| `awaiting_input` | Waiting at prompt |
| `asking_user` | Used AskUserQuestion - needs your attention! |
| `stale` | No activity for a while |
| `idle` | At prompt, not doing anything |

### Via MCP (Direct)

```python
workers = tabz_list_terminals(state="active", response_format="json")

for w in workers['terminals']:
    if w['name'].startswith(('bd-', 'BD-', 'TabzChrome-', 'V4V-')):
        output = tabz_capture_terminal(terminal=w['name'], lines=30)

        if "bd close" in output or "Issue closed" in output:
            print(f"✓ {w['name']} appears complete")
        elif "error" in output.lower():
            print(f"⚠ {w['name']} may have issues")
            tabz_send_keys(terminal=w['name'], text="Status check - need any help?")
```

---

## Quick Reference

| Action | How |
|--------|-----|
| Get ready work | `mcp__beads__ready()` |
| List workers | `tabz_list_terminals(state="active")` |
| Spawn worker | `tabz_spawn_profile(profileId, workingDir, name, env)` |
| Send prompt | `tabz_send_keys(terminal, text)` - 600ms delay built-in |
| Check output | `tabz_capture_terminal(terminal, lines)` |
| Announce | `tabz_speak(text)` |
| Claim issue | `mcp__beads__update(issue_id, status="in_progress")` |
| Start watcher | `Task(subagent_type="conductor:worker-watcher", run_in_background=True)` |
| Launch tmuxplexer | `monitor-workers.sh --spawn` |
| Worker summary | `monitor-workers.sh --summary` |
| Check your context | `monitor-workers.sh --self` |

## Self-Monitoring

**Check your context % every poll cycle** via tmuxplexer:

```bash
# Get your own context %
MONITOR_SCRIPT=$(find ~/plugins ~/.claude/plugins ~/projects/TabzChrome/plugins -name "monitor-workers.sh" 2>/dev/null | head -1)
[ -n "$MONITOR_SCRIPT" ] && "$MONITOR_SCRIPT" --self
```

Or check tmuxplexer visually - your session shows context % like `[45%]`.

**At 70%+ context, wipe immediately with handoff:**

```
/wipe:wipe

## Conductor Auto In Progress

**Wave State:** Workers are processing issues. Resume monitoring.

**Active Issues:**
- [list the in_progress issue IDs from bd list --status in_progress]

**Action Required:** Run `/conductor:auto` to continue.

Beads has full state. The workflow will:
1. Check issue statuses (some may have closed while wiping)
2. Resume polling for remaining in_progress issues
3. Merge and cleanup when done
4. Start next wave if more issues ready
```

**DO NOT wait until you run out of context.** Wipe proactively at 70%.

All state lives in beads - nothing is lost.

## Notes

- **You spawn directly** - don't delegate terminal spawning to haiku
- **Haiku gathers context** - use for file analysis, not actions
- **Watcher runs in background** - you stay free for the user
- **600ms delay in send_keys** - handles Claude prompt processing
