# Terminal Buttons Demo

This document demonstrates the `tabz:` link protocol for creating interactive terminal buttons in markdown files viewed in the TabzChrome dashboard.

---

## Spawn Actions (Green Buttons)

Spawn new terminal tabs. Uses your default profile's theme settings automatically.

### Simple Commands (uses default profile theme)

[Run npm test](tabz:spawn?cmd=npm%20test&name=Tests)

[Start Dev Server](tabz:spawn?cmd=npm%20run%20dev&name=Dev%20Server)

[Open htop](tabz:spawn?cmd=htop&name=System%20Monitor)

[Git Status](tabz:spawn?cmd=git%20status)

### Spawn in Specific Directory

[Terminal in ~/projects](tabz:spawn?dir=~/projects&name=Projects)

[Claude in TabzChrome](tabz:spawn?cmd=claude&dir=~/projects/TabzChrome&name=TabzChrome%20Claude)

### Spawn by Profile Name (optional)

Use `profile=` to spawn with a specific profile's settings:

[Launch Claude Code](tabz:spawn?profile=claude%20code)

[Launch TFE](tabz:spawn?profile=tfe)

---

## Queue to Chat (Blue Buttons)

Queue text to the chat input. User selects which terminal to send to.

[Queue: git status](tabz:queue?text=git%20status)

[Queue: npm run build](tabz:queue?text=npm%20run%20build)

[Queue: List files](tabz:queue?text=ls%20-la)

### Multi-line Prompts

[Ask Claude to explain](tabz:queue?text=Explain%20what%20this%20project%20does%20and%20how%20it%27s%20structured)

---

## Paste to Active Terminal (Orange Buttons)

Paste directly into the currently active terminal tab.

[Paste: pwd](tabz:paste?text=pwd)

[Paste: clear](tabz:paste?text=clear)

[Paste: git diff](tabz:paste?text=git%20diff)

---

## Combined Examples

A typical workflow might look like:

1. [Start a Claude session](tabz:spawn?profile=claude%20code)
2. [Queue a prompt](tabz:queue?text=Help%20me%20understand%20this%20codebase)
3. [Check git status](tabz:paste?text=git%20status)

---

## URL Format Reference

| Action | Format | Description |
|--------|--------|-------------|
| Spawn command | `tabz:spawn?cmd=xxx` | Run command (uses default profile theme) |
| Spawn with name | `tabz:spawn?cmd=xxx&name=Tab%20Name` | Run command with custom tab name |
| Spawn in directory | `tabz:spawn?cmd=xxx&dir=~/path` | Run command in specific directory |
| Spawn profile | `tabz:spawn?profile=name` | Launch a saved profile by name |
| Queue to chat | `tabz:queue?text=xxx` | Put text in chat input |
| Paste to terminal | `tabz:paste?text=xxx` | Paste into active terminal |

**Parameters for spawn:**
- `cmd` - Command to run (optional)
- `name` - Tab display name (optional, defaults to "Terminal")
- `dir` - Working directory (optional)
- `profile` - Profile name to use (optional, uses default if not specified)

**Note:** URL-encode special characters:
- Space: `%20`
- Newline: `%0A`
- Ampersand: `%26`
