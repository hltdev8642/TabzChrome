# TabzChrome Recent Changes

## 1.1.16 (Dec 21, 2025)

**New plugins and agents:**
- **tabz-guide plugin** - Progressive disclosure help system
- **tui-expert agent** - Spawn and control TUI tools (btop, lazygit, lnav) via tmux
- **terminal-tools skill** - Structured patterns for TUI tool interaction

**Fixes:**
- State-tracker hooks properly reference `hooks.json` file
- State-tracker robustness with atomic writes, handles corrupted JSON
- 3D Focus settings sync with sidebar WebGL/Canvas toggle

---

## 1.1.15 (Dec 20, 2025)

**Context window tracking:**
- Tabs show context % on far right (e.g., "62%")
- Color-coded: green (<50%), yellow (50-74%), red (75%+)
- Audio alerts at 50% and 75% thresholds
- Requires StatusLine hook (see state-tracker plugin examples)

**WebGL renderer fixes:**
- Fully opaque backgrounds for diffs and box-drawing
- All themes use solid colors matching gradient starts

---

## 1.1.14 (Dec 20, 2025)

**3D Focus Mode:**
- Right-click tab → "🧊 Open in 3D Focus"
- Terminal floats in 3D starfield
- Scroll to zoom (1.5x-25x), mouse to orbit, F2 to lock camera
- Preserves theme, font size, font family
- Auto-returns to sidebar when 3D tab closes

---

## 1.1.13 (Dec 19, 2025)

**View as Text:**
- Right-click tab → "📄 View as Text"
- Full scrollback as copyable text (no truncation)
- Save as Markdown with metadata (timestamp, working directory, git branch)
- Dashboard Terminals page: Eye icon next to each terminal

---

## 1.1.10-12 (Dec 18, 2025)

**Dashboard enhancements:**
- Drag-drop profile reordering
- Theme gradient previews on cards
- Default profile star indicator
- Auto-sync with sidebar changes
- MCP Inspector launcher

---

## Key Architecture Changes

| Change | Description |
|--------|-------------|
| **Tmux resize pattern** | Only send resize on window resize, not container changes |
| **WebGL backgrounds** | Opaque instead of transparent for rendering stability |
| **State-tracker** | Preserves claude_session_id for context linking |

---

For complete version history, read `CHANGELOG.md` in the TabzChrome installation.
