#!/bin/bash
# Combine all ctt-* sessions into tiled splits in one window
#
# Usage: ./combine-ctt-terminals.sh [target-session]
#
# This grabs all TabzChrome terminal sessions (ctt-*) and joins them
# into a single tiled window for easy overview.
#
# Note: join-pane MOVES panes - the original sessions will lose their panes.
# Use with caution or modify to use link-window if you want to keep originals.

TARGET_SESSION="${1:-tabzchrome}"

# Check if target session exists
if ! tmux has-session -t "$TARGET_SESSION" 2>/dev/null; then
  echo "Target session '$TARGET_SESSION' not found. Creating it..."
  tmux new-session -d -s "$TARGET_SESSION"
fi

# Create new window for combined view
tmux new-window -t "$TARGET_SESSION" -n "ctt-all" 2>/dev/null || tmux select-window -t "$TARGET_SESSION:ctt-all"

# Get all ctt-* sessions
CTT_SESSIONS=$(tmux ls -F '#{session_name}' 2>/dev/null | grep '^ctt-')

if [ -z "$CTT_SESSIONS" ]; then
  echo "No ctt-* sessions found"
  exit 0
fi

COUNT=0
for sess in $CTT_SESSIONS; do
  # Join the active pane from each session (no hardcoded pane index)
  if tmux join-pane -s "$sess:" -t "$TARGET_SESSION:ctt-all" -h 2>/dev/null; then
    ((COUNT++))
    echo "Added: $sess"
  else
    echo "Skipped: $sess (may already be joined or empty)"
  fi
done

# Rebalance to tiled layout
tmux select-layout -t "$TARGET_SESSION:ctt-all" tiled

echo "Combined $COUNT ctt-* terminals into $TARGET_SESSION:ctt-all"
