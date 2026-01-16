# State Tracker Setup for Claude Code

TabzChrome can display Claude's current state (working, idle, using tools) and trigger audio notifications. This requires installing a hook script at the user level.

## What It Does

- Updates terminal status in TabzChrome sidebar (working/idle/tool use)
- Triggers audio notifications via Chrome TTS
- Tracks subagent activity

## Installation

### 1. Copy the script

```bash
# From TabzChrome directory
mkdir -p ~/.claude/hooks/scripts
cp docs/scripts/state-tracker.sh ~/.claude/hooks/scripts/
chmod +x ~/.claude/hooks/scripts/state-tracker.sh
```

### 2. Add hooks to settings.json

Add these hooks to `~/.claude/settings.json`:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/hooks/scripts/state-tracker.sh session-start",
            "timeout": 2
          }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/hooks/scripts/state-tracker.sh user-prompt",
            "timeout": 1
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/hooks/scripts/state-tracker.sh pre-tool",
            "timeout": 1
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/hooks/scripts/state-tracker.sh post-tool",
            "timeout": 1
          }
        ]
      }
    ],
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/hooks/scripts/state-tracker.sh stop",
            "timeout": 1
          }
        ]
      }
    ],
    "SubagentStop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/hooks/scripts/state-tracker.sh subagent-stop",
            "timeout": 1
          }
        ]
      }
    ],
    "Notification": [
      {
        "matcher": "idle_prompt",
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/hooks/scripts/state-tracker.sh notification",
            "timeout": 1
          }
        ]
      }
    ]
  }
}
```

### 3. Restart Claude Code

```bash
# Or use /restart if you have the restart plugin
claude
```

## Configuration

The script uses these environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `TABZ_BACKEND_URL` | `http://localhost:8129` | TabzChrome backend URL |

## How It Works

1. Claude Code fires hook events (SessionStart, Stop, etc.)
2. The script writes state to `/tmp/claude-code-state/<session>.json`
3. TabzChrome backend polls these files
4. Sidebar updates and audio plays via Chrome TTS

## Troubleshooting

Check state files:
```bash
ls -la /tmp/claude-code-state/
cat /tmp/claude-code-state/*.json
```

Check backend is running:
```bash
curl http://localhost:8129/health
```
