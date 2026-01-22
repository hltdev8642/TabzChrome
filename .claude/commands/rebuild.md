---
description: Build the TabzChrome extension and MCP server (and sync to Windows/plugin cache)
---

Build the extension and MCP server. On WSL, copies extension to Windows. Always syncs MCP server to plugin cache.

```bash
# Build extension
npm run build && \
# Build MCP server
(cd tabz-mcp-server && npm run build) && \
# Sync MCP server to plugins folder (for distribution)
cp -r tabz-mcp-server/src tabz-mcp-server/dist plugins/tabz/tabz-mcp-server/ && \
# WSL: Copy extension to Windows
if [ -d /mnt/c ]; then WIN_DEST="${TABZ_WIN_PATH:-/mnt/c/Users/$(ls /mnt/c/Users/ 2>/dev/null | grep -vE '^(Default|Default User|Public|All Users|WsiAccount|desktop.ini)$' | head -1)/Desktop/TabzChrome/dist-extension/}" && rsync -av --delete dist-extension/ "$WIN_DEST"; fi && \
echo "Build complete: extension + MCP server synced to plugins/"
```

After running, tell the user:
1. Reload the extension in Chrome at `chrome://extensions`
2. Run `/restart` to reload the MCP server with new tools

**WSL users:** If the auto-detected path doesn't work, set `TABZ_WIN_PATH` in your shell config:
```bash
export TABZ_WIN_PATH="/mnt/c/Users/YourUsername/path/to/TabzChrome/dist-extension/"
```
