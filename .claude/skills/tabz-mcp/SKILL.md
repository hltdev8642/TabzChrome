---
name: tabz-mcp
description: Browser automation via Tabz MCP tools. This skill should be used when working with browser tabs, taking screenshots, clicking elements, filling forms, capturing network requests, or any browser interaction tasks. Provides dynamic tool discovery and common workflow patterns for the tabz MCP server.
---

# Tabz MCP - Browser Automation

## Overview

Control Chrome browser programmatically via the Tabz MCP server. This skill dynamically discovers available tools (never goes stale) and provides workflow patterns for common browser automation tasks.

## Tool Discovery

**Always discover available tools dynamically** - never assume which tools exist:

```bash
# List all available Tabz tools
mcp-cli tools tabz

# Get schema for a specific tool (REQUIRED before calling)
mcp-cli info tabz/<tool_name>

# Search for tools by keyword
mcp-cli grep "screenshot"
```

## Calling Tools

**Mandatory workflow** - always check schema before calling:

```bash
# Step 1: Check schema (REQUIRED)
mcp-cli info tabz/tabz_screenshot

# Step 2: Call with correct parameters
mcp-cli call tabz/tabz_screenshot '{"selector": "#main"}'
```

## Tool Categories

Discover tools by running `mcp-cli tools tabz`. Common categories include:

| Category | Tools Pattern | Purpose |
|----------|---------------|---------|
| Tab Management | `tabz_list_tabs`, `tabz_switch_tab`, `tabz_rename_tab` | Navigate between tabs |
| Page Info | `tabz_get_page_info`, `tabz_get_element` | Inspect page content |
| Interaction | `tabz_click`, `tabz_fill` | Interact with elements |
| Screenshots | `tabz_screenshot*` | Capture page visuals |
| Downloads | `tabz_download*` | Download files/images |
| Network | `tabz_*network*`, `tabz_get_api_response` | Monitor API calls |
| Scripting | `tabz_execute_script`, `tabz_get_console_logs` | Run JS, debug |

## Quick Patterns

**Take a screenshot:**
```bash
mcp-cli call tabz/tabz_screenshot '{}'
```

**Click a button:**
```bash
mcp-cli call tabz/tabz_click '{"selector": "button.submit"}'
```

**Fill a form field:**
```bash
mcp-cli call tabz/tabz_fill '{"selector": "#email", "value": "test@example.com"}'
```

**Switch to a specific tab:**
```bash
# First list tabs to find the ID
mcp-cli call tabz/tabz_list_tabs '{}'
# Then switch
mcp-cli call tabz/tabz_switch_tab '{"tabId": 123}'
```

## Important Notes

1. **Tab targeting**: After `tabz_switch_tab`, all subsequent tools auto-target that tab
2. **Network capture**: Must call `tabz_enable_network_capture` BEFORE the page makes requests
3. **Selectors**: Use CSS selectors - `#id`, `.class`, `button`, `input[type="text"]`
4. **Screenshots**: Return file paths - use Read tool to display images to user

## Resources

For detailed workflow examples and common automation patterns, see:
- `references/workflows.md` - Step-by-step workflows for complex tasks
