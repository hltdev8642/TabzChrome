#!/bin/bash
# match-skills.sh - Single source of truth for issue-to-skill matching
#
# Usage:
#   source ${CLAUDE_PLUGIN_ROOT}/scripts/match-skills.sh
#   SKILLS=$(match_skills "terminal resize buffer")
#
# Or as standalone:
#   ./match-skills.sh "terminal resize buffer"
#   ./match-skills.sh --json "terminal resize buffer"
#
# Returns natural trigger language that activates skills in Claude prompts.
# Based on TabzChrome-dhz: consolidating skill mappings from 6 locations.

# ============================================================================
# SKILL MAPPINGS - Single Source of Truth
# ============================================================================
# Format: keyword_pattern|skill_trigger_text
# Pattern uses bash regex (extended)
# Add new mappings here - all skills/commands reference this file

SKILL_MAPPINGS=(
  # Terminal / xterm.js
  "terminal|xterm|pty|resize|buffer|fitaddon|websocket.*terminal|Use the xterm-js skill for terminal rendering and resize handling."

  # UI / Frontend
  "ui|component|modal|dashboard|styling|tailwind|shadcn|form|button|Use the ui-styling skill for shadcn/ui components and Tailwind CSS."

  # Backend / API
  "backend|api|server|database|endpoint|express|websocket.*server|Use the backend-development skill for API and server patterns."

  # Browser automation / MCP
  "browser|screenshot|click|mcp|tabz|automation|Use MCP browser automation tools (tabz_*) for testing and interaction."

  # Authentication
  "auth|login|oauth|session|token|jwt|Use the better-auth skill for authentication patterns."

  # Plugin development
  "plugin|skill|agent|hook|command|frontmatter|Use the plugin-dev skills for plugin/skill/agent structure."

  # Conductor / orchestration
  "prompt|worker|swarm|conductor|orchestrat|Follow conductor orchestration patterns."

  # Audio / TTS
  "audio|tts|speech|sound|voice|speak|Use the ai-multimodal skill for audio processing."

  # Media processing
  "image|video|media|ffmpeg|imagemagick|Use the media-processing skill for multimedia handling."

  # 3D / Three.js
  "3d|three|scene|focus.*mode|webgl|Reference extension/3d/ for Three.js and React Three Fiber patterns."

  # Chrome extension
  "chrome|extension|manifest|sidepanel|background|service.*worker|Reference CLAUDE.md for Chrome extension patterns."

  # Testing
  "test|jest|vitest|spec|coverage|Use standard testing patterns - check existing test files for conventions."
)

# ============================================================================
# LABEL TO SKILL MAPPINGS
# ============================================================================
# Labels on beads issues can also trigger skills

LABEL_MAPPINGS=(
  "xterm|terminal"
  "ui|frontend|styling"
  "backend|api|server"
  "mcp|browser|automation"
  "auth|security"
  "plugin|skill|conductor"
  "audio|media"
)

# ============================================================================
# MATCH FUNCTION
# ============================================================================

match_skills() {
  local INPUT_TEXT="$1"
  local OUTPUT_FORMAT="${2:-text}"  # text or json

  if [ -z "$INPUT_TEXT" ]; then
    return 0
  fi

  # Normalize: lowercase, collapse whitespace
  local NORMALIZED=$(echo "$INPUT_TEXT" | tr '[:upper:]' '[:lower:]' | tr -s '[:space:]' ' ')

  local MATCHED_SKILLS=""
  local MATCHED_JSON="[]"

  for mapping in "${SKILL_MAPPINGS[@]}"; do
    # Split on last |
    local PATTERN="${mapping%|*}"
    local TRIGGER="${mapping##*|}"

    # Convert | to regex alternation
    local REGEX_PATTERN=$(echo "$PATTERN" | sed 's/|/\\|/g')

    # Check if any keyword matches
    if echo "$NORMALIZED" | grep -qE "$PATTERN"; then
      if [ -n "$MATCHED_SKILLS" ]; then
        MATCHED_SKILLS="$MATCHED_SKILLS "
      fi
      MATCHED_SKILLS="$MATCHED_SKILLS$TRIGGER"

      # For JSON output
      local SKILL_NAME=$(echo "$TRIGGER" | grep -oE '[a-z]+-[a-z]+' | head -1)
      [ -z "$SKILL_NAME" ] && SKILL_NAME="general"
      MATCHED_JSON=$(echo "$MATCHED_JSON" | jq --arg skill "$SKILL_NAME" --arg trigger "$TRIGGER" '. + [{"skill": $skill, "trigger": $trigger}]')
    fi
  done

  if [ "$OUTPUT_FORMAT" = "json" ]; then
    echo "$MATCHED_JSON"
  else
    echo "$MATCHED_SKILLS"
  fi
}

# ============================================================================
# MATCH WITH LABELS
# ============================================================================
# Enhanced matching that includes beads issue labels

match_skills_with_labels() {
  local TITLE="$1"
  local DESCRIPTION="$2"
  local LABELS="$3"  # Space-separated list of labels

  # Combine all text sources
  local ALL_TEXT="$TITLE $DESCRIPTION $LABELS"

  match_skills "$ALL_TEXT"
}

# ============================================================================
# GET SKILLS FROM BEADS ISSUE
# ============================================================================
# Extracts skill hints from a beads issue (checks notes first, then matches)

get_issue_skills() {
  local ISSUE_ID="$1"

  # Try to get from notes first (persisted by plan-backlog)
  # bd show returns an array, so use .[0] to get the first element
  local NOTES=$(bd show "$ISSUE_ID" --json 2>/dev/null | jq -r '.[0].notes // ""')
  local PERSISTED_SKILLS=$(echo "$NOTES" | grep -oP 'skills?:\s*\K.*' | head -1)

  if [ -n "$PERSISTED_SKILLS" ]; then
    # Convert comma-separated skill names to trigger text
    for skill in $(echo "$PERSISTED_SKILLS" | tr ',' ' '); do
      skill=$(echo "$skill" | tr -d ' ')
      case "$skill" in
        xterm-js|xterm) echo "Use the xterm-js skill for terminal rendering and resize handling." ;;
        ui-styling|ui) echo "Use the ui-styling skill for shadcn/ui components and Tailwind CSS." ;;
        backend*) echo "Use the backend-development skill for API and server patterns." ;;
        tabz-mcp|mcp|browser) echo "Use MCP browser automation tools (tabz_*) for testing." ;;
        better-auth|auth) echo "Use the better-auth skill for authentication patterns." ;;
        plugin-dev|plugin) echo "Use the plugin-dev skills for plugin/skill/agent structure." ;;
        conductor) echo "Follow conductor orchestration patterns." ;;
        ai-multimodal|audio) echo "Use the ai-multimodal skill for audio processing." ;;
        media-processing|media) echo "Use the media-processing skill for multimedia handling." ;;
        *) echo "Use the $skill skill." ;;
      esac
    done
    return 0
  fi

  # Fall back to matching from issue content
  # bd show returns an array, so use .[0] to get the first element
  local ISSUE_JSON=$(bd show "$ISSUE_ID" --json 2>/dev/null)
  if [ -z "$ISSUE_JSON" ]; then
    return 1
  fi

  local TITLE=$(echo "$ISSUE_JSON" | jq -r '.[0].title // ""')
  local DESC=$(echo "$ISSUE_JSON" | jq -r '.[0].description // ""')
  local LABELS=$(echo "$ISSUE_JSON" | jq -r '.[0].labels[]? // ""' | tr '\n' ' ')

  match_skills_with_labels "$TITLE" "$DESC" "$LABELS"
}

# ============================================================================
# PERSIST SKILLS TO BEADS
# ============================================================================
# Used by plan-backlog to save skill hints

persist_skills_to_issue() {
  local ISSUE_ID="$1"
  local SKILLS="$2"  # Comma-separated skill names (e.g., "xterm-js, ui-styling")

  if [ -z "$ISSUE_ID" ] || [ -z "$SKILLS" ]; then
    return 1
  fi

  # Get existing notes (bd show returns an array)
  local EXISTING_NOTES=$(bd show "$ISSUE_ID" --json 2>/dev/null | jq -r '.[0].notes // ""')

  # Remove any existing skills line
  local CLEAN_NOTES=$(echo "$EXISTING_NOTES" | grep -v '^skills:')

  # Add new skills line
  local NEW_NOTES="${CLEAN_NOTES}
skills: ${SKILLS}"

  # Update issue
  bd update "$ISSUE_ID" --notes "$NEW_NOTES" 2>/dev/null
}

# ============================================================================
# CLI MODE
# ============================================================================

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  # Running as script, not sourced
  case "$1" in
    --help|-h)
      echo "Usage: match-skills.sh [OPTIONS] 'text to match'"
      echo ""
      echo "Options:"
      echo "  --json     Output as JSON array"
      echo "  --issue    Match from beads issue ID"
      echo "  --persist  Persist skills to issue: --persist ISSUE-ID 'skill1, skill2'"
      echo ""
      echo "Examples:"
      echo "  match-skills.sh 'fix terminal resize bug'"
      echo "  match-skills.sh --json 'add dashboard component'"
      echo "  match-skills.sh --issue TabzChrome-abc"
      echo "  match-skills.sh --persist TabzChrome-abc 'xterm-js, ui-styling'"
      ;;
    --json)
      shift
      match_skills "$*" "json"
      ;;
    --issue)
      shift
      get_issue_skills "$1"
      ;;
    --persist)
      shift
      persist_skills_to_issue "$1" "$2"
      ;;
    *)
      match_skills "$*"
      ;;
  esac
fi
