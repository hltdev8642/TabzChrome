# TabzChrome Integration: Queue Commands to Chat

TabzChrome is a Chrome extension that provides a terminal sidebar. Commands can be queued to the chat input from web pages, CLI tools, or any WebSocket client.

## Method 1: HTML Data Attributes (Web Pages)

Add the `data-terminal-command` attribute to any HTML element:

```html
<!-- Simple button -->
<button data-terminal-command="npm run dev">Start Dev Server</button>

<!-- Link style -->
<a href="#" data-terminal-command="git status">Check Git Status</a>

<!-- Code block with run option -->
<code data-terminal-command="npm install express">npm install express</code>

<!-- Any element works -->
<div data-terminal-command="docker compose up -d">Launch Containers</div>
```

### Behavior

1. **Click**: Opens TabzChrome sidebar and populates the chat input with the command
2. **User selects terminal**: User chooses which terminal tab to send the command to
3. **Visual feedback**: Element shows "✓ Queued!" with green background for 1 second
4. **Cursor**: Automatically changes to pointer on hover

### Notes

- Commands are sent as-is (no shell expansion on the web page side)
- Works on dynamically added elements (MutationObserver watches for changes)
- Extension must be installed and backend running on `localhost:8129`
- No additional scripts or dependencies needed on the web page

---

## Method 2: WebSocket API (CLI / Scripts)

Send commands directly to TabzChrome from the terminal or any WebSocket client.

### Message Format

```json
{
  "type": "QUEUE_COMMAND",
  "command": "your command or prompt here"
}
```

### Authentication

The WebSocket server requires a token for security. The token is auto-generated on backend startup and stored at `/tmp/tabz-auth-token`.

```bash
# Get the auth token
TOKEN=$(cat /tmp/tabz-auth-token)

# Connect with token
websocat "ws://localhost:8129?token=$TOKEN"
```

### Using websocat

```bash
# Install websocat (one-time)
cargo install websocat
# or: brew install websocat

# Get token and send a command
TOKEN=$(cat /tmp/tabz-auth-token)
echo '{"type":"QUEUE_COMMAND","command":"npm run dev"}' | websocat "ws://localhost:8129?token=$TOKEN"

# Send a multi-line prompt
TOKEN=$(cat /tmp/tabz-auth-token)
cat <<'EOF' | jq -Rs '{type:"QUEUE_COMMAND",command:.}' | websocat "ws://localhost:8129?token=$TOKEN"
Implement a new feature that:
1. Adds user authentication
2. Uses JWT tokens
3. Includes refresh token rotation
EOF
```

### Shell Function

Add to your `.bashrc` or `.zshrc`:

```bash
# Queue command/prompt to TabzChrome sidebar
tabz() {
  local cmd="$*"
  local token=$(cat /tmp/tabz-auth-token 2>/dev/null)
  if [[ -z "$token" ]]; then
    echo "Error: TabzChrome backend not running (no auth token found)"
    return 1
  fi
  echo "{\"type\":\"QUEUE_COMMAND\",\"command\":$(echo "$cmd" | jq -Rs .)}" | websocat "ws://localhost:8129?token=$token"
}

# Usage:
# tabz npm run dev
# tabz "Explain this error and suggest a fix"
```

---

## Method 3: Web Page JavaScript API

For dynamic web apps (like prompt libraries with fillable fields):

```javascript
// First, get the auth token from the backend
async function connectToTabz() {
  // Fetch token (only works from localhost due to CORS)
  const tokenRes = await fetch('http://localhost:8129/api/auth/token');
  const { token } = await tokenRes.json();

  // Connect with token
  const ws = new WebSocket(`ws://localhost:8129?token=${token}`);
  return ws;
}

// Queue a prompt to the chat input
let ws;
async function queueToTabz(prompt) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    ws = await connectToTabz();
    // Wait for connection
    await new Promise(resolve => ws.onopen = resolve);
  }
  ws.send(JSON.stringify({
    type: 'QUEUE_COMMAND',
    command: prompt
  }));
}

// Example: Send filled-in prompt template
const filledPrompt = `
Refactor the ${selectedFile} to:
- Use ${framework} patterns
- Add error handling for ${errorCases}
`;
queueToTabz(filledPrompt);
```

> **Note:** The `/api/auth/token` endpoint only responds to localhost requests for security.

### Use Case: Prompt Libraries (e.g., ggprompts)

A prompt library web app could:

1. Display prompt templates with fillable fields (variables, dropdowns, file pickers)
2. User fills in the fields
3. Click "Send to TabzChrome" button
4. Prompt queues to sidebar chat input
5. User picks which Claude/terminal session receives it

```html
<!-- Example prompt template UI -->
<div class="prompt-template">
  <h3>Code Review Prompt</h3>
  <input id="file" placeholder="File to review" />
  <select id="focus">
    <option>Security</option>
    <option>Performance</option>
    <option>Readability</option>
  </select>
  <button onclick="sendFilledPrompt()">Send to TabzChrome</button>
</div>

<script>
function sendFilledPrompt() {
  const file = document.getElementById('file').value;
  const focus = document.getElementById('focus').value;
  const prompt = `Review ${file} with focus on ${focus}. Suggest improvements.`;
  queueToTabz(prompt);
}
</script>
```

---

## Method 4: Spawn API (New Terminals with Custom Names)

For spawning **new terminal tabs** with descriptive names and commands (not queuing to existing terminals).

**Use case**: Claude Code launcher with many CLI flag combinations (agents, voices, speeds, etc.)

### POST /api/spawn

**⚠️ Authentication Required:** This endpoint requires the auth token to prevent malicious websites from spawning terminals with arbitrary commands.

```bash
# Get token first
TOKEN=$(cat /tmp/tabz-auth-token)

curl -X POST http://localhost:8129/api/spawn \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: $TOKEN" \
  -d '{
    "name": "Claude + explore + jenny",
    "workingDir": "~/projects/myapp",
    "command": "claude --agent explore --voice jenny --dangerously-skip-permissions"
  }'
```

| Parameter | Required | Description |
|-----------|----------|-------------|
| `X-Auth-Token` (header) | **Yes** | Auth token from `/tmp/tabz-auth-token` |
| `name` | No | Tab display name (default: "Claude Terminal") |
| `workingDir` | No | Starting directory (default: `$HOME`) |
| `command` | No | Command to run after shell ready (~1.2s delay) |

### Getting the Auth Token

| Context | Method |
|---------|--------|
| **CLI / Conductor** | `TOKEN=$(cat /tmp/tabz-auth-token)` |
| **Extension Settings** | Click "API Token" → "Copy Token" button |
| **External web pages** | User pastes token into input field (stored in localStorage) |
| **WebSocket connections** | `GET /api/auth/token` (localhost only) |

### Claude Code Launcher Example

Build commands dynamically instead of maintaining hundreds of profiles:

```html
<h2>Spawn Claude Code</h2>

<label>Agent:</label>
<select id="agent">
  <option value="">None</option>
  <option value="--agent explore">Explore</option>
  <option value="--agent plan">Plan</option>
</select>

<label>Voice:</label>
<select id="voice">
  <option value="">Default</option>
  <option value="--voice jenny">Jenny</option>
  <option value="--voice guy">Guy</option>
</select>

<label>Speed:</label>
<input type="range" id="speed" min="0.5" max="2" step="0.1" value="1">

<label><input type="checkbox" id="skip" checked> Skip permissions</label>

<button onclick="spawnClaude()">Spawn</button>
<pre id="preview"></pre>

<script>
function buildCommand() {
  const parts = ['claude'];
  const agent = document.getElementById('agent').value;
  const voice = document.getElementById('voice').value;
  const speed = document.getElementById('speed').value;
  const skip = document.getElementById('skip').checked;

  if (agent) parts.push(agent);
  if (voice) parts.push(voice);
  if (speed !== '1') parts.push(`--speed ${speed}`);
  if (skip) parts.push('--dangerously-skip-permissions');

  return parts.join(' ');
}

function buildName() {
  const parts = ['Claude'];
  const agent = document.getElementById('agent').value;
  const voice = document.getElementById('voice').value;

  if (agent) parts.push(agent.replace('--agent ', ''));
  if (voice) parts.push(voice.replace('--voice ', ''));

  return parts.join(' + ');
}

function updatePreview() {
  document.getElementById('preview').textContent = buildCommand();
}

// Token management - user pastes token, stored in localStorage
function getToken() {
  const input = document.getElementById('authToken');
  const token = input?.value.trim() || localStorage.getItem('tabz-auth-token');
  if (token) localStorage.setItem('tabz-auth-token', token);
  return token;
}

async function spawnClaude() {
  const token = getToken();
  if (!token) {
    alert('Token required - get from Tabz Settings → API Token');
    return;
  }
  fetch('http://localhost:8129/api/spawn', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Token': token
    },
    body: JSON.stringify({
      name: buildName(),
      workingDir: '~/projects',  // or get from input
      command: buildCommand()
    })
  }).then(() => {
    // Tab appears in TabzChrome sidebar automatically
  });
}

// Update preview on any change
document.querySelectorAll('select, input').forEach(el => {
  el.addEventListener('change', updatePreview);
  el.addEventListener('input', updatePreview);
});
updatePreview();
</script>
```

### Why Spawn API vs Profiles?

| Approach | Best For |
|----------|----------|
| **Profiles** | Static configs (Bash, Large Text, specific theme) |
| **Spawn API** | Combinatorial options (Agent × Voice × Speed × Flags) |
| **QUEUE_COMMAND** | Sending to existing terminals |

### Notes

- Terminal ID: `ctt-{name}-{shortId}` (e.g., `ctt-Claude + explore + jenny-a1b2c3`)
- Claude status tracking works (uses `workingDir`, not profile name)
- Tab appears automatically via WebSocket broadcast
- Works with tmux persistence

---

## Architecture

### Queue Command Flow (Methods 1-3)
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Web Page      │     │    CLI/Script   │     │   Prompt App    │
│ data-terminal-  │     │   (websocat)    │     │  (ggprompts)    │
│    command      │     │                 │     │                 │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │ content script        │ WebSocket + token     │ WebSocket + token
         │ click handler         │ from /tmp/tabz-auth   │ from /api/auth/token
         ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    TabzChrome Backend                           │
│                    ws://localhost:8129?token=<auth_token>       │
│                                                                 │
│  case 'QUEUE_COMMAND':                                          │
│    broadcast({ type: 'QUEUE_COMMAND', command: data.command }); │
└────────────────────────────────┬────────────────────────────────┘
                                 │ broadcast
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                Chrome Extension (background.ts)                 │
│                                                                 │
│  → Opens sidebar if closed                                      │
│  → Forwards QUEUE_COMMAND to sidepanel                          │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Sidepanel (React)                            │
│                                                                 │
│  → Populates chat input with command                            │
│  → User picks terminal tab and sends                            │
└─────────────────────────────────────────────────────────────────┘
```

### Spawn Flow (Method 4)
```
┌─────────────────────────────────┐
│   Claude Launcher Web Page      │
│   or CLI (curl)                 │
│                                 │
│   POST /api/spawn               │
│   { name, workingDir, command } │
└────────────────┬────────────────┘
                 │ HTTP POST
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    TabzChrome Backend                           │
│                    http://localhost:8129/api/spawn              │
│                                                                 │
│  → Creates tmux session (ctt-{name}-{shortId})                  │
│  → Registers terminal in registry                               │
│  → Executes command after shell ready (~1.2s)                   │
│  → broadcast({ type: 'terminal-spawned', data: terminal })      │
└────────────────────────────────┬────────────────────────────────┘
                                 │ WebSocket broadcast
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Sidepanel (React)                            │
│                                                                 │
│  → New tab appears automatically                                │
│  → Claude status tracking works (by workingDir)                 │
│  → User can interact immediately                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Summary

| Method | Source | Auth Required | Use Case |
|--------|--------|---------------|----------|
| `data-terminal-command` | Web page HTML | No (uses content script) | Static "Run in Terminal" buttons |
| WebSocket + websocat | CLI / tmux | Yes (`/tmp/tabz-auth-token`) | Prompt engineering workflows (/pmux-chrome) |
| WebSocket + JS | Web apps | Yes (`/api/auth/token`) | Prompt libraries with fillable templates |
| POST /api/spawn | CLI / Conductor | Yes (`/tmp/tabz-auth-token`) | Spawn new terminals programmatically |
| POST /api/spawn | External web pages | Yes (user pastes token) | Claude Code launcher on GitHub Pages |

> **Security Note:** WebSocket connections require a token (added in v2.7.4). The token is auto-generated per backend session and stored at `/tmp/tabz-auth-token`.
>
> **For external web pages** (like GitHub Pages): Users must manually paste their token into an input field. Get it from Extension Settings → "API Token" → "Copy Token". This ensures conscious authorization - sites cannot auto-spawn terminals without user action.
