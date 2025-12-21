---
name: tabz-guide
description: "Progressive disclosure guide to TabzChrome capabilities. Use when user asks about: profiles, terminal management, browser automation, MCP tools, integration, debugging, API, setup. Provides on-demand help organized by topic with links to detailed docs."
---

# Tabz Guide - Progressive Help System

## Overview

TabzChrome is a Chrome extension that provides **full Linux terminals in your browser sidebar** with persistence, profiles, and browser automation. This guide uses progressive disclosure - start with brief answers, dive deeper on request.

## Quick Start Topics

Ask about any of these to get started:
- **"How do I create profiles?"** - Profile system basics
- **"How do I integrate with my project?"** - Integration patterns
- **"What MCP tools are available?"** - Browser automation
- **"How do I debug issues?"** - Troubleshooting guide
- **"How do I use the API?"** - Programmatic control
- **"What's new?"** - Recent features and changes

---

## Profiles - Terminal Configuration Management

### Quick Answer

Profiles are templates for spawning terminals with saved settings (theme, font, directory, startup command). Click the + dropdown to spawn from a profile.

### Key Features

- **Smart directory inheritance** - Global header directory is inherited by profiles (no explicit dir = uses header)
- **Categories** - Color-coded groups (collapsible) with 9 colors
- **Import/Export** - Backup/share profiles as JSON
- **Default profile** - Star one profile for Spawn API
- **Theme previews** - Dashboard shows gradient backgrounds
- **Drag-drop reordering** - In dashboard profiles page

### Common Tasks

**Create a profile:**
1. Open Settings (⚙️) → Profiles tab
2. Click "Add Profile"
3. Set name, category, theme, font size
4. Optional: working directory (empty = inherits from header)
5. Optional: startup command (e.g., `lazygit`, `htop`)

**Set working directory:**
- Use folder icon in header bar
- Shows recent directories
- All profiles without explicit directory inherit this

**Export/Import:**
- Settings → Profiles tab → Download icon (export all)
- Upload icon (import) - choose Merge or Replace

**Discover new tools:**
```bash
# Use the discover-profiles command
/discover-profiles

# Scans system for: claude, lazygit, htop, nvim, etc.
# Opens curated lists for discovering TUI tools
# Generates ready-to-import profile configs
```

### Deep Dive

For profile schema, categories, and advanced config, read:
- `/home/matt/projects/TabzChrome/README.md` - Lines 200-240 (Profiles System)
- `/home/matt/projects/TabzChrome/docs/API.md` - Spawn endpoint parameters

---

## Integration - Connecting to Your Projects

### Quick Answer

TabzChrome can spawn terminals programmatically via REST API, trigger commands from webpage buttons, and provides MCP tools for browser automation. Perfect for AI coding workflows.

### Integration Points

1. **Spawn API** - REST endpoint to create terminals
2. **Custom triggers** - Click webpage elements to queue commands
3. **MCP tools** - Let Claude control browser (screenshots, clicks, downloads)
4. **Claude hooks** - Status detection for terminal tabs
5. **GitHub integration** - Floating action button on repo pages (clone, fork, star)

### Spawn API (Programmatic Terminal Creation)

**Basic usage:**
```bash
TOKEN=$(cat /tmp/tabz-auth-token)
curl -X POST http://localhost:8129/api/spawn \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: $TOKEN" \
  -d '{
    "name": "My Terminal",
    "workingDir": "~/projects",
    "command": "claude"
  }'
```

**From Claude Code (conductor agent):**
```bash
# The conductor agent can orchestrate multi-session workflows
# Spawn Claude workers, send prompts via tmux, coordinate tasks
```

**Parameters:**
- `name` - Display name (default: "Claude Terminal")
- `workingDir` - Starting directory (default: $HOME)
- `command` - Auto-executed after spawn (optional)

**Security:**
- Token at `/tmp/tabz-auth-token` (mode 0600)
- Extension auto-fetches via localhost API
- External pages must paste token manually

### Custom Webpage Triggers

Add `data-terminal-command` to any HTML element:

```html
<button data-terminal-command="npm run dev">Start Dev</button>
<code data-terminal-command="git status">git status</code>
```

**Behavior:**
- Click → opens sidebar → queues command to chat bar
- User selects which terminal receives it
- Visual feedback: "✓ Queued!" briefly
- Works on dynamically added elements

### Deep Dive

For integration patterns and examples, read:
- `/home/matt/projects/TabzChrome/docs/API.md` - Full API reference
- `/home/matt/projects/TabzChrome/README.md` - Lines 374-406 (Custom Triggers)
- `/home/matt/projects/TabzChrome/docs/PLUGIN.md` - Plugin/hook setup

---

## MCP Tools - Browser Automation

### Quick Answer

TabzChrome provides 20 MCP tools that let Claude control Chrome: take screenshots, click elements, fill forms, download images, monitor network requests. Uses both Chrome Extension API (tab management) and CDP (screenshots/clicks).

### Tool Categories

| Category | Tools | Purpose |
|----------|-------|---------|
| **Tab Management** | `tabz_list_tabs`, `tabz_switch_tab`, `tabz_rename_tab` | Navigate between tabs, accurate active detection |
| **Screenshots** | `tabz_screenshot`, `tabz_screenshot_full` | Capture viewport or full scrollable page |
| **Interaction** | `tabz_click`, `tabz_fill`, `tabz_execute_script` | Click buttons, fill forms, run JS |
| **Downloads** | `tabz_download_image`, `tabz_download_file`, `tabz_get_downloads` | Download files, track status |
| **Network** | `tabz_enable_network_capture`, `tabz_get_api_response` | Monitor API calls, inspect responses |
| **Inspection** | `tabz_get_element`, `tabz_get_console_logs`, `tabz_get_page_info` | Debug, inspect HTML/CSS |

### Quick Examples

**Take a screenshot:**
```bash
mcp-cli info tabz/tabz_screenshot       # Check schema (REQUIRED)
mcp-cli call tabz/tabz_screenshot '{}'  # Capture viewport
```

**Control AI image tools (DALL-E, Midjourney):**
```bash
# Fill prompt
mcp-cli call tabz/tabz_fill '{"selector": "textarea", "value": "a cat astronaut"}'

# Click generate
mcp-cli call tabz/tabz_click '{"selector": "button.generate"}'

# Download result (avoid avatars)
mcp-cli call tabz/tabz_download_image '{"selector": "img[src*=\"cdn\"]"}'
```

**List and switch tabs:**
```bash
# List (returns real Chrome tab IDs like 1762556601)
mcp-cli call tabz/tabz_list_tabs '{}'

# Switch (use actual tabId from list)
mcp-cli call tabz/tabz_switch_tab '{"tabId": 1762556601}'
```

### Setup Requirements

**For tab management, downloads, console logs (NO CDP):**
- Extension loaded in Chrome
- Backend running (`cd backend && npm start`)

**For screenshots, clicks, network capture (NEEDS CDP):**
- Chrome launched with `--remote-debugging-port=9222`
- Use Chrome-Debug.bat shortcut (Windows)

**MCP Server config (.mcp.json):**
```json
{
  "mcpServers": {
    "tabz": {
      "command": "/path/to/TabzChrome/tabz-mcp-server/run-auto.sh",
      "args": [],
      "env": { "BACKEND_URL": "http://localhost:8129" }
    }
  }
}
```

### Tool Discovery (Skill)

Use the `tabz-mcp` skill for guided automation:
```
Use the tabz-mcp skill to automate browser tasks
```

The skill dynamically discovers tools (never stale) and provides workflow patterns.

### Deep Dive

For detailed tool documentation and workflows, read:
- `/home/matt/projects/TabzChrome/tabz-mcp-server/MCP_TOOLS.md` - Complete tool reference
- `/home/matt/projects/TabzChrome/plugins/tabz-mcp/skills/tabz-mcp/SKILL.md` - Skill patterns
- `/home/matt/projects/TabzChrome/README.md` - Lines 442-528 (MCP Integration)

---

## Debugging - Troubleshooting Guide

### Quick Answer

Check backend running, verify tmux sessions, capture logs autonomously. TabzChrome uses tmux for persistence, so many issues are tmux-related.

### Common Issues

**Backend won't start:**
```bash
lsof -i :8129                      # Check if port in use
pkill -f "node.*server.js"         # Kill orphaned processes
cd backend && npm start            # Restart backend
```

**Terminal won't connect:**
```bash
curl http://localhost:8129/api/health   # Check backend
tmux ls | grep "^ctt-"                  # List extension terminals
```

**Sidebar doesn't open:**
- Reload extension at `chrome://extensions`
- Check service worker console for errors

**Sessions not persisting:**
```bash
tmux ls                           # Verify tmux running
tmux kill-server                  # Reset if corrupted (loses all sessions!)
```

**Terminal display corrupted:**
- Click ↻ refresh button in header
- Forces tmux to redraw all terminals

**Text has gaps/spacing:**
- Font not installed or misconfigured
- Change font to "Monospace (Default)" in settings

### Autonomous Debugging (For Claude)

You can debug autonomously without asking the user:

```bash
# Check backend status
ps aux | grep "node server.js" | grep -v grep

# List active Chrome terminals
tmux ls | grep "^ctt-"

# Capture backend + browser console logs
tmux capture-pane -t tabzchrome:logs -p -S -50

# Check specific terminal output
tmux capture-pane -t ctt-claude-abc123 -p -S -30
```

**Key constraints:**
- `tabz_screenshot` cannot capture Chrome sidebar (Chrome limitation)
- WebSocket must route to terminal owners, not broadcast to all clients
- Resize during heavy output can corrupt - use resize trick

### Build & Deploy (WSL)

After code changes:
```bash
npm run build
# Copy to Windows for Chrome to load
rsync -av --delete dist-extension/ /mnt/c/Users/$USER/Desktop/TabzChrome/dist-extension/
# Then reload at chrome://extensions
```

### Deep Dive

For debugging patterns and lessons learned, read:
- `/home/matt/projects/TabzChrome/docs/lessons-learned/debugging.md` - Diagnostic workflows
- `/home/matt/projects/TabzChrome/docs/lessons-learned/terminal-rendering.md` - Resize, tmux, xterm issues
- `/home/matt/projects/TabzChrome/docs/lessons-learned/chrome-extension.md` - Storage, WebSocket, audio
- `/home/matt/projects/TabzChrome/CLAUDE.md` - AI Assistant notes section

---

## API - Programmatic Control

### Quick Answer

REST API at `localhost:8129` for spawning terminals, managing sessions, syncing settings. Most endpoints require auth token from `/tmp/tabz-auth-token`.

### Key Endpoints

**POST /api/spawn** - Create terminal
```bash
TOKEN=$(cat /tmp/tabz-auth-token)
curl -X POST http://localhost:8129/api/spawn \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: $TOKEN" \
  -d '{"name": "Worker", "workingDir": "~/projects", "command": "claude"}'
```

**GET /api/health** - Health check (no auth)
```bash
curl http://localhost:8129/api/health
# Returns: uptime, memory, version, Node.js version, platform
```

**GET/POST /api/settings/working-dir** - Sync working directory
```bash
# GET current settings
curl http://localhost:8129/api/settings/working-dir

# POST to update
curl -X POST http://localhost:8129/api/settings/working-dir \
  -H "Content-Type: application/json" \
  -d '{"globalWorkingDir": "~/projects", "recentDirs": ["~", "~/projects"]}'
```

**GET /api/tmux/sessions/:name/capture** - Full terminal scrollback
```bash
curl http://localhost:8129/api/tmux/sessions/ctt-Claude-abc123/capture
# Returns: content, metadata (workingDir, gitBranch, timestamp)
```

**POST /api/audio/speak** - TTS playback via sidebar
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

### WebSocket Messages

Real-time terminal I/O via `ws://localhost:8129`:

- `TERMINAL_SPAWN` - Create terminal
- `TERMINAL_INPUT` - Send keystrokes
- `TERMINAL_OUTPUT` - Receive output (routed to owners)
- `TERMINAL_RESIZE` - Update dimensions
- `TERMINAL_KILL` - Close terminal
- `RECONNECT` - Reattach to existing session

See `extension/shared/messaging.ts` for message schemas.

### Authentication

- **CLI/Scripts**: Read `/tmp/tabz-auth-token`
- **Extension**: Auto-fetches via localhost API
- **External pages**: User must paste token
- **Token**: Auto-generated on backend start, mode 0600

### Deep Dive

For complete API documentation, read:
- `/home/matt/projects/TabzChrome/docs/API.md` - Full endpoint reference
- `/home/matt/projects/TabzChrome/CLAUDE.md` - Lines 116-125 (Spawn API)

---

## Features - What's Recently Added

### 1.1.15 (Dec 20, 2025)

**Context window tracking:**
- Tabs show context % on far right (e.g., "62%")
- Color-coded: green (<50%), yellow (50-74%), red (75%+)
- Audio alerts at 50% and 75% thresholds
- Requires StatusLine hook (see state-tracker plugin examples)

**WebGL renderer fixes:**
- Fully opaque backgrounds for diffs and box-drawing
- All themes use solid colors matching gradient starts

### 1.1.14 (Dec 20, 2025)

**3D Focus Mode:**
- Right-click tab → "🧊 Open in 3D Focus"
- Terminal floats in 3D starfield
- Scroll to zoom (1.5x-25x), mouse to orbit, F2 to lock camera
- Preserves theme, font size, font family

### 1.1.13 (Dec 19, 2025)

**View as Text:**
- Right-click tab → "📄 View as Text"
- Full scrollback as copyable text
- Save as Markdown with metadata

### 1.1.10-12 (Dec 18, 2025)

**Dashboard enhancements:**
- Drag-drop profile reordering
- Theme gradient previews on cards
- Default profile star indicator
- Auto-sync with sidebar changes
- MCP Inspector launcher

### Key Architecture Changes

**Tmux resize pattern** - Only send resize on window resize, not container changes
**WebGL backgrounds** - Opaque instead of transparent for rendering stability
**State-tracker** - Preserves claude_session_id for context linking

### Deep Dive

For complete changelog, read:
- `/home/matt/projects/TabzChrome/CHANGELOG.md` - Full version history

---

## Advanced Topics

### Terminal Rendering (xterm.js)

**Use the xterm-js skill** for deep terminal development patterns:
```
Use the xterm-js skill when building terminal UIs
```

Covers:
- Refs and state management (when to clear refs)
- WebSocket routing (owner tracking)
- Resize handling (tmux-specific patterns)
- React hooks refactoring (shared refs)
- Write queue management (clearing vs flushing)

See: `/home/matt/projects/TabzChrome/plugins/xterm-js/skills/xterm-js/SKILL.md`

### Claude Status Tracking

**Hooks write state files** that TabzChrome reads:
- `/tmp/claude-code-state/{pane_id}.json` - Status, tool, subagents
- `/tmp/claude-code-state/{session_id}-context.json` - Context percentage

**Status emojis on tabs:**
- 🤖✅ Ready/waiting
- 🤖⏳ Thinking
- 🤖🔧 Using tool (shows tool name and file)
- 🤖🤖 Subagents running (count of Task tools)

**Audio announcements:**
- Settings → Claude Audio
- Events: ready, session start, tools, subagent activity, context thresholds
- Random voice per terminal for multi-Claude workflows

**Setup:**
See: `/home/matt/projects/TabzChrome/docs/PLUGIN.md` - Hooks section

### Ghost Badge (Detached Sessions)

**Purpose:** Free up tab space while keeping sessions alive in tmux

**Workflow:**
1. Right-click tab → "👻 Detach Session"
2. Session removed from UI, tmux session preserved
3. Ghost badge (👻) appears in header with count
4. Click badge → select sessions → Reattach or Kill

**Use cases:**
- Detach long-running builds to check other terminals
- Recover after browser crash (sessions survive)
- Clean up forgotten sessions

**Deep dive:**
See: `/home/matt/projects/TabzChrome/README.md` - Lines 269-288 (Ghost Badge)

### Profile Discovery

**Command: /discover-profiles**

Scans system for CLI tools and generates import-ready profiles:
- Checks for: `claude`, `lazygit`, `htop`, `btop`, `nvim`, etc.
- Opens curated lists (awesome-tuis, modern-unix)
- Generates profile JSON with sensible defaults
- One-click import to sidebar

**Replace the old workflow** of manually creating profiles for each tool.

---

## File Locations Reference

**Core project files:**
- `/home/matt/projects/TabzChrome/README.md` - User guide
- `/home/matt/projects/TabzChrome/CLAUDE.md` - Architecture & dev rules
- `/home/matt/projects/TabzChrome/CHANGELOG.md` - Version history
- `/home/matt/projects/TabzChrome/docs/API.md` - REST API reference
- `/home/matt/projects/TabzChrome/tabz-mcp-server/MCP_TOOLS.md` - MCP tools reference

**Lessons learned:**
- `/home/matt/projects/TabzChrome/docs/lessons-learned/debugging.md`
- `/home/matt/projects/TabzChrome/docs/lessons-learned/terminal-rendering.md`
- `/home/matt/projects/TabzChrome/docs/lessons-learned/chrome-extension.md`
- `/home/matt/projects/TabzChrome/docs/lessons-learned/architecture.md`

**Plugin/Skill documentation:**
- `/home/matt/projects/TabzChrome/docs/PLUGIN.md` - Plugin overview
- `/home/matt/projects/TabzChrome/plugins/tabz-mcp/skills/tabz-mcp/SKILL.md`
- `/home/matt/projects/TabzChrome/plugins/xterm-js/skills/xterm-js/SKILL.md`

**Key implementation files:**
- `/home/matt/projects/TabzChrome/extension/components/Terminal.tsx` - xterm.js terminal
- `/home/matt/projects/TabzChrome/extension/hooks/useTerminalSessions.ts` - Session lifecycle
- `/home/matt/projects/TabzChrome/extension/hooks/useProfiles.ts` - Profile CRUD
- `/home/matt/projects/TabzChrome/backend/modules/pty-handler.js` - PTY spawning, tmux
- `/home/matt/projects/TabzChrome/backend/routes/api.js` - REST endpoints

---

## Getting Help

**Progressive approach:**

1. **Quick question?** Ask this skill for a brief answer
2. **Need details?** This skill provides file paths to read
3. **Debugging?** Use autonomous debugging patterns
4. **Building features?** Use xterm-js or tabz-mcp skills
5. **Integration?** Check API.md or PLUGIN.md

**Common workflows:**

- "How do I spawn a terminal from code?" → Integration → Spawn API
- "Terminal display is corrupted" → Debugging → Terminal rendering
- "Need to automate browser tasks" → MCP Tools → Quick examples
- "Building a terminal UI" → Advanced Topics → xterm-js skill
- "What changed recently?" → Features section

---

## Quick Command Reference

```bash
# Backend
./scripts/dev.sh                  # Start backend (tmux session)
cd backend && npm start           # Start backend (direct)

# Build
npm run build                     # Build extension
npm test                          # Run tests

# Debugging
ps aux | grep "node server"       # Check backend running
tmux ls | grep "^ctt-"            # List extension terminals
tmux capture-pane -t tabzchrome:logs -p -S -50  # Backend + console logs

# MCP
mcp-cli tools tabz                # List available tools
mcp-cli info tabz/<tool>          # Check tool schema (REQUIRED before call)
mcp-cli call tabz/<tool> '{...}'  # Call tool

# API
curl http://localhost:8129/api/health  # Health check
TOKEN=$(cat /tmp/tabz-auth-token)      # Get auth token
```

---

**This skill uses progressive disclosure.** Start with quick answers, provide file paths for deep dives. Always link to specific documentation when user needs more detail.
