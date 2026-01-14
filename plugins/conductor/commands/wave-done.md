---
description: "Complete a wave of parallel workers: verify completion, merge branches, unified review, cleanup, push. Run after all workers finish."
---

# Wave Done - Wave Completion Orchestrator

Orchestrates the completion of a wave of parallel workers spawned by bd-swarm. Handles merge, review, cleanup, and push.

## Usage

```bash
# Complete a wave with specific issues
/conductor:wave-done TabzChrome-abc TabzChrome-def TabzChrome-ghi

# Or use environment variable set by bd-swarm
/conductor:wave-done $WAVE_ISSUES
```

---

## Pipeline Overview

| Step | Description | Blocking? |
|------|-------------|-----------|
| 1 | Verify all workers completed | Yes - all issues must be closed |
| 1.5 | Review worker discoveries | No - check for untracked TODOs |
| 2 | Capture transcripts and kill sessions | No |
| 3 | Merge branches to main | Yes - stop on conflicts |
| 4 | Build verification | Yes |
| 5 | Unified code review | Yes |
| 6 | Cleanup worktrees and branches | No |
| 7 | Visual QA (if UI changes) | Optional |
| 8 | Sync and push | Yes |
| 9 | Audio summary | No |

**Why unified review at wave level:** Workers do NOT run code review (to avoid conflicts when running in parallel). The conductor does the sole code review after merge, catching cross-worker interactions.

---

## Execute Pipeline

### Step 1: Verify All Workers Completed

```bash
echo "=== Step 1: Verify Worker Completion ==="

ISSUES="$@"  # From command args
ALL_CLOSED=true

for ISSUE in $ISSUES; do
  STATUS=$(bd show "$ISSUE" --json 2>/dev/null | jq -r '.[0].status // "unknown"')
  if [ "$STATUS" != "closed" ]; then
    echo "BLOCKED: $ISSUE is $STATUS (not closed)"
    ALL_CLOSED=false
  else
    echo "OK: $ISSUE is closed"
  fi
done

if [ "$ALL_CLOSED" != "true" ]; then
  echo "ERROR: Not all issues are closed. Wait for workers to finish."
  exit 1
fi
```

If any issue is not closed -> **STOP**. Wait for workers to complete.

---

### Step 2: Capture Transcripts and Kill Sessions

**IMPORTANT:** Capture transcripts BEFORE killing sessions to preserve worker output for analysis.

```bash
echo "=== Step 2: Capture Transcripts and Kill Sessions ==="

CAPTURE_SCRIPT="${CLAUDE_PLUGIN_ROOT:-./plugins/conductor}/scripts/capture-session.sh"

# Helper function to capture then kill
capture_and_kill() {
  local SESSION="$1"
  local ISSUE="$2"

  # Capture transcript BEFORE killing (preserves token usage, tool calls, etc.)
  if [ -x "$CAPTURE_SCRIPT" ]; then
    "$CAPTURE_SCRIPT" "$SESSION" "$ISSUE" 2>/dev/null || echo "Warning: Could not capture $SESSION"
  fi

  # Now kill session
  tmux kill-session -t "$SESSION" 2>/dev/null && echo "Killed: $SESSION"
}

for ISSUE in $ISSUES; do
  # Try worker-ISSUE format
  if tmux has-session -t "worker-${ISSUE}" 2>/dev/null; then
    capture_and_kill "worker-${ISSUE}" "$ISSUE"
  fi

  # Try ctt-worker-* format (TabzChrome spawned terminals)
  SHORT_ID="${ISSUE##*-}"
  tmux list-sessions -F '#{session_name}' 2>/dev/null | grep -E "ctt-worker.*${SHORT_ID}" | while read -r S; do
    capture_and_kill "$S" "$ISSUE"
  done || true
done

echo "Transcripts saved to .beads/transcripts/"
```

Use `/conductor:analyze-transcripts` after wave-done to review worker performance.

---

### Step 3: Merge Branches to Main

```bash
echo "=== Step 3: Merge Branches ==="

git checkout main

for ISSUE in $ISSUES; do
  BRANCH="feature/${ISSUE}"
  if git merge --no-edit "$BRANCH" 2>/dev/null; then
    echo "Merged: $BRANCH"
  else
    echo "CONFLICT: $BRANCH"
    git merge --abort 2>/dev/null || true
    echo "ERROR: Resolve conflicts manually, then re-run wave-done."
    exit 1
  fi
done
```

If merge conflicts -> **STOP**. Resolve manually and re-run.

---

### Step 4: Build Verification

Run `/conductor:verify-build`. If failed -> **STOP**, fix errors, re-run.

---

### Step 5: Unified Code Review

Run `/conductor:code-review`. This reviews all merged changes together.

If blockers found -> **STOP**, fix issues, re-run.

---

### Step 6: Cleanup Worktrees and Branches

```bash
echo "=== Step 6: Cleanup ==="

PROJECT_DIR=$(pwd)
WORKTREE_DIR="${PROJECT_DIR}-worktrees"

for ISSUE in $ISSUES; do
  # Remove worktree
  if [ -d "${WORKTREE_DIR}/${ISSUE}" ]; then
    git worktree remove --force "${WORKTREE_DIR}/${ISSUE}" 2>/dev/null || true
    echo "Removed worktree: ${ISSUE}"
  fi

  # Delete feature branch
  git branch -d "feature/${ISSUE}" 2>/dev/null && echo "Deleted branch: feature/${ISSUE}" || true
done

rmdir "$WORKTREE_DIR" 2>/dev/null || true
```

---

### Step 7: Visual QA (Optional)

If UI changes were in the wave, spawn tabz-manager for visual verification:

```markdown
Task(subagent_type="conductor:tabz-manager",
     prompt="Visual QA after wave merge. Screenshot key UI areas and check for errors.")
```

Skip if wave was backend/config only.

---

### Step 8: Sync and Push

```bash
echo "=== Step 8: Sync and Push ==="

bd sync
git push origin main

echo "Pushed to main"
```

---

### Step 9: Summary

Announce completion:
- Issues completed
- Branches merged
- Next ready issues (if any)

---

## Error Handling

| Step | On Failure | Recovery |
|------|------------|----------|
| Worker verification | Show which not closed | Wait for workers |
| Merge | Show conflicts | Resolve manually, re-run |
| Build | Show errors | Fix, re-run |
| Review | Show blockers | Fix, re-run |
| Push | Show git errors | Manual push |

---

## Next Wave

After wave-done completes:

```bash
NEXT_COUNT=$(bd ready --json | jq 'length')
if [ "$NEXT_COUNT" -gt 0 ]; then
  echo "$NEXT_COUNT issues ready for next wave"
fi
```

For fully autonomous operation, use `/conductor:bd-swarm-auto` which loops waves automatically.
