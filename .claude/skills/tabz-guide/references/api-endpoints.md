# TabzChrome API Reference

REST API at `localhost:8129` for spawning terminals, managing sessions, syncing settings.

## Authentication

Most endpoints require auth token from `/tmp/tabz-auth-token`.

| Context | How to Get Token |
|---------|------------------|
| CLI/Scripts | `TOKEN=$(cat /tmp/tabz-auth-token)` |
| Extension | Auto-fetches via localhost API |
| External pages | User must paste token |

Token is auto-generated on backend start (mode 0600).

---

## Endpoints

### POST /api/spawn

Create a terminal programmatically.

```bash
TOKEN=$(cat /tmp/tabz-auth-token)
curl -X POST http://localhost:8129/api/spawn \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: $TOKEN" \
  -d '{"name": "Worker", "workingDir": "~/projects", "command": "claude"}'
```

**Parameters:**
- `name` - Display name (default: "Claude Terminal")
- `workingDir` - Starting directory (default: $HOME)
- `command` - Auto-executed after spawn (optional)

---

### GET /api/health

Health check (no auth required).

```bash
curl http://localhost:8129/api/health
# Returns: uptime, memory, version, Node.js version, platform
```

---

### GET /api/agents

List all active terminals.

```bash
curl http://localhost:8129/api/agents
# Returns: data[] with id, name, state, sessionName
```

---

### DELETE /api/agents/:id

Kill a terminal by ID.

```bash
curl -X DELETE http://localhost:8129/api/agents/ctt-MyTerminal-abc123
```

---

### GET /api/claude-status

Get Claude Code status for a terminal.

```bash
curl "http://localhost:8129/api/claude-status?dir=/home/user/project&sessionName=ctt-xxx"
# Returns: status, tool, file, subagentCount, contextPercentage
```

---

### GET/POST /api/settings/working-dir

Sync working directory settings.

```bash
# GET current settings
curl http://localhost:8129/api/settings/working-dir

# POST to update
curl -X POST http://localhost:8129/api/settings/working-dir \
  -H "Content-Type: application/json" \
  -d '{"globalWorkingDir": "~/projects", "recentDirs": ["~", "~/projects"]}'
```

---

### GET /api/tmux/sessions/:name/capture

Capture full terminal scrollback as text.

```bash
curl http://localhost:8129/api/tmux/sessions/ctt-Claude-abc123/capture
# Returns: content, metadata (workingDir, gitBranch, timestamp)
```

---

### POST /api/audio/speak

TTS playback via sidebar.

```bash
curl -X POST http://localhost:8129/api/audio/speak \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello, this is a test",
    "voice": "en-US-AndrewMultilingualNeural",
    "rate": "+20%",
    "volume": 0.8
  }'
```

---

## WebSocket Messages

Real-time terminal I/O via `ws://localhost:8129`:

| Message | Purpose |
|---------|---------|
| `TERMINAL_SPAWN` | Create terminal |
| `TERMINAL_INPUT` | Send keystrokes |
| `TERMINAL_OUTPUT` | Receive output (routed to owners) |
| `TERMINAL_RESIZE` | Update dimensions |
| `TERMINAL_KILL` | Close terminal |
| `RECONNECT` | Reattach to existing session |

See `extension/shared/messaging.ts` for message schemas.
