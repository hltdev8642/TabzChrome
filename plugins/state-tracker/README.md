# State Tracker Plugin

Live session state tracking for TabzChrome. Enables real-time terminal status updates and audio notifications.

## Features

- **Status tracking** - Idle, processing, tool use states
- **Tool details** - Current tool name and arguments
- **Subagent counting** - Track active Task subagents (displays as multiple robot emojis)
- **Audio notifications** - Trigger TTS announcements for status changes

## Installation

Install via Claude Code:
```
/install tabz-chrome-marketplace:state-tracker
```

## What It Tracks

| Event | State File Field |
|-------|------------------|
| Session start | `status: "idle"` |
| User prompt | `status: "processing"` |
| Tool starting | `status: "tool_use"`, `current_tool`, `details` |
| Tool complete | Updates based on result |
| Subagent spawn | `subagent_count` increments |
| Subagent stop | `subagent_count` decrements |
| Stop/idle | `status: "awaiting_input"` |

## Context Window Display

To show context window percentage on tabs, you also need a **StatusLine hook**.

See [`examples/README.md`](examples/README.md) for setup instructions.

## State File Location

State files are written to `/tmp/claude-code-state/`:
- `{pane_id}.json` - Main state file (status, tool, subagents)
- `{session_id}-context.json` - Context window data (from StatusLine hook)

## Requirements

- tmux (for pane-based session tracking)
- jq (for JSON processing)
