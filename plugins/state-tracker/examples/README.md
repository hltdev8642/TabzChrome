# Statusline for Context Window Display

TabzChrome can display context window percentage on Claude terminal tabs. This requires a StatusLine hook that writes context data.

## Quick Setup

1. Copy the example statusline to your hooks directory:
   ```bash
   cp examples/statusline-with-context.sh ~/.claude/hooks/statusline-script.sh
   chmod +x ~/.claude/hooks/statusline-script.sh
   ```

2. Enable it in Claude Code:
   ```bash
   claude config set hooks.StatusLine.command '~/.claude/hooks/statusline-script.sh'
   ```

   Or run `/statusline` in Claude Code and select "Custom script".

## For Custom Statuslines

If you already have a custom statusline, add these sections to enable context % display:

### 1. Extract session_id from input

```bash
# At the top, read session_id from Claude's input
session_id=$(echo "$input" | jq -r '.session_id // ""')
```

### 2. Write context file

```bash
# Extract and write context window data
context_window=$(echo "$input" | jq -c '.context_window // null')
current_usage=$(echo "$input" | jq -c '.context_window.current_usage // null')

if [ "$context_window" != "null" ] && [ -n "$session_id" ]; then
    CONTEXT_FILE="/tmp/claude-code-state/${session_id}-context.json"

    # Calculate context percentage
    context_pct=""
    context_window_size=$(echo "$context_window" | jq -r '.context_window_size // 0')

    if [ "$current_usage" != "null" ]; then
        input_tokens=$(echo "$current_usage" | jq -r '.input_tokens // 0')
        cache_creation=$(echo "$current_usage" | jq -r '.cache_creation_input_tokens // 0')
        cache_read=$(echo "$current_usage" | jq -r '.cache_read_input_tokens // 0')
        total_tokens=$((input_tokens + cache_creation + cache_read))

        if [ "$context_window_size" -gt 0 ]; then
            context_pct=$((total_tokens * 100 / context_window_size))
        fi
    fi

    # Write context file
    mkdir -p /tmp/claude-code-state
    echo "$input" | jq -c "{
        session_id: .session_id,
        context_window: .context_window,
        context_pct: ${context_pct:-null},
        timestamp: now | todateiso8601
    }" > "$CONTEXT_FILE" 2>/dev/null
fi
```

### 3. Link session ID to state file

```bash
# Update state file with claude_session_id for TabzChrome to find context data
STATE_FILE="/tmp/claude-code-state/${SESSION_ID}.json"  # SESSION_ID from pane/dir hash

if [ -f "$STATE_FILE" ] && [ -n "$session_id" ]; then
    jq --arg sid "$session_id" '.claude_session_id = $sid' "$STATE_FILE" > "${STATE_FILE}.tmp" 2>/dev/null && mv "${STATE_FILE}.tmp" "$STATE_FILE"
fi
```

## How It Works

1. **state-tracker plugin** writes status/tool info to `/tmp/claude-code-state/{pane_id}.json`
2. **StatusLine hook** writes context data to `/tmp/claude-code-state/{session_id}-context.json`
3. **StatusLine hook** links them by adding `claude_session_id` to the state file
4. **TabzChrome backend** reads both files and merges context_pct into the API response
5. **TabzChrome tabs** display the colored percentage

## Color Thresholds

The example statusline uses these thresholds (matching TabzChrome tabs):

| Context % | Color  |
|-----------|--------|
| 0-49%     | Green  |
| 50-74%    | Yellow |
| 75%+      | Red    |
