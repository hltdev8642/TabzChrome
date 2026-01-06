---
name: worker-done
description: "Complete worker task: verify build, run code review, commit, and close issue. Invoke with /conductor:worker-done <issue-id>"
---

# Worker Done - Task Completion Orchestrator

Orchestrates the full task completion pipeline by composing atomic commands.

## Usage

```
/conductor:worker-done TabzChrome-abc
```

Or if issue ID is in your task header, just:
```
/conductor:worker-done
```

## Pipeline Overview

This orchestrator runs these atomic commands in sequence:

| Step | Command | Blocking? |
|------|---------|-----------|
| 1 | `/conductor:verify-build` | Yes - stop on failure |
| 2 | `/conductor:run-tests` | Yes - stop on failure |
| 3 | `/conductor:code-review` | Yes - stop on failure |
| 4 | `/conductor:commit-changes` | Yes - stop on failure |
| 5 | `/conductor:create-followups` | No - log and continue |
| 6 | `/conductor:update-docs` | No - log and continue |
| 7 | `/conductor:close-issue` | Yes - report result |

## Execute Pipeline

### Step 1: Verify Build

```bash
echo "=== Step 1: Build Verification ==="
```

Run `/conductor:verify-build` and check result:
- If `passed: false` → **STOP** - fix errors and re-run `/conductor:worker-done`
- If `passed: true` → Continue

### Step 2: Run Tests

```bash
echo "=== Step 2: Test Verification ==="
```

Run `/conductor:run-tests` and check result:
- If `passed: false` → **STOP** - fix tests and re-run `/conductor:worker-done`
- If `passed: true` or `skipped: true` → Continue

### Step 3: Code Review

```bash
echo "=== Step 3: Code Review ==="
```

Run `/conductor:code-review` (spawns code-reviewer subagent):
- If `passed: false` → **STOP** - fix blockers and re-run `/conductor:worker-done`
- If `passed: true` → Continue

**Alternative:** Use `/conductor:codex-review` for faster, cheaper review.

### Step 4: Commit Changes

```bash
echo "=== Step 4: Commit ==="
```

Run `/conductor:commit-changes <issue-id>`:
- Stages all changes
- Creates conventional commit with Claude signature
- If `committed: false` → **STOP** - investigate
- If `committed: true` → Continue

### Step 5: Create Follow-ups (Non-blocking)

```bash
echo "=== Step 5: Follow-up Tasks ==="
```

Run `/conductor:create-followups <issue-id>`:
- Creates follow-up issues for discovered work
- Non-blocking - log result and continue even if no follow-ups

### Step 6: Update Documentation (Non-blocking)

```bash
echo "=== Step 6: Documentation Check ==="
```

Run `/conductor:update-docs`:
- Updates CLAUDE.md or docs/ if needed
- Non-blocking - log result and continue

### Step 7: Close Issue

```bash
echo "=== Step 7: Close Issue ==="
```

Run `/conductor:close-issue <issue-id>`:
- Closes the beads issue with completion summary
- Reports final status

### Step 8: Summary

```bash
echo "=== Task Complete ==="
echo "Issue $ISSUE_ID closed"
echo "Branch ready for merge: $(git branch --show-current)"
echo ""
echo "Follow-up tasks: [list or 'none']"
echo "Documentation: [updated files or 'none']"
```

## Atomic Commands Reference

Each step can be run standalone:

| Command | Description |
|---------|-------------|
| `/conductor:verify-build` | Run build, report errors |
| `/conductor:run-tests` | Run tests if available |
| `/conductor:code-review` | Opus review with auto-fix |
| `/conductor:codex-review` | Codex review (read-only, cheaper) |
| `/conductor:commit-changes` | Stage + commit with conventional format |
| `/conductor:create-followups` | Create follow-up beads issues |
| `/conductor:update-docs` | Check/update documentation |
| `/conductor:close-issue` | Close beads issue |

## Custom Pipelines

Compose commands for custom workflows:

**Quick commit (skip review):**
```
/conductor:verify-build
/conductor:run-tests
/conductor:commit-changes
/conductor:close-issue <id>
```

**Review-focused (no commit):**
```
/conductor:verify-build
/conductor:run-tests
/conductor:code-review
```

**Docs-only:**
```
/conductor:update-docs
/conductor:commit-changes
```

## Error Handling

| Step | On Failure |
|------|------------|
| Build | Show errors, stop pipeline |
| Tests | Show failures, stop pipeline |
| Review | Show blockers, stop pipeline |
| Commit | Show git errors, stop pipeline |
| Follow-ups | Non-blocking - log and continue |
| Docs | Non-blocking - log and continue |
| Close | Show beads errors |

## Re-running After Fixes

If the pipeline stopped:
1. Fix the issues
2. Run `/conductor:worker-done` again

The pipeline is idempotent - safe to re-run.

## Example Sessions

### Feature Implementation

```
> /conductor:worker-done TabzChrome-hyo

=== Step 1: Build Verification ===
Build passed

=== Step 2: Test Verification ===
Tests passed (42 tests)

=== Step 3: Code Review ===
Spawning code-reviewer subagent...
Review result: { passed: true, summary: "No issues found" }

=== Step 4: Commit ===
[feature/TabzChrome-hyo abc1234] feat(sidebar): show bookmarked profiles
 2 files changed, 150 insertions(+)

=== Step 5: Follow-up Tasks ===
No follow-up tasks identified

=== Step 6: Documentation Check ===
Added to CLAUDE.md: BookmarkProfileCard component
Documentation updated

=== Step 7: Close Issue ===
Closed TabzChrome-hyo

=== Task Complete ===
Issue TabzChrome-hyo closed
Branch ready for merge: feature/TabzChrome-hyo
Follow-up tasks: none
Documentation: CLAUDE.md
```

### Research Task (creates follow-ups)

```
> /conductor:worker-done TabzChrome-abc

=== Step 1: Build Verification ===
Build passed (no code changes, research only)

=== Step 2: Test Verification ===
No test script found, skipping

=== Step 3: Code Review ===
Review result: { passed: true, summary: "Research docs look good" }

=== Step 4: Commit ===
[feature/TabzChrome-abc def5678] docs: research YouTube API integration
 1 file changed, 150 insertions(+)

=== Step 5: Follow-up Tasks ===
Created: TabzChrome-xyz "Implement YouTube search API" (P2)
Created: TabzChrome-uvw "Add YouTube player component" (P2)
Created: TabzChrome-rst "Cache YouTube API responses" (P3)

=== Step 6: Documentation Check ===
Research doc created: docs/research/youtube-api.md

=== Step 7: Close Issue ===
Closed TabzChrome-abc

=== Task Complete ===
Issue TabzChrome-abc closed
Follow-up tasks: TabzChrome-xyz, TabzChrome-uvw, TabzChrome-rst
Documentation: docs/research/youtube-api.md
```

## After Completion

When `/conductor:worker-done` succeeds:
- Issue is closed in beads
- Commit is on the feature branch
- Worker's job is done

**The conductor is responsible for:**
- Merging the feature branch to main
- Killing this worker's tmux session
- Removing the worktree
- Deleting the feature branch

Workers do NOT kill their own session - the conductor monitors for closed issues and handles cleanup.

Execute this pipeline now.
