# Tabz Guide Plugin

Progressive disclosure help system for TabzChrome capabilities.

## What It Does

Provides on-demand help organized by topic with progressive disclosure:
- Start with brief answers
- Dive deeper on request with file paths to detailed docs
- Covers: profiles, MCP tools, API, debugging, integration, features

## Installation

This plugin is included in the TabzChrome repository and auto-loads when running Claude Code in the TabzChrome directory.

Alternatively, install from GitHub:
```bash
/plugin marketplace add GGPrompts/TabzChrome
/plugin install
```

## Usage

Ask the skill about any topic:

```
How do I create profiles?
What MCP tools are available?
How do I debug terminal issues?
How do I use the spawn API?
What's new in TabzChrome?
```

The skill provides:
1. **Quick answers** - Brief explanation of the topic
2. **Common tasks** - Step-by-step guides
3. **Deep dive links** - File paths to detailed documentation
4. **Examples** - Code snippets and commands

## Topics Covered

- **Profiles** - Creating, importing, exporting, category management
- **Integration** - Spawn API, custom triggers, GitHub FAB, Claude hooks
- **MCP Tools** - Browser automation, screenshots, downloads, network capture
- **Debugging** - Common issues, autonomous debugging, backend logs
- **API** - REST endpoints, WebSocket messages, authentication
- **Features** - Recent additions (3D Focus, View as Text, context tracking)
- **Advanced** - Terminal rendering patterns, status tracking, ghost badge

## Replaces `/discover-profiles` for Help

While `/discover-profiles` scans your system for CLI tools and generates profile configs, the `tabz-guide` skill is for learning about TabzChrome features and capabilities.

Use:
- `/discover-profiles` - To find TUI tools and create profiles
- `tabz-guide` skill - To learn how TabzChrome works

## Examples

**Get started with profiles:**
```
Use the tabz-guide skill. I want to understand profiles.
```

**Learn about browser automation:**
```
Use the tabz-guide skill. What MCP tools can control the browser?
```

**Debug terminal issues:**
```
Use the tabz-guide skill. My terminal display is corrupted, how do I fix it?
```

**Integrate with a project:**
```
Use the tabz-guide skill. How do I spawn terminals programmatically?
```

## Architecture

- **Progressive disclosure** - Brief → detailed → file paths
- **Topic organization** - 6 main sections with subsections
- **Links to docs** - Points to actual documentation files
- **Command reference** - Quick copy-paste commands

## Files

- `skills/tabz-guide/SKILL.md` - Main skill file (591 lines)

## Sync

Skill exists in two locations (must stay in sync):

| Location | Purpose |
|----------|---------|
| `.claude/skills/tabz-guide/skill.md` | Project-level (Claude reads this) |
| `plugins/tabz-guide/skills/tabz-guide/SKILL.md` | Plugin distribution (for sharing) |

To sync after updates:
```bash
cp .claude/skills/tabz-guide/skill.md plugins/tabz-guide/skills/tabz-guide/SKILL.md
```
