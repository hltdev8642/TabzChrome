---
description: "Pick the top ready beads issue and start working on it"
---

# Beads Work - Start on Top Ready Issue

Pick the highest priority ready issue from beads and begin working on it.

## Workflow

1. **Get ready issues**:
```bash
bd ready --json
```

2. **Select the top priority issue** (lowest P number = highest priority)

3. **Show the issue details**:
```bash
bd show <issue-id>
```

4. **Claim it**:
```bash
bd update <issue-id> --status in_progress
```

5. **Start working** on the issue based on its description

6. **When complete**, close it:
```bash
bd close <issue-id> --reason "Completed: <brief summary>"
```

## Notes

- If user provided an issue ID as argument, use that instead of picking top
- Always show the issue details before starting work
- Commit changes with issue ID in commit message
- Push and sync beads when done: `bd sync && git push`

Execute this workflow now.
