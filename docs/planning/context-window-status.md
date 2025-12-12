# Context Window Display Feature

## Overview

Add context window usage (token %) to terminal tab status display in TabzChrome, leveraging Claude Code's status line feature instead of hooks.

## Why Status Line Instead of Hooks

- **Subagent filtering solved automatically** - only the main agent has a status line, subagents don't
- **No additional hook complexity** - status line is separate from tool events
- **Updates frequently** - every ~300ms when messages change (we poll every ~10s, plenty fresh)
- **Session ID included** - can correlate with existing state files

## Status Line JSON Schema

Claude Code passes this JSON to the status line script via stdin:

```json
{
  "hook_event_name": "Status",
  "session_id": "abc123...",
  "transcript_path": "/path/to/transcript.json",
  "cwd": "/current/working/directory",
  "model": {
    "id": "claude-opus-4-1",
    "display_name": "Opus"
  },
  "workspace": {
    "current_dir": "/current/working/directory",
    "project_dir": "/original/project/directory"
  },
  "version": "1.0.80",
  "output_style": {
    "name": "default"
  },
  "cost": {
    "total_cost_usd": 0.01234,
    "total_duration_ms": 45000,
    "total_api_duration_ms": 2300,
    "total_lines_added": 156,
    "total_lines_removed": 23
  },
  "context_window": {
    "total_input_tokens": 15234,
    "total_output_tokens": 4521,
    "context_window_size": 200000
  }
}
```

## Implementation Plan

### 1. Create/Update Status Line Script

Create a status line script that writes context data to a file:

```bash
#!/bin/bash
input=$(cat)

SESSION_ID=$(echo "$input" | jq -r '.session_id')

# Write context info to state file for TabzChrome
echo "$input" | jq '{
  session_id,
  context_window,
  cost,
  model
}' > "/tmp/claude-code-state/${SESSION_ID}-context.json"

# Output normal status line display (customize as needed)
CONTEXT_USED=$(echo "$input" | jq -r '.context_window.total_input_tokens + .context_window.total_output_tokens')
CONTEXT_SIZE=$(echo "$input" | jq -r '.context_window.context_window_size')
PERCENT=$((CONTEXT_USED * 100 / CONTEXT_SIZE))
MODEL=$(echo "$input" | jq -r '.model.display_name')

echo "${MODEL} | ${PERCENT}%"
```

### 2. Configure Status Line in Claude Code

Either run `/statusline` in Claude Code, or add to `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/statusline.sh",
    "padding": 0
  }
}
```

### 3. Update TypeScript Interface

In `extension/hooks/useClaudeStatus.ts`, extend the interface:

```typescript
interface ClaudeStatus {
  // ... existing fields ...
  context_window?: {
    total_input_tokens: number
    total_output_tokens: number
    context_window_size: number
  }
  cost?: {
    total_cost_usd: number
    total_duration_ms: number
    total_api_duration_ms: number
    total_lines_added: number
    total_lines_removed: number
  }
}
```

### 4. Add Display Helper

```typescript
export function getContextPercent(status: ClaudeStatus): number | null {
  if (!status.context_window) return null
  const { total_input_tokens, total_output_tokens, context_window_size } = status.context_window
  return Math.round(((total_input_tokens + total_output_tokens) / context_window_size) * 100)
}

export function getContextDisplay(status: ClaudeStatus): string {
  const percent = getContextPercent(status)
  if (percent === null) return ''
  return `${percent}%`
}
```

### 5. Update Backend API

In `backend/routes/api.js`, modify the `/api/claude-status` endpoint to also check for `{session_id}-context.json` files and merge the data.

### 6. Update Tab Display

In `extension/sidepanel/sidepanel.tsx`, add context display to tab:

```tsx
// Example: 🤖⏳ Edit: file.tsx (42%)
const contextPercent = getContextPercent(status)
const contextSuffix = contextPercent !== null ? ` (${contextPercent}%)` : ''
```

## Key Files to Modify

| File | Changes |
|------|---------|
| `~/.claude/statusline.sh` | Create script to write context data |
| `~/.claude/settings.json` | Configure status line command |
| `extension/hooks/useClaudeStatus.ts` | Add interface fields, display helpers |
| `backend/routes/api.js` | Merge context files in API response |
| `extension/sidepanel/sidepanel.tsx` | Display context % in tabs |

## Notes

- Status line only exists for main agent, not subagents - this naturally filters out subagent context
- Consider showing context as a separate indicator vs cramming into tab title
- Could color-code: green (<50%), yellow (50-80%), red (>80% approaching auto-compact)
- Auto-compact happens at ~80% (160k tokens on 200k context)

## References

- Claude Code status line docs: https://code.claude.com/docs/en/statusline.md
- Feature added in Claude Code v2.0.65
