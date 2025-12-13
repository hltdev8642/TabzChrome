---
name: xterm-js
description: This skill should be used when working with xterm.js terminal implementations, React-based terminal applications, WebSocket terminal communication, or refactoring terminal-related code. It provides battle-tested patterns, common pitfalls, and debugging strategies learned from building production terminal applications.
---

# xterm.js Best Practices

## Overview

This skill provides comprehensive best practices for building terminal applications with xterm.js, React, and WebSockets. It captures critical patterns discovered through debugging production terminal applications, including state management, WebSocket communication, React hooks integration, and terminal lifecycle management.

## When to Use This Skill

Use this skill when:
- Building or debugging xterm.js terminal implementations
- Integrating xterm.js with React (hooks, state, refs)
- Implementing WebSocket-based terminal I/O
- Managing terminal persistence with tmux or similar backends
- Refactoring terminal-related React components into custom hooks
- Debugging terminal initialization, resize, or rendering issues
- Implementing split terminal layouts or multi-window terminal management
- Working on detach/reattach terminal functionality

## Core Best Practices

### 1. Refs and State Management

**Critical Pattern: Clear Refs When State Changes**

Refs persist across state changes. When clearing state, also clear related refs.

```typescript
// CORRECT - Clear both state AND ref
if (terminal.agentId) {
  clearProcessedAgentId(terminal.agentId)  // Clear ref
}
updateTerminal(id, { agentId: undefined })  // Clear state
```

**Key Insight:**
- State (Zustand/Redux) = what the terminal is
- Refs (useRef) = what we've processed
- When state changes, check if related refs need updating

**Common Scenario:** Detach/reattach workflows where the same agentId returns from backend. Without clearing the ref, the frontend thinks it already processed this agentId and ignores reconnection messages.

See `references/refs-state-patterns.md` for detailed examples.

### 2. WebSocket Message Types

**Critical Pattern: Know Your Destructive Operations**

Backend WebSocket handlers often have different semantics for similar-looking message types:
- `type: 'disconnect'` - Graceful disconnect, keep session alive
- `type: 'close'` - **FORCE CLOSE and KILL session** (destructive!)

```typescript
// WRONG - This KILLS the tmux session!
wsRef.current.send(JSON.stringify({
  type: 'close',
  terminalId: terminal.agentId,
}))

// CORRECT - For detach, use API endpoint only
await fetch(`/api/tmux/detach/${sessionName}`, { method: 'POST' })
// Don't send WebSocket message - let PTY disconnect naturally
```

**Key Insight:** Read backend code to understand what each message type does. "Close" often means "destroy" in WebSocket contexts.

See `references/websocket-patterns.md` for backend routing patterns.

### 3. React Hooks & Refactoring

**Critical Pattern: Identify Shared Refs Before Extracting Hooks**

When extracting custom hooks that manage shared resources:

```typescript
// WRONG - Hook creates its own ref
export function useWebSocketManager(...) {
  const wsRef = useRef<WebSocket | null>(null)  // Creates NEW ref!
}

// RIGHT - Hook uses shared ref from parent
export function useWebSocketManager(
  wsRef: React.MutableRefObject<WebSocket | null>,  // Pass as parameter
  ...
) {
  // Uses parent's ref - all components share same WebSocket
}
```

**Checklist Before Extracting Hooks:**
- [ ] Map out all refs (diagram which components use which refs)
- [ ] Check if ref is used outside the hook
- [ ] If ref is shared -> pass as parameter, don't create internally
- [ ] Test with real usage immediately after extraction

### 4. Terminal Initialization

**Critical Pattern: xterm.js Requires Non-Zero Container Dimensions**

xterm.js cannot initialize on containers with 0x0 dimensions. Use visibility-based hiding, not display:none.

```typescript
// WRONG - Prevents xterm initialization
<div style={{ display: isActive ? 'block' : 'none' }}>
  <Terminal />
</div>

// CORRECT - All terminals get dimensions, use visibility to hide
<div style={{
  position: 'absolute',
  top: 0, left: 0, right: 0, bottom: 0,
  visibility: isActive ? 'visible' : 'hidden',
  zIndex: isActive ? 1 : 0,
}}>
  <Terminal />
</div>
```

**Why This Works:**
- All terminals render with full dimensions (stacked via absolute positioning)
- xterm.js can initialize properly on all terminals
- `visibility: hidden` hides inactive terminals without removing dimensions
- Use `isSelected` prop to trigger refresh when tab becomes active

### 5. Tmux Split Terminals & EOL Conversion

**Critical Pattern: Disable EOL Conversion for Tmux Sessions**

When multiple xterm.js instances share a tmux session (e.g., React split terminals), enabling `convertEol: true` causes output corruption.

**Solution:**
```typescript
const isTmuxSession = !!agent.sessionName || shouldUseTmux;

const xtermOptions = {
  theme: theme.xterm,
  fontSize: savedFontSize,
  cursorBlink: true,
  scrollback: isTmuxSession ? 0 : 10000,

  // CRITICAL: Disable EOL conversion for tmux
  convertEol: !isTmuxSession,  // Only convert for regular shells
  windowsMode: false,          // Ensure UNIX-style line endings
};
```

**Why This Works:**
- **Tmux sessions**: `convertEol: false` -> xterm displays raw PTY output
- **Regular shells**: `convertEol: true` -> xterm converts for Windows compatibility
- Both xterm instances handle tmux output identically -> no corruption

## Resources

### references/

This skill includes detailed reference documentation organized by topic:

- `refs-state-patterns.md` - Ref management patterns and examples
- `websocket-patterns.md` - WebSocket communication and backend routing

Load these references as needed when working on specific aspects of terminal development.
