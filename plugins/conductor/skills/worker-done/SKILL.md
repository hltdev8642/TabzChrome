---
name: worker-done
description: "Complete worker task: verify build, run code review, commit, and close issue. Invoke with /worker-done <issue-id>"
---

# Worker Done - Task Completion Pipeline

Run this when you've finished implementing a feature/fix and are ready to complete your task.

## Usage

```
/worker-done TabzChrome-abc
```

Or if issue ID is in your task header, just:
```
/worker-done
```

## Pipeline Steps

Execute these steps in order. Stop if any step fails.

### Step 1: Verify Build

```bash
echo "=== Step 1: Build Verification ==="
npm run build 2>&1 | tee /tmp/build-output.txt
BUILD_EXIT=$?

if [ $BUILD_EXIT -ne 0 ]; then
  echo "BUILD FAILED - fix errors before continuing"
  tail -30 /tmp/build-output.txt
  exit 1
fi
echo "Build passed"
```

### Step 2: Run Tests (if available)

```bash
echo "=== Step 2: Test Verification ==="
if grep -q '"test"' package.json 2>/dev/null; then
  npm test 2>&1 | tee /tmp/test-output.txt
  TEST_EXIT=$?

  if [ $TEST_EXIT -ne 0 ]; then
    echo "TESTS FAILED - fix failing tests before continuing"
    exit 1
  fi
  echo "Tests passed"
else
  echo "No test script found, skipping"
fi
```

### Step 3: Code Review

Spawn the code-reviewer subagent:

```
Task tool:
  subagent_type: "conductor:code-reviewer"
  prompt: |
    Review uncommitted changes in $(pwd) for issue $ISSUE_ID.
    Return JSON with passed: true/false.
```

**Handle result:**
- If `passed: false` → Stop pipeline, fix the blockers listed
- If `passed: true` → Continue to commit

### Step 4: Commit Changes

```bash
echo "=== Step 4: Commit ==="
git add .
git status --short

# Commit with conventional format
git commit -m "feat($SCOPE): $DESCRIPTION

Implements $ISSUE_ID

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <co-author>"
```

### Step 5: Close Issue

```bash
echo "=== Step 5: Close Issue ==="
bd close $ISSUE_ID --reason "Implemented: $SUMMARY"
```

### Step 6: Notify Completion

```bash
echo "=== Task Complete ==="
echo "Issue $ISSUE_ID closed"
echo "Branch ready for merge: feature/$ISSUE_ID"
```

## Error Handling

| Step | On Failure |
|------|------------|
| Build | Show errors, stop pipeline |
| Tests | Show failures, stop pipeline |
| Review | Show blockers, stop pipeline (fix and re-run `/worker-done`) |
| Commit | Show git errors |
| Close | Show beads errors |

## Re-running After Fixes

If the pipeline stopped due to build/test/review failure:

1. Fix the issues
2. Run `/worker-done` again

The pipeline is idempotent - safe to re-run.

## Customizing the Pipeline

To skip steps, use flags (future enhancement):
- `/worker-done --skip-tests` - Skip test step
- `/worker-done --skip-review` - Skip code review (not recommended)

## Example Session

```
> /worker-done TabzChrome-hyo

=== Step 1: Build Verification ===
✓ Build passed

=== Step 2: Test Verification ===
✓ Tests passed (42 tests)

=== Step 3: Code Review ===
Spawning code-reviewer subagent...
Review result: { passed: true, summary: "No issues found" }

=== Step 4: Commit ===
[feature/TabzChrome-hyo abc1234] feat(sidebar): show bookmarked profiles
 2 files changed, 150 insertions(+)

=== Step 5: Close Issue ===
✓ Closed TabzChrome-hyo

=== Task Complete ===
Issue TabzChrome-hyo closed
Branch ready for merge: feature/TabzChrome-hyo
```

Execute this pipeline now.
