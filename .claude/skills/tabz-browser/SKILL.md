---
name: tabz-browser
description: "Browser automation via 70 tabz MCP tools. Use when taking screenshots, filling forms, debugging network requests, testing responsive design, or using text-to-speech notifications."
---

# TabzChrome Browser Automation

Control Chrome via MCP tools for screenshots, interaction, debugging, and notifications.

## Quick Start

Use MCPSearch to find and load tools before calling them:
```
MCPSearch("select:mcp__tabz__tabz_screenshot")
```

## Core Workflows

### Screenshot a Page
```
1. mcp__tabz__tabz_list_tabs → get tabId
2. mcp__tabz__tabz_screenshot with tabId → get filePath
3. Read filePath to view
```

### Debug Network/API Issues
```
1. mcp__tabz__tabz_enable_network_capture
2. Trigger the action on page
3. mcp__tabz__tabz_get_network_requests with filter="/api/"
4. mcp__tabz__tabz_get_console_logs for JS errors
```

### Test Responsive Design
```
1. mcp__tabz__tabz_emulate_device with "iPhone 14"
2. mcp__tabz__tabz_screenshot
3. mcp__tabz__tabz_emulate_clear
```

### Fill and Submit Form
```
1. mcp__tabz__tabz_fill with selector and value
2. mcp__tabz__tabz_click on submit button
```

### Notify User (TTS)
```
mcp__tabz__tabz_speak with text="Task complete"
```

## Tool Categories

| Category | Count | Key Tools |
|----------|-------|-----------|
| Screenshots | 2 | screenshot, screenshot_full |
| Interaction | 4 | click, fill, get_element |
| Network | 3 | enable_network_capture, get_network_requests |
| DOM/Debug | 4 | get_dom_tree, get_console_logs |
| Emulation | 6 | emulate_device, emulate_geolocation |
| Audio/TTS | 3 | speak, list_voices, play_audio |
| Tabs | 5 | list_tabs, open_url, switch_tab |
| Cookies | 5 | cookies_get, cookies_list |

## Important Notes

- Always use explicit `tabId` - don't rely on "active" tab
- Tab IDs are large integers (e.g., `1762561083`)
- `tabz_screenshot` cannot capture Chrome sidebar

## References

See `references/` for detailed workflows:
- `screenshot-workflows.md` - Viewport vs full page
- `network-debugging.md` - API request inspection
- `form-automation.md` - Clicks, fills, selectors
- `tts-notifications.md` - Audio feedback patterns
