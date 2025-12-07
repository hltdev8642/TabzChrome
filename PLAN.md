# PLAN.md - TabzChrome Roadmap

**Last Updated**: December 4, 2025
**Current Version**: 2.2.0
**Status**: Preparing for Public Release

---

## Phase 1: Getting Ready to Share

### 1.1 System Requirements Documentation ✅

**Goal**: Clear documentation so users know if TabzChrome will work for them.

**Required:**
- [x] Document minimum requirements in README.md:
  - Chrome browser (Manifest V3 compatible)
  - WSL2 or native Linux for backend
  - Node.js (document minimum version)
  - tmux (for terminal persistence)

**Optional dependencies:**
- [x] Nerd Fonts (for icons in terminal)
- [x] TUI apps referenced in default profiles (lazygit, htop, etc.)

**Tasks:**
- [x] Test minimum Node.js version (18.x minimum, 20.x+ recommended)
- [x] Verify Chrome version requirements (116+ for Side Panel API)
- [x] Add "Requirements" section to README.md
- [x] Add troubleshooting for common setup issues

### 1.2 Codebase Cleanup Audit ✅

**Goal**: Remove outdated docs, scripts, and personal paths before sharing.

**Documentation cleanup:**
- [x] Audit `docs/` folder - kept for reference (archived/, bugs/, planning/, etc.)
- [x] Audit `docs/archived/` - kept for historical reference
- [x] README.md updated - removed Commands Panel references, updated to profiles

**Config cleanup:**
- [x] Review `spawn-options.json` - removed personal paths, made generic
- [x] Review `public/spawn-options.json` - same
- [x] Fixed hardcoded `/home/matt` path in Terminal.tsx

**Scripts cleanup:**
- [x] Removed `scripts/` folder (outdated dev utilities referencing old port/session names)
- [x] Removed root shell scripts (start.sh, stop.sh, start-tmux.sh, test-claude-colors.sh)
  - These were for the web app version, not needed for Chrome extension

**Dead code:**
- [x] Searched for TODO/FIXME comments - remaining are minor (toast notifications, options page)
- [x] Commands Panel references removed from README.md

### 1.3 Test Suite (Partial ✅)

**Goal**: Ensure tests run and catch regressions, especially xterm.js issues.

**Current state:**
- ✅ Tests in `tests/` - 172 tests passing (7 test files)
- ✅ Removed web-app-specific tests (splits, multi-window, cross-window sync)

**Completed:**
- [x] Run existing test suite - 172 tests pass
- [x] Remove/update tests for features that don't exist in Chrome extension
  - Removed: cross-window-state-sync.test.ts, split-operations.test.ts,
    multi-window-popout.test.ts, detach-reattach.test.ts, detached-terminals-dropdown.test.ts
- [x] Document how to run tests in README

**Future work (post-release):**
- [ ] Add Chrome extension-specific tests:
  - [ ] Extension loads successfully
  - [ ] Sidebar opens
  - [ ] Terminal spawns with profile
  - [ ] WebSocket connection established
  - [ ] Settings persistence (Chrome storage)
- [ ] Add xterm.js regression tests:
  - [ ] Terminal resize handling
  - [ ] Copy/paste functionality
  - [ ] Reconnection behavior

### 1.4 README.md Polish (Partial ✅)

**Goal**: User-friendly documentation for new users.

- [x] Clear "Getting Started" section (exists)
- [ ] Screenshots of the extension in action
- [x] Feature overview (exists)
- [x] Installation instructions (load unpacked) (exists)
- [x] Backend setup instructions (exists)
- [x] Troubleshooting section
- [ ] Contributing guidelines (if accepting PRs)

---

## Phase 2: Future Enhancements (Post-Release)

### Audio/Voice Pack for Claude Status
Play sounds or voice announcements when Claude status changes.

**Implementation options:**
1. **Extension plays audio** (cleanest) - React to `claudeStatuses` changes in sidepanel
   ```typescript
   useEffect(() => {
     if (status?.status === 'tool_use') new Audio('/sounds/tool.mp3').play()
     if (status?.status === 'awaiting_input') new Audio('/sounds/ready.mp3').play()
   }, [claudeStatuses])
   ```
2. **Hooks call Windows directly** - PowerShell from WSL
   ```bash
   powershell.exe -c "(New-Object Media.SoundPlayer 'C:\sounds\ready.wav').PlaySync()" &
   ```
3. **Windows TTS** - Dynamic announcements
   ```bash
   powershell.exe -c "Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak('Editing file')" &
   ```

**Voice pack ideas:**
- Tool-specific sounds (edit, bash, read, grep)
- "Ready for input" when Claude finishes
- Error/warning sounds
- RTS-style advisor: "Your Claude is under attack" on errors 😂

### Tmux Control Center Tab
A dedicated tab for managing all tmux sessions - UI version of tmuxplexer.

**Features:**
- Grid/list view of all tmux sessions with Claude status badges
- Live terminal previews via `tmux capture-pane`
- Multi-select sessions for broadcast prompts
- Session grouping (by project, by status)
- Nice chat interface with multi-send (better than TUI input)

### Keyboard Shortcuts
- `Alt+T` - Open spawn menu
- `Alt+W` - Close active tab
- `Alt+1-9` - Jump to tab
- Blocked: Can't override Ctrl+T/W (browser reserved)

### Import/Export Profiles
- Export profiles to JSON for backup/sharing
- Import profiles from file

### Tab Context Menu
- Right-click tab for: Rename, Close, Close Others

### Chrome Web Store Publication
- Privacy policy
- Screenshots and description
- Version management

---

## Non-Goals

These are intentionally excluded from the Chrome extension:

- **Split terminals** - Sidebar is narrow, use tmux splits instead
- **Multi-window support** - Chrome has one sidebar per window by design
- **Background gradients** - Keep it simple
- **Tab drag-and-drop** - Narrow sidebar makes this awkward

---

## Technical Notes

### Terminal ID Prefixes
- `ctt-` prefix for all Chrome extension terminals
- Enables easy cleanup: `tmux ls | grep "^ctt-"`
- Distinguishes from web app terminals (`tt-`)

### State Management
- Chrome storage for UI state (profiles, settings, recent dirs)
- tmux for terminal persistence (processes survive backend restart)
- WebSocket for real-time terminal I/O

### Ports
- Backend: 8129 (WebSocket + REST API)

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

For historical planning documents and completed work, see [docs/archive/](docs/archive/).
