# Browser MCP Server - WSL2 Setup Guide

This guide explains how to set up the Browser MCP Server when running Claude Code in WSL2 with Chrome on Windows.

## The Problem

WSL2 has network isolation from Windows:
- WSL2's `localhost` ≠ Windows `localhost`
- Chrome's CDP (Chrome DevTools Protocol) binds to Windows `localhost:9222`
- An MCP server running in WSL2 cannot directly access `localhost:9222`

## The Solution

Run the MCP server via Windows `node.exe` instead of WSL's `node`. This allows:
- Direct access to Chrome's `localhost:9222` for CDP tools
- Access to WSL's backend via localhost forwarding (Windows → WSL works)

## Setup Steps

### 1. Start Chrome with Remote Debugging

Add `--remote-debugging-port=9222` to your Chrome shortcut, or run:

```cmd
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222
```

Verify it's working:
```powershell
(Invoke-WebRequest 'http://localhost:9222/json/version' -UseBasicParsing).Content
```

### 2. Deploy MCP Server to Windows

From WSL2, copy the built server to a Windows location:

```bash
# Build the server
cd /home/matt/projects/TabzChrome-simplified/browser-mcp-server
npm run build

# Create Windows directory and copy files
mkdir -p /mnt/c/Users/marci/browser-mcp-dist
cp -r dist/* /mnt/c/Users/marci/browser-mcp-dist/
cp package.json /mnt/c/Users/marci/browser-mcp-dist/

# Install dependencies on Windows
powershell.exe -Command "cd C:\Users\marci\browser-mcp-dist; npm install --omit=dev"
```

### 3. Configure Claude Code MCP

Update **both** config files to use Windows `node.exe`:

**~/.mcp.json:**
```json
{
  "mcpServers": {
    "browser": {
      "command": "node.exe",
      "args": [
        "C:\\Users\\marci\\browser-mcp-dist\\index.js"
      ],
      "env": {
        "BACKEND_URL": "http://localhost:8129"
      }
    }
  }
}
```

**~/.claude/mcp.json:** (same config)
```json
{
  "mcpServers": {
    "browser": {
      "command": "node.exe",
      "args": [
        "C:\\Users\\marci\\browser-mcp-dist\\index.js"
      ],
      "env": {
        "BACKEND_URL": "http://localhost:8129"
      }
    }
  }
}
```

### 4. Restart Claude Code

After updating configs, restart Claude Code to load the MCP server.

Verify with `/mcp` - you should see "browser" connected with 10 tools.

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                        Your Setup                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐    │
│  │   Chrome     │     │  MCP Server  │     │ Claude Code  │    │
│  │  (Windows)   │────▶│  (node.exe)  │◀────│   (WSL2)     │    │
│  │ :9222 CDP    │     │  (Windows)   │     │              │    │
│  └──────────────┘     └──────────────┘     └──────────────┘    │
│         │                    │                    │             │
│         │                    │                    │             │
│         ▼                    ▼                    ▼             │
│    Windows localhost    Windows localhost    WSL2 localhost    │
│                              │                    │             │
│                              └────────────────────┘             │
│                              (localhost forwarding works        │
│                               Windows → WSL2)                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Why this works:**
1. `node.exe` runs on Windows, so `localhost:9222` reaches Chrome's CDP
2. `localhost:8129` from Windows reaches the TabzChrome backend in WSL2 (WSL2 localhost forwarding)
3. Claude Code communicates with the MCP server via stdio (works across WSL/Windows)

## Updating the MCP Server

When you make changes to the source code:

```bash
# Rebuild and redeploy
cd /home/matt/projects/TabzChrome-simplified/browser-mcp-server
npm run build
cp -r dist/* /mnt/c/Users/marci/browser-mcp-dist/

# Restart Claude Code to pick up changes
```

## Verifying the Setup

### Test Chrome CDP access from Windows:
```bash
node.exe -e "fetch('http://localhost:9222/json/version').then(r=>r.json()).then(d=>console.log(d.Browser))"
```

### Test backend access from Windows:
```bash
node.exe -e "fetch('http://localhost:8129/api/health').then(r=>r.json()).then(d=>console.log(d.status))"
```

### Test MCP tools in Claude Code:
- `browser_get_page_info` - Should return current tab info
- `browser_screenshot` - Should save to `C:\Users\marci\ai-images\`
- `browser_list_tabs` - Should list all open Chrome tabs

## Troubleshooting

### "CDP not available"
1. Ensure Chrome is running with `--remote-debugging-port=9222`
2. Verify: `powershell.exe -Command "(Invoke-WebRequest 'http://localhost:9222/json/version').StatusCode"`
3. Check MCP config uses `node.exe`, not `node`

### "Tools not showing" / "No such tool available"
1. Check `/mcp` in Claude Code - browser should be listed
2. Ensure both `~/.mcp.json` AND `~/.claude/mcp.json` are configured
3. Restart Claude Code after config changes

### "Not connected" errors
1. Ensure TabzChrome backend is running: `cd backend && npm start`
2. Check backend health: `curl http://localhost:8129/api/health`

### Screenshots save to wrong location
- Windows MCP server saves to `C:\Users\<user>\ai-images\`
- Use Read tool with Windows path: `/mnt/c/Users/marci/ai-images/screenshot-xxx.png`

## Files Reference

| File | Purpose |
|------|---------|
| `~/.mcp.json` | Global MCP server config |
| `~/.claude/mcp.json` | Claude-specific MCP config (keep in sync) |
| `C:\Users\marci\browser-mcp-dist\` | Windows-deployed MCP server |
| `browser-mcp-server/dist/` | Source build output (WSL) |
| `C:\Users\marci\ai-images\` | Screenshot output directory |
