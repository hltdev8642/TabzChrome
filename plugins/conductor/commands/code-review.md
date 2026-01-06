---
description: "Run Opus code review with auto-fix capability. Uses conductor:code-reviewer agent."
---

# Code Review (Opus)

Run a thorough code review using the Opus-powered code-reviewer agent. Auto-fixes when confident, flags blockers otherwise.

## Usage

```
/conductor:code-review
/conductor:code-review <issue-id>
```

## When to Use

- Before committing significant changes
- For thorough security and quality review
- When you want auto-fixes applied

**For cheaper/faster review:** Use `/conductor:codex-review` instead.

## Execute

Spawn the code-reviewer subagent:

```markdown
Task(
  subagent_type="conductor:code-reviewer",
  prompt="Review uncommitted changes in $(pwd). Issue: ${ISSUE_ID:-unknown}. Return JSON with passed/blockers."
)
```

## Agent Capabilities

The code-reviewer agent will:

| Action | When |
|--------|------|
| Auto-fix | Confidence >= 90% (unused imports, console.log, etc.) |
| Flag | Confidence 70-89% (potential issues, suggestions) |
| Block | Critical security/bugs that must be fixed |
| Skip | Confidence < 70% (likely false positive) |

## Review Checklist

The agent checks:
- Bug detection (null access, race conditions, memory leaks)
- Security vulnerabilities (XSS, injection, exposed secrets)
- Project conventions (from CLAUDE.md)
- Code quality (duplicates, large functions, unused code)

## Output Format

The agent returns JSON:

```json
{
  "passed": true,
  "summary": "2 auto-fixes, no blockers",
  "auto_fixed": [
    {"file": "src/utils.ts", "line": 45, "issue": "Unused import", "fix": "Removed"}
  ],
  "flagged": [
    {"severity": "important", "file": "src/api.ts", "line": 23, "issue": "Missing error handling"}
  ],
  "blockers": []
}
```

## Error Handling

If `passed: false`:
1. Fix the blockers listed
2. Re-run `/conductor:code-review`

## Composable With

- `/conductor:verify-build` - Run build before review
- `/conductor:run-tests` - Run tests before review
- `/conductor:commit-changes` - Run after review passes
- `/conductor:worker-done` - Full pipeline that includes this
