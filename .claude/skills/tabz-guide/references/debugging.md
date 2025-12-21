# TabzChrome Debugging Guide

## Common Issues

### Backend won't start

```bash
lsof -i :8129                      # Check if port in use
pkill -f "node.*server.js"         # Kill orphaned processes
cd backend && npm start            # Restart backend
```

### Terminal won't connect

```bash
curl http://localhost:8129/api/health   # Check backend
tmux ls | grep "^ctt-"                  # List extension terminals
```

### Sidebar doesn't open

- Reload extension at `chrome://extensions`
- Check service worker console for errors

### Sessions not persisting

```bash
tmux ls                           # Verify tmux running
tmux kill-server                  # Reset if corrupted (loses all sessions!)
```

### Terminal display corrupted

- Click ↻ refresh button in header
- Forces tmux to redraw all terminals

### Text has gaps/spacing

- Font not installed or misconfigured
- Change font to "Monospace (Default)" in settings

---

## Autonomous Debugging Commands

Debug without asking the user:

```bash
# Check backend status
ps aux | grep "node server.js" | grep -v grep

# List active Chrome terminals (all use ctt-* prefix)
tmux ls | grep "^ctt-"

# Capture backend + browser console logs
tmux capture-pane -t tabzchrome:logs -p -S -50

# Check specific terminal output (use actual ctt-* session name)
tmux capture-pane -t ctt-Claude-Worker-abc123 -p -S -30

# List terminals via API
curl -s http://localhost:8129/api/agents | jq '.data[] | {id, name, state}'
```

---

## Key Constraints

| Constraint | Details |
|------------|---------|
| Screenshot limitation | `tabz_screenshot` cannot capture Chrome sidebar |
| WebSocket routing | Must route to terminal owners, not broadcast to all |
| Resize corruption | Heavy output during resize can corrupt display |
| Terminal ID prefix | All IDs start with `ctt-` (Chrome Terminal Tab) |

---

## Build & Deploy (WSL)

After code changes:

```bash
npm run build
# Copy to Windows for Chrome to load
rsync -av --delete dist-extension/ /mnt/c/Users/$USER/Desktop/TabzChrome/dist-extension/
# Then reload at chrome://extensions
```

---

## Reference Files

For deeper debugging patterns:
- `docs/lessons-learned/debugging.md` - Diagnostic workflows
- `docs/lessons-learned/terminal-rendering.md` - Resize, tmux, xterm issues
- `docs/lessons-learned/chrome-extension.md` - Storage, WebSocket, audio
