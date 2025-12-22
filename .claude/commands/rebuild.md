---
description: Build the TabzChrome extension (and copy to Windows on WSL)
---

Build the extension. On WSL, also copies to Windows for Chrome reload.

```bash
npm run build && if [ -d /mnt/c ]; then WIN_DEST="${TABZ_WIN_PATH:-/mnt/c/Users/$(ls /mnt/c/Users/ 2>/dev/null | grep -vE '^(Default|Default User|Public|All Users|WsiAccount|desktop.ini)$' | head -1)/Desktop/TabzChrome/dist-extension/}" && rsync -av --delete dist-extension/ "$WIN_DEST"; fi
```

After running, tell the user to reload the extension in Chrome at `chrome://extensions`.

**WSL users:** If the auto-detected path doesn't work, set `TABZ_WIN_PATH` in your shell config:
```bash
export TABZ_WIN_PATH="/mnt/c/Users/YourUsername/path/to/TabzChrome/dist-extension/"
```
