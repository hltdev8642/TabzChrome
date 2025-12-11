# Profile Discovery Assistant

Scan the user's system for installed CLI tools and help them create TabzChrome profiles.

## Instructions

1. First, open the awesome-tuis reference page so users can discover new tools:

```
Use tabz MCP to open: https://github.com/rothgar/awesome-tuis
```

This page has a comprehensive list of TUI applications they might want to install.

2. Then, scan for installed CLI tools by running these checks:

```bash
# AI CLIs
for cmd in claude codex gemini aider opencode ollama gpt sgpt cursor; do
  command -v $cmd &>/dev/null && echo "✓ $cmd: $(which $cmd)"
done

# TUI Tools
for cmd in lazygit htop btop btm ranger mc ncdu tig lazydocker k9s; do
  command -v $cmd &>/dev/null && echo "✓ $cmd: $(which $cmd)"
done

# Editors
for cmd in nvim vim micro nano hx emacs code; do
  command -v $cmd &>/dev/null && echo "✓ $cmd: $(which $cmd)"
done
```

3. Present the found tools to the user in a clean list, grouped by category:
   - **AI Assistants**: claude, codex, gemini, aider, etc.
   - **TUI Tools**: lazygit, htop, btop, ranger, etc.
   - **Editors**: nvim, vim, micro, helix, etc.
   - **Dev Tools**: docker, kubectl, npm, etc.

4. Ask the user which tools they'd like to create profiles for. Mention they can browse the awesome-tuis page (now open in their browser) to discover more tools to install.

5. For each selected tool, generate a profile JSON with:
   - Sensible `name` (e.g., "Claude Code", "LazyGit")
   - Appropriate `category` for grouping
   - Correct `command` to launch the tool
   - Empty `workingDir` (inherits from header)
   - Good defaults: `fontSize: 16`, `fontFamily: "JetBrains Mono"`, `themeName: "high-contrast"`

6. Output the complete JSON array that can be imported via Settings → Profiles → Import.

## Example Output Format

```json
[
  {
    "id": "claude-code-12345",
    "name": "Claude Code",
    "category": "AI Assistants",
    "command": "claude",
    "workingDir": "",
    "fontSize": 16,
    "fontFamily": "JetBrains Mono",
    "themeName": "high-contrast",
    "isDark": true
  },
  {
    "id": "lazygit-12346",
    "name": "LazyGit",
    "category": "TUI Tools",
    "command": "lazygit",
    "workingDir": "",
    "fontSize": 16,
    "fontFamily": "JetBrains Mono",
    "themeName": "high-contrast",
    "isDark": true
  }
]
```

## Tips for Users

- **AI Assistants** benefit from `--dangerously-skip-permissions` flag for automation
- **TUI Tools** work best with monospace fonts like JetBrains Mono or Fira Code
- Leave `workingDir` empty to inherit from the header dropdown
- Profiles can be customized further in Settings after import

## Useful Resources

Open these with tabz MCP if the user wants to discover more tools:

- **Awesome TUIs**: https://github.com/rothgar/awesome-tuis - Comprehensive list of TUI applications
- **Awesome CLI Apps**: https://github.com/agarrharr/awesome-cli-apps - CLI apps for various tasks
- **Modern Unix**: https://github.com/ibraheemdev/modern-unix - Modern alternatives to common Unix commands
