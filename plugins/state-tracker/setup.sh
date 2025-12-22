#!/bin/bash
# TabzChrome State Tracker - StatusLine Setup
# Enables context % display on terminal tabs

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STATUSLINE_SRC="$SCRIPT_DIR/examples/statusline-with-context.sh"
STATUSLINE_DEST="$HOME/.claude/hooks/statusline-script.sh"
SETTINGS_FILE="$HOME/.claude/settings.json"

echo -e "${BLUE}TabzChrome StatusLine Setup${NC}"
echo ""

# Check source exists
if [ ! -f "$STATUSLINE_SRC" ]; then
    echo -e "${RED}Error: statusline-with-context.sh not found${NC}"
    echo "Expected at: $STATUSLINE_SRC"
    exit 1
fi

# Check for jq (required by statusline script)
if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: jq is required but not installed${NC}"
    echo -e "Install with: ${BLUE}sudo apt install jq${NC} (Linux)"
    echo -e "          or: ${BLUE}brew install jq${NC} (macOS)"
    exit 1
fi

# Create hooks directory
mkdir -p "$HOME/.claude/hooks"

# Copy statusline script
echo -e "${BLUE}Copying statusline script...${NC}"
cp "$STATUSLINE_SRC" "$STATUSLINE_DEST"
chmod +x "$STATUSLINE_DEST"
echo -e "${GREEN}  ✓ Copied to $STATUSLINE_DEST${NC}"

# Update settings.json
echo -e "${BLUE}Updating Claude Code settings...${NC}"

if [ ! -f "$SETTINGS_FILE" ]; then
    # Create minimal settings file
    echo '{}' > "$SETTINGS_FILE"
fi

# Check if settings.json is valid JSON
if ! jq empty "$SETTINGS_FILE" 2>/dev/null; then
    echo -e "${RED}Error: $SETTINGS_FILE is not valid JSON${NC}"
    echo "Please fix the file manually and re-run this script"
    exit 1
fi

# Update statusLine config
TEMP_FILE=$(mktemp)
jq '.statusLine = {"type": "command", "command": "~/.claude/hooks/statusline-script.sh"}' "$SETTINGS_FILE" > "$TEMP_FILE"
mv "$TEMP_FILE" "$SETTINGS_FILE"

echo -e "${GREEN}  ✓ Updated statusLine in settings.json${NC}"

echo ""
echo -e "${GREEN}Setup complete!${NC}"
echo ""
echo -e "${YELLOW}Restart Claude Code for changes to take effect.${NC}"
echo ""
echo "Your statusline will now show:"
echo "  - Directory and git branch"
echo "  - Context % usage (color-coded: green < 50%, yellow < 75%, red 75%+)"
echo "  - Model name with subagent indicators"
echo ""
echo "TabzChrome tabs will also display context % when available."
