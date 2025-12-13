# Chrome Extension Lessons

Lessons specific to Chrome extension development, including storage, reconnection, and audio notifications.

---

## Read Chrome Storage Directly for Race-Prone Values

### Lesson: React State May Not Be Hydrated (Dec 10, 2025)

**Problem:** Spawning terminals used wrong working directory - always `~` instead of header dropdown value.

**What Happened:**
1. User sets header working directory to `~/projects/TabzChrome`
2. User clicks + to spawn terminal
3. `handleSpawnDefaultProfile()` reads `globalWorkingDir` from React state
4. But React state hasn't loaded from Chrome storage yet!
5. `globalWorkingDir` is still `''` (initial state) or stale
6. Terminal spawns in `~` instead of selected directory

**Root Cause:** React state hydration from Chrome storage is async. If user acts before hydration completes, state values are stale.

**Solution:**
```typescript
// ❌ BROKEN - React state may not be hydrated yet
const handleSpawnDefaultProfile = () => {
  const effectiveWorkingDir = profile.workingDir || globalWorkingDir || '~'
}

// ✅ CORRECT - Read from Chrome storage directly
const handleSpawnDefaultProfile = () => {
  chrome.storage.local.get(['globalWorkingDir'], (result) => {
    const currentGlobalWorkingDir = (result.globalWorkingDir as string) || globalWorkingDir || '~'
    // Now we have the actual saved value
  })
}
```

**Key Insight:**
- Chrome storage is the source of truth, React state is a cache
- For user actions that depend on persisted values, read storage directly
- Use React state as fallback, not primary source

**Files:**
- `extension/sidepanel/sidepanel.tsx:328-393` - Both spawn functions read from storage

---

## Deduplicate WebSocket Message Handlers

### Lesson: Reconnection Creates Multiple Message Sources (Dec 10, 2025)

**Problem:** Terminals appearing 2-3 times in the sidebar after spawn or reconnect.

**What Happened - Multiple Issues:**

1. **Backend sent terminals 3x on connect:**
   - Once immediately on WebSocket open
   - Once from session recovery broadcast
   - Once in response to LIST_TERMINALS

2. **Frontend sent LIST_TERMINALS 2x:**
   - Once from initial effect
   - Once after port reconnection

3. **Duplicate RECONNECT messages:**
   - Sent when receiving terminal-spawned
   - Sent again when reconciling stored sessions

**Solution - Deduplication at Multiple Levels:**

```typescript
// 1. Backend: Don't auto-send terminals on connect

// 2. Frontend: Track if we've sent LIST_TERMINALS
const hasSentListTerminalsRef = useRef(false)

if (wsConnected && !hasSentListTerminalsRef.current) {
  hasSentListTerminalsRef.current = true
  sendMessage({ type: 'LIST_TERMINALS' })
}

// 3. Frontend: Track reconnected terminals
const reconnectedTerminalsRef = useRef<Set<string>>(new Set())

if (!reconnectedTerminalsRef.current.has(terminal.id)) {
  reconnectedTerminalsRef.current.add(terminal.id)
  sendMessage({ type: 'RECONNECT', terminalId: terminal.id })
}
```

**Key Insight:**
- WebSocket reconnection triggers multiple initialization paths
- Each path may send the same messages
- Use refs to track "already done" state across re-renders
- Clear tracking refs appropriately (on disconnect, not on every message)

**Files:**
- `backend/server.js:268-286` - Removed auto-send on connect
- `extension/hooks/useTerminalSessions.ts:47-50,117-125,265-271` - Dedup refs

---

## Polling-Based Audio Misses Fast Tool Transitions

### Lesson: Track Tool Names, Not Just Status (Dec 9, 2025)

**Problem:** Chrome extension audio notifications only announced ~1 tool out of 4-5, while WSL-based audio announced all of them.

**What Happened:**
1. Extension polls `/api/claude-status` every 1 second
2. Backend returns current status (`tool_use`, `processing`, `awaiting_input`) with tool name
3. Extension only triggered audio when `status === 'tool_use'`
4. But tools complete fast - by the time poll happens, status is often `processing` (post-tool)
5. Result: Most tools missed

**Root Cause - Multiple Issues:**

1. **Status vs Tool Name**: Original code only announced when transitioning INTO `tool_use` status. But quick tools often show as `processing` with a tool name.

2. **Same-Status Transitions**: If Claude does Read → Grep → Glob quickly:
   - Poll 1: `processing (Read)`
   - Poll 2: `processing (Grep)` - status unchanged, tool changed!
   - Original code: no announcement because status didn't change

**Solution:**

```typescript
// 1. Track tool NAME changes, not just status changes
const prevToolNamesRef = useRef<Map<string, string>>(new Map())

// 2. Announce on EITHER status transition OR tool name change
const isActiveStatus = currentStatus === 'tool_use' || currentStatus === 'processing'
const isNewTool = currentToolName !== '' && currentToolName !== prevToolName

if (audioSettings.events.tools && isActiveStatus && isNewTool) {
  playAudio(announcement, session, true)
}

// 3. Update prev tool after checking
prevToolNamesRef.current.set(terminalId, currentToolName)
```

**Also Required:**
- Reduce polling interval from 3s → 1s for better responsiveness
- Reduce tool debounce from 1000ms → 250ms to allow rapid announcements
- **Copy build to Windows**: `rsync -av dist-extension/ /mnt/c/Users/.../dist-extension/`

**Why WSL Audio Works Better:**
- WSL uses Claude Code hooks (`PreToolUse`) that fire **instantly** on every tool
- No polling - event-driven
- Chrome extension can't use hooks directly, must poll state files

**Files:**
- `extension/sidepanel/sidepanel.tsx:113,525-550` - prevToolNamesRef + isNewTool logic
- `extension/hooks/useClaudeStatus.ts:148` - Polling interval (1000ms)

---

## Gate Audio on File Freshness

### Lesson: Status Files May Be Stale (Dec 10, 2025)

**Problem:** "Ready" audio announcements playing repeatedly, sometimes for terminals that weren't even active.

**What Happened:**
1. Claude Code writes status to `~/.claude-status/{sessionName}.json`
2. Chrome extension polls `/api/claude-status` endpoint
3. Backend reads status file and returns `awaiting_input` (ready state)
4. Extension sees transition to "ready" → plays audio
5. But file might be **hours old** from previous session!
6. Result: Stale files trigger announcements for inactive terminals

**Solution - Check file freshness:**

```typescript
// Backend: Include last_updated in response
const stats = fs.statSync(statusFile)
const lastUpdated = stats.mtimeMs

return {
  status: statusData.status,
  last_updated: lastUpdated,
}

// Frontend: Only announce if file is fresh (< 30 seconds old)
const isFileFresh = Date.now() - status.last_updated < 30000

if (audioSettings.events.ready && isFileFresh && isNewlyReady) {
  playAudio('ready', session)
}
```

**Key Insight:**
- Status files persist across sessions
- "Current" status might be from hours/days ago
- Always gate time-sensitive actions on data freshness
- File mtime is a reliable freshness indicator

**Files:**
- `extension/hooks/useAudioNotifications.ts` - Added last_updated check
- `backend/routes/api.js` - Added last_updated to response

---

## Terminal ID as Fallback for Session Matching

### Lesson: Multiple Terminals Can Share Working Directory (Dec 10, 2025)

**Problem:** When multiple Claude terminals shared the same working directory, their status got confused - both terminals showed the same status.

**What Happened:**
1. Spawned two Claude terminals in `/home/matt/projects/TabzChrome`
2. `useClaudeStatus` polled `/api/claude-status` for each terminal
3. Neither terminal had `sessionName` populated (was `undefined`)
4. Backend fell back to matching by `working_dir` only
5. Returned whichever status file was updated most recently
6. Both terminals got the SAME status

**Key Insight:** For `ctt-` prefixed terminals (Chrome extension), the terminal ID IS the tmux session name:
- Terminal ID: `ctt-opustrator-6acc9833`
- Tmux session: `ctt-opustrator-6acc9833`
- They're identical!

**Solution:** Fall back to terminal ID when sessionName is undefined:

```typescript
// Before (broken):
const sessionParam = terminal.sessionName
  ? `&sessionName=${encodeURIComponent(terminal.sessionName)}`
  : ''  // Sends nothing → backend matches by workingDir only!

// After (fixed):
const effectiveSessionName = terminal.sessionName ||
  (terminal.id?.startsWith('ctt-') ? terminal.id : null)
const sessionParam = effectiveSessionName
  ? `&sessionName=${encodeURIComponent(effectiveSessionName)}`
  : ''
```

**Files:**
- `extension/hooks/useClaudeStatus.ts:84-89` - Fallback to terminal ID
- `backend/routes/api.js:970-986` - Pane ID matching logic

---

## Tmux refresh-client Requires Attached Client

### Lesson: PTY Terminals Aren't "Attached" in Tmux's View (Dec 10, 2025)

**Problem:** "Can't find client" errors in tmux hooks after certain operations.

**What Happened:**
1. `.tmux-terminal-tabs.conf` had hooks that ran `refresh-client`
2. `refresh-client` needs an attached tmux client
3. PTY terminals (xterm.js via WebSocket) aren't "attached" in tmux's view
4. Error: `refresh-client: can't find client`

**Solution:**
```bash
# ❌ BROKEN - no attached client for PTY terminals
set-hook -g after-split-window 'refresh-client -S'

# ✅ CORRECT - send empty keys to trigger redraw without client
set-hook -g after-split-window 'send-keys ""'

# Or suppress errors:
set-hook -g after-split-window 'run-shell "tmux refresh-client -S 2>/dev/null || true"'
```

**Key Insight:**
- Tmux "clients" are terminal emulators attached via `tmux attach`
- PTY connections via node-pty are NOT tmux clients
- Use `send-keys ""` to trigger redraw without requiring attached client

**Files:**
- `.tmux-terminal-tabs.conf` - Updated hooks
- `backend/routes/api.js` - Changed refresh-client to send-keys

---

## Polling State and UI Flicker

### Lesson: Debounce Polled State Changes (Dec 7, 2025)

**Problem:** Claude status tabs were flashing between showing status and showing name.

**What Happened:**
1. `useClaudeStatus` hook polled every 2 seconds
2. Each poll created a new Map and replaced the old one
3. If API briefly returned `unknown` (during tool execution), terminal disappeared from map
4. Tab instantly switched from "🤖 🔧 Read: file.tsx" to "Bash"
5. Next poll returned valid status, tab switched back

**Root Cause:** Replacing entire state on every poll. Any transient failure caused immediate UI change.

**Solution:** Use a "miss counter" with threshold before removing entries:
```typescript
const MISS_THRESHOLD = 3  // 3 polls × 2s = 6 seconds grace

const missCountsRef = useRef<Map<string, number>>(new Map())

// In poll callback:
if (result.success && result.status !== 'unknown') {
  missCountsRef.current.set(id, 0)  // Reset on success
  newStatuses.set(id, result.status)
} else {
  const misses = (missCountsRef.current.get(id) || 0) + 1
  missCountsRef.current.set(id, misses)

  // Keep previous status until threshold exceeded
  if (misses < MISS_THRESHOLD && prevStatuses.has(id)) {
    newStatuses.set(id, prevStatuses.get(id)!)
  }
}
```

**Key Insight:**
- Transient failures are normal in polling systems
- Don't immediately reflect failures in UI - add grace period
- Use refs for counters (don't trigger re-renders for tracking state)

**Files:**
- `extension/hooks/useClaudeStatus.ts:41-120`

---

## Chat Input & Tmux Session Targets

### Lesson: Tmux Session Names Are Sufficient Targets (Dec 8, 2025)

**Problem:** Chat messages sent to plain bash terminals "disappeared into the void" - never appeared in terminal.

**What Happened:**
1. User types message in chat input for bash terminal
2. Frontend sends `TMUX_SESSION_SEND` with `sessionName: "ctt-defaultbash-a559de93"`
3. Backend constructs target as `${sessionName}:0.0` → `ctt-defaultbash-a559de93:0.0`
4. Runs `tmux send-keys -t ctt-defaultbash-a559de93:0.0 -l "test"`
5. Tmux error: `can't find window: 0`
6. Message silently lost

**Root Cause:** The `:0.0` suffix assumes window 0, pane 0 exists. But tmux sessions may:
- Have `base-index` set to 1 (windows start at 1, not 0)
- Have different window numbering due to config
- Only have the active window/pane

**Solution:**
```javascript
// ❌ BROKEN - assumes window 0 exists
const target = `${sessionName}:0.0`;
spawnSync('tmux', ['send-keys', '-t', target, '-l', text]);

// ✅ CORRECT - let tmux use current/active window
const target = sessionName;
spawnSync('tmux', ['send-keys', '-t', target, '-l', text]);
```

**Verification:**
```bash
# This FAILS if base-index=1:
tmux send-keys -t ctt-bash-abc123:0.0 -l "test"
# Error: can't find window: 0

# This ALWAYS WORKS:
tmux send-keys -t ctt-bash-abc123 -l "test"
# Success - sends to current window/pane
```

**Files:**
- `backend/server.js:325-328` - Removed `:0.0` suffix from tmux target

---

**Last Updated:** December 13, 2025
