# Worker Architecture

This document describes the unified worker architecture for parallel issue processing with bd-swarm.

## Overview

```
Worker (vanilla Claude via tmux/TabzChrome)
  ├─> Gets context from `bd show <issue-id>`
  ├─> Receives skill hint in prompt (e.g., "use /xterm-js skill")
  ├─> Invokes skill directly when needed
  └─> Completes with /conductor:worker-done
```

## What Workers ARE

- **Vanilla Claude sessions** spawned via TabzChrome API or direct tmux
- **Same plugin context** as the conductor (all skills available)
- **Skill-aware** - workers receive skill hints in prompts and invoke skills directly
- **Issue-focused** - each worker receives issue context and completes the task

## What Workers are NOT

- **NOT specialized agents** - no worker-frontend.md, worker-backend.md, etc.
- **NOT plugin-isolated** - no `--plugin-dir ./plugins/worker-minimal`
- **NOT subagent invokers** - workers invoke skills directly, not via Task subagents

## Skill Matching

The conductor matches issue keywords to skill hints for worker prompts:

| Issue Keywords | Skill Hint | Purpose |
|----------------|-----------|---------|
| terminal, xterm, PTY, resize | `/xterm-js` | Terminal rendering, resize, WebSocket |
| UI, component, modal, dashboard | `/ui-styling` | shadcn/ui, Tailwind patterns |
| backend, API, server, database | `/backend-development` | Node.js, APIs, databases |
| browser, screenshot, click | `/tabz-mcp` | Browser automation tools |
| auth, login, oauth | `/better-auth` | Authentication patterns |

## Why This Architecture?

1. **Simplicity** - Workers are just Claude sessions, no special configuration
2. **Direct skills** - Workers invoke skills directly, avoiding subagent context overhead
3. **Flexible** - Same worker can handle any issue type with appropriate skill hints
4. **Lean prompts** - File paths as text (not @file), skills invoked on-demand

## Worker Lifecycle

```
1. Spawn      → TabzChrome API or tmux creates session
2. Prompt     → Worker receives issue context + skill hint via tmux send-keys
3. Work       → Worker invokes skill when needed, reads files on-demand
4. Complete   → Worker runs /conductor:worker-done
5. Cleanup    → Session killed, worktree merged/removed
```

## Related Files

| File | Purpose |
|------|---------|
| `commands/bd-swarm.md` | Main swarm workflow |
| `skills/bd-swarm-auto/SKILL.md` | Autonomous backlog processing |
| `commands/plan-backlog.md` | Sprint planning with skill matching |
| `scripts/completion-pipeline.sh` | Cleanup after workers complete |
