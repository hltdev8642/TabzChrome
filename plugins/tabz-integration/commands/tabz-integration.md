---
description: Integration guide for connecting projects to TabzChrome terminals
---

# TabzChrome Integration Guide

Connect projects to TabzChrome terminals via HTML attributes, WebSocket, or REST API.

---

Use the AskUserQuestion tool:

```
questions:
  - question: "Which TabzChrome integration methods do you need?"
    header: "Integration"
    multiSelect: true
    options:
      - label: "HTML Buttons"
        description: "data-terminal-command attribute for 'Run in Terminal' buttons"
      - label: "CLI/Scripts"
        description: "WebSocket API via websocat for shell scripts"
      - label: "Web App JS"
        description: "JavaScript WebSocket for prompt libraries"
      - label: "Spawn API"
        description: "POST /api/spawn to create new terminal tabs"
```

After user selects, provide relevant details from below and code examples from `references/integration-examples.md`.

---

## Method 1: HTML Data Attributes

Add `data-terminal-command` to any element. Click queues command to sidebar.

```html
<button data-terminal-command="npm run dev">Start Dev</button>
```

- No auth required
- Works on dynamic elements

---

## Method 2: WebSocket API (CLI)

Queue commands from shell scripts via websocat.

```bash
TOKEN=$(cat /tmp/tabz-auth-token)
echo '{"type":"QUEUE_COMMAND","command":"npm test"}' | \
  websocat "ws://localhost:8129?token=$TOKEN"
```

For shell function and multi-line prompts, see `references/integration-examples.md`.

---

## Method 3: Web Page JavaScript

Connect from web apps to queue prompts.

```javascript
ws.send(JSON.stringify({ type: 'QUEUE_COMMAND', command: prompt }));
```

For full connection pattern, see `references/integration-examples.md`.

---

## Method 4: Spawn API

Create new terminal tabs programmatically.

```bash
TOKEN=$(cat /tmp/tabz-auth-token)
curl -X POST http://localhost:8129/api/spawn \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: $TOKEN" \
  -d '{"name": "Worker", "workingDir": "~/projects", "command": "claude"}'
```

| Parameter | Description |
|-----------|-------------|
| `name` | Tab display name |
| `workingDir` | Starting directory |
| `command` | Command to run after spawn |

For web page examples and dynamic builders, see `references/integration-examples.md`.

---

## Quick Reference

| Method | Auth | Use Case |
|--------|------|----------|
| `data-terminal-command` | None | Static buttons |
| WebSocket + websocat | `/tmp/tabz-auth-token` | CLI workflows |
| WebSocket + JS | `/api/auth/token` | Web apps |
| POST /api/spawn | Token header | New terminals |

---

## Flow Summary

1. **Queue Command** (Methods 1-3): Source → Backend → Broadcast → Sidebar populates chat input
2. **Spawn** (Method 4): POST → Backend creates tmux session → Tab appears automatically

For security notes (HTTPS, token sanitization), see `references/integration-examples.md`.
