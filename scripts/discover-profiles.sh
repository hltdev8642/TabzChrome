#!/bin/bash
# Profile Discovery Script for TabzChrome
# Scans for installed CLI tools and generates importable profiles
#
# Usage: ./scripts/discover-profiles.sh [--json]
#   --json  Output raw JSON (for import), otherwise pretty-prints

set -e

# Color output (disable with NO_COLOR=1)
if [[ -z "$NO_COLOR" ]]; then
  GREEN='\033[0;32m'
  BLUE='\033[0;34m'
  YELLOW='\033[1;33m'
  CYAN='\033[0;36m'
  NC='\033[0m' # No Color
else
  GREEN='' BLUE='' YELLOW='' CYAN='' NC=''
fi

JSON_MODE=false
[[ "$1" == "--json" ]] && JSON_MODE=true

# Tool definitions: command|name|category|startingCommand|icon
TOOLS=(
  # AI CLIs
  "claude|Claude Code|AI Assistants|claude|"
  "codex|OpenAI Codex|AI Assistants|codex|"
  "gemini|Google Gemini|AI Assistants|gemini|"
  "aider|Aider|AI Assistants|aider|"
  "opencode|OpenCode|AI Assistants|opencode|"
  "ollama|Ollama|AI Assistants|ollama run llama2|"
  "gpt|GPT CLI|AI Assistants|gpt|"
  "sgpt|Shell GPT|AI Assistants|sgpt|"

  # TUI Tools
  "lazygit|LazyGit|TUI Tools|lazygit|"
  "htop|htop|TUI Tools|htop|"
  "btop|btop|TUI Tools|btop|"
  "btm|Bottom|TUI Tools|btm|"
  "ranger|Ranger|TUI Tools|ranger|"
  "mc|Midnight Commander|TUI Tools|mc|"
  "ncdu|ncdu|TUI Tools|ncdu|"
  "tig|Tig|TUI Tools|tig|"
  "lazydocker|LazyDocker|TUI Tools|lazydocker|"
  "k9s|K9s|TUI Tools|k9s|"

  # Editors
  "nvim|Neovim|Editors|nvim|"
  "vim|Vim|Editors|vim|"
  "micro|Micro|Editors|micro|"
  "nano|Nano|Editors|nano|"
  "hx|Helix|Editors|hx|"

  # Dev Tools
  "npm|npm (dev server)|Dev Tools|npm run dev|"
  "pnpm|pnpm (dev server)|Dev Tools|pnpm dev|"
  "yarn|yarn (dev server)|Dev Tools|yarn dev|"
  "docker|Docker|Dev Tools||"
  "kubectl|kubectl|Dev Tools||"

  # System
  "tmux|tmux|System||"
  "screen|Screen|System||"
  "ssh|SSH|System||"
)

# Check if command exists
command_exists() {
  command -v "$1" &> /dev/null
}

# Generate a UUID-like ID
generate_id() {
  local name="$1"
  local slug=$(echo "$name" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd 'a-z0-9-')
  echo "${slug}-$(date +%s | tail -c 5)"
}

# Collect found tools
declare -a FOUND_TOOLS=()

for tool_def in "${TOOLS[@]}"; do
  IFS='|' read -r cmd name category starting_cmd icon <<< "$tool_def"

  if command_exists "$cmd"; then
    FOUND_TOOLS+=("$tool_def")
  fi
done

# Output results
if $JSON_MODE; then
  # JSON output for import
  echo "["
  first=true
  for tool_def in "${FOUND_TOOLS[@]}"; do
    IFS='|' read -r cmd name category starting_cmd icon <<< "$tool_def"

    $first || echo ","
    first=false

    cat << JSONEOF
  {
    "id": "$(generate_id "$name")",
    "name": "$name",
    "category": "$category",
    "command": "$starting_cmd",
    "workingDir": "",
    "fontSize": 16,
    "fontFamily": "JetBrains Mono",
    "themeName": "high-contrast",
    "isDark": true
  }
JSONEOF
  done
  echo ""
  echo "]"
else
  # Pretty output
  echo -e "${CYAN}╔════════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║     TabzChrome Profile Discovery Tool      ║${NC}"
  echo -e "${CYAN}╚════════════════════════════════════════════╝${NC}"
  echo ""

  if [[ ${#FOUND_TOOLS[@]} -eq 0 ]]; then
    echo -e "${YELLOW}No recognized CLI tools found.${NC}"
    exit 0
  fi

  echo -e "${GREEN}Found ${#FOUND_TOOLS[@]} CLI tools:${NC}"
  echo ""

  # Group by category
  declare -A CATEGORIES
  for tool_def in "${FOUND_TOOLS[@]}"; do
    IFS='|' read -r cmd name category starting_cmd icon <<< "$tool_def"
    CATEGORIES["$category"]+="$name|$cmd|$starting_cmd\n"
  done

  for category in "${!CATEGORIES[@]}"; do
    echo -e "${BLUE}[$category]${NC}"
    echo -e "${CATEGORIES[$category]}" | while IFS='|' read -r name cmd starting_cmd; do
      [[ -z "$name" ]] && continue
      location=$(which "$cmd" 2>/dev/null || echo "unknown")
      echo -e "  ${GREEN}✓${NC} $name ($cmd)"
      echo -e "    ${CYAN}Path:${NC} $location"
      [[ -n "$starting_cmd" ]] && echo -e "    ${CYAN}Command:${NC} $starting_cmd"
    done
    echo ""
  done

  echo -e "${YELLOW}To generate importable JSON:${NC}"
  echo "  ./scripts/discover-profiles.sh --json > my-profiles.json"
  echo ""
  echo -e "${YELLOW}Then import in TabzChrome:${NC}"
  echo "  Settings (⚙️) → Profiles tab → Import"
fi
