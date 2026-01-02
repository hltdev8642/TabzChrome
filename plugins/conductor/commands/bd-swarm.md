---
description: "Spawn multiple Claude workers to tackle beads issues in parallel"
---

# Beads Swarm - Parallel Issue Processing

Spawn multiple Claude Code workers to tackle beads issues in parallel.

## Workflow

1. **Get ready issues**:
```bash
bd ready --json | jq -r '.[] | "\(.id): [\(.priority)] \(.title)"' | head -5
```

2. **Ask user how many workers** (default: 3, max: 5):
   - Use AskUserQuestion with options: 2, 3, 4, 5

3. **For each issue to assign**, spawn a worker:

```bash
TOKEN=$(cat /tmp/tabz-auth-token)

# Spawn worker for issue
curl -s -X POST http://localhost:8129/api/spawn \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: $TOKEN" \
  -d '{"name": "Claude: <issue-id>", "workingDir": "<project-dir>", "command": "claude --dangerously-skip-permissions"}'
```

4. **Wait for workers to initialize** (4 seconds each)

5. **Send task prompt to each worker** via tmux:

```bash
SESSION="ctt-claude-<issue-id>-xxxxx"
sleep 4

tmux send-keys -t "$SESSION" -l 'Work on <issue-id>: <title>

Run `bd show <issue-id>` for full details.
When done, run `bd close <issue-id> --reason "your summary"`.

Start by reading the issue and understanding what needs to be done.'
sleep 0.3
tmux send-keys -t "$SESSION" C-m
```

6. **Report what was spawned**:
```
🚀 Spawned 3 workers:
- ctt-claude-TabzChrome-79t-xxx: Profile theme inheritance
- ctt-claude-TabzChrome-6z1-xxx: Invalid working directory notification
- ctt-claude-TabzChrome-swu-xxx: File Tree keyboard navigation

Monitor with: tmux ls | grep "^ctt-"
```

7. **Optionally start watcher** to monitor progress

## Notes

- Each worker gets one issue
- Workers run independently (no dependencies between spawned issues)
- Use conductor:watcher subagent to monitor progress
- Clean up workers when done: `curl -X DELETE http://localhost:8129/api/agents/<id>`

Execute this workflow now.
