# Tmux Prompts & Scripts

Useful tmux commands and scripts for TabzChrome terminal management.

## Scripts

### combine-ctt-terminals.sh
Combines all `ctt-*` sessions into a single tiled window.

```bash
./combine-ctt-terminals.sh              # Uses 'tabzchrome' session
./combine-ctt-terminals.sh my-session   # Uses custom target session
```

**Note:** `join-pane` moves panes - original sessions lose their panes.

## One-liners

### List all TabzChrome terminals
```bash
tmux ls | grep '^ctt-'
```

### Kill all ctt-* sessions
```bash
tmux ls -F '#{session_name}' | grep '^ctt-' | xargs -I{} tmux kill-session -t {}
```

### Capture output from a ctt terminal
```bash
tmux capture-pane -t ctt-claude-abc123:1 -p -S -100
```

### Send command to a ctt terminal
```bash
tmux send-keys -t ctt-claude-abc123:1 "echo hello" Enter
```

## Pane Index Note

If your tmux config uses `pane-base-index 1` (instead of 0), avoid hardcoding pane numbers. Use:
- `$sess:` (no pane = active pane)
- `$sess:{first}` or `$sess:{last}`
- Query: `tmux show-options -gv pane-base-index`
