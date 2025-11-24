# Browser MCP Tools Reference

Quick reference for the browser MCP tools available to Claude Code.

## Tools Overview

| Tool | Trigger Words | Description |
|------|---------------|-------------|
| `browser_get_page_info` | "what page", "current tab", "what site", "looking at", "URL" | Get the current page's URL, title, and tab ID |
| `browser_get_console_logs` | "console logs", "errors", "warnings", "debug", "browser logs" | Retrieve console output from browser tabs |
| `browser_execute_script` | "run script", "execute", "DOM", "get element", "page data" | Execute JavaScript in the browser tab |
| `browser_screenshot` | "screenshot", "capture page", "take picture", "save screen" | Capture screenshots to local disk |
| `browser_download_image` | "download image", "save image", "get picture" | Download images from pages to local disk |
| `browser_list_tabs` | "list tabs", "what tabs", "open tabs", "show tabs" | List all open browser tabs |
| `browser_switch_tab` | "switch tab", "go to tab", "change tab" | Switch to a specific tab |
| `browser_click` | "click", "press button", "click element" | Click an element on the page |
| `browser_fill` | "fill", "type", "enter text", "fill form" | Fill an input field with text |
| `browser_get_element` | "inspect element", "get styles", "element info", "css debug" | Get element HTML, styles, bounds for CSS debugging/recreation |

---

## browser_get_page_info

**Purpose:** Get information about the current browser page.

**Trigger phrases:**
- "What page am I looking at?"
- "What's the current URL?"
- "What tab is open?"
- "What site am I on?"

**Parameters:**
- `tabId` (optional): Specific tab ID to query. Defaults to active tab.
- `response_format`: `markdown` (default) or `json`

**Returns:**
- `url`: Full URL of the page
- `title`: Page title
- `tabId`: Chrome tab identifier
- `favIconUrl`: Favicon URL

---

## browser_get_console_logs

**Purpose:** Get console output (log, warn, error, info, debug) from browser tabs.

**Trigger phrases:**
- "Show me the console logs"
- "Are there any errors in the browser?"
- "Check for JavaScript errors"
- "What's in the console?"
- "Debug the page"

**Parameters:**
- `level`: Filter by level - `all`, `log`, `info`, `warn`, `error`, `debug`
- `limit`: Max entries to return (1-1000, default: 100)
- `since`: Only logs after this timestamp (ms since epoch)
- `tabId`: Filter by specific tab ID
- `response_format`: `markdown` (default) or `json`

**Returns:**
- List of console entries with timestamp, level, message, source URL
- Stack traces for errors

---

## browser_execute_script

**Purpose:** Execute JavaScript code in the browser tab.

**Trigger phrases:**
- "Run this script in the browser"
- "Get the page title"
- "Click the button"
- "Extract data from the page"
- "Check if element exists"
- "Get the DOM"

**Parameters:**
- `code` (required): JavaScript code to execute
- `tabId` (optional): Target tab ID. Defaults to active tab.
- `allFrames` (optional): Run in all iframes too (default: false)

**Returns:**
- `success`: boolean
- `result`: Return value of the script
- `error`: Error message if failed

**Common Examples:**
```javascript
// Get page title
document.title

// Get all links
[...document.links].map(a => a.href)

// Check if logged in
!!document.querySelector('.user-avatar')

// Get form value
document.querySelector('input#email').value

// Click a button
document.querySelector('button.submit').click()

// Get localStorage
JSON.stringify(localStorage)
```

---

## browser_screenshot

**Purpose:** Capture a screenshot of the browser page and save to local disk.

**Trigger phrases:**
- "Take a screenshot of this page"
- "Capture the screen"
- "Save a picture of the page"
- "Screenshot the element"

**Parameters:**
- `selector` (optional): CSS selector for a specific element to screenshot
- `fullPage` (optional): If true, captures the entire scrollable page (default: false)
- `outputPath` (optional): Custom save path (default: ~/ai-images/screenshot-{timestamp}.png)

**Returns:**
- `success`: Whether the screenshot was captured
- `filePath`: Path to the saved screenshot (use Read tool to view)

**Examples:**
```javascript
// Capture viewport
{}

// Capture full page
{ fullPage: true }

// Capture specific element
{ selector: "#main-content" }

// Custom output path
{ outputPath: "/tmp/screenshot.png" }
```

---

## browser_download_image

**Purpose:** Download an image from the browser page and save to local disk.

**Trigger phrases:**
- "Download that image"
- "Save the image"
- "Get the picture from the page"

**Parameters:**
- `selector` (optional): CSS selector for an `<img>` element or element with background-image
- `url` (optional): Direct URL of the image to download
- `outputPath` (optional): Custom save path (default: ~/ai-images/image-{timestamp}.{ext})

**Returns:**
- `success`: Whether the image was downloaded
- `filePath`: Path to the saved image (use Read tool to view)

**Examples:**
```javascript
// Download by selector
{ selector: "img.hero-image" }

// Download by URL
{ url: "https://example.com/image.png" }

// First image on page
{ selector: "img" }
```

---

## browser_list_tabs

**Purpose:** List all open browser tabs.

**Trigger phrases:**
- "What tabs are open?"
- "List all tabs"
- "Show me the open tabs"

**Parameters:**
- `response_format`: `markdown` (default) or `json`

**Returns:**
Array of tabs with:
- `tabId`: Numeric ID for use with other tools
- `url`: Full URL of the tab
- `title`: Page title
- `active`: Whether this tab is currently focused

---

## browser_switch_tab

**Purpose:** Switch to a specific browser tab.

**Trigger phrases:**
- "Switch to tab 2"
- "Go to the other tab"
- "Change to that tab"

**Parameters:**
- `tabId` (required): The numeric tab ID to switch to (from browser_list_tabs)

**Returns:**
- `success`: Whether the switch was successful

---

## browser_click

**Purpose:** Click an element on the page.

**Trigger phrases:**
- "Click the submit button"
- "Press the login button"
- "Click on that link"

**Parameters:**
- `selector` (required): CSS selector for the element to click

**Common Selectors:**
```javascript
"#submit-button"        // By ID
".btn-primary"          // By class
"button[type='submit']" // By attribute
"a.nav-link"            // By tag and class
```

**Returns:**
- `success`: Whether the click was performed

---

## browser_fill

**Purpose:** Fill an input field with text.

**Trigger phrases:**
- "Fill in the email field"
- "Type my username"
- "Enter text in the search box"

**Parameters:**
- `selector` (required): CSS selector for the input field
- `value` (required): Text to type into the field

**Common Selectors:**
```javascript
"#email"                    // By ID
"input[name='username']"    // By name attribute
"input[type='password']"    // By type
"textarea#message"          // Textarea by ID
```

**Returns:**
- `success`: Whether the fill was performed

---

## browser_get_element

**Purpose:** Get detailed information about a DOM element for CSS debugging or recreation.

**Trigger phrases:**
- "Inspect that element"
- "What styles does this have?"
- "Get the CSS for that card"
- "How is this element styled?"
- "I want to recreate this component"

**Parameters:**
- `selector` (required): CSS selector for the element
- `includeStyles` (optional): Include computed CSS styles (default: true)
- `styleProperties` (optional): Specific CSS properties to extract
- `response_format`: `markdown` (default) or `json`

**Returns:**
- `tagName`: Element tag (div, button, etc.)
- `attributes`: All HTML attributes (class, id, data-*, etc.)
- `bounds`: Position and dimensions (x, y, width, height)
- `styles`: Computed CSS styles grouped by category
- `outerHTML`: Complete HTML including the element
- `html`: Inner HTML content
- `innerText`: Text content (first 500 chars)
- `parentSelector`: Selector hint for parent element
- `childCount`: Number of child elements

**Default Style Categories:**
- **Layout:** display, position, width, height, overflow
- **Spacing:** margin, padding
- **Flexbox:** flex-direction, justify-content, align-items, gap
- **Grid:** grid-template-columns, grid-template-rows
- **Typography:** font-family, font-size, font-weight, color
- **Background:** background-color, background-image
- **Border:** border, border-radius
- **Effects:** box-shadow, opacity, transform, transition

**Examples:**
```javascript
// Inspect a card component
{ selector: ".card" }

// Get button styles
{ selector: "button.primary" }

// Check header layout
{ selector: "#main-header" }

// Just HTML, no styles
{ selector: ".modal", includeStyles: false }

// Specific properties only
{ selector: ".nav", styleProperties: ["display", "flexDirection", "gap"] }
```

**Use Cases:**
- **Debug CSS issues:** Compare expected vs actual computed styles
- **Recreate elements:** Get all HTML + CSS needed to rebuild in another project
- **Understand layout:** See flexbox/grid properties and dimensions
- **Extract design tokens:** Get colors, fonts, spacing from existing components

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         EXTENSION-BASED TOOLS                        │
│         (browser_get_page_info, browser_get_console_logs,           │
│                      browser_execute_script)                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Chrome Browser (Windows)                                            │
│         ↓ console.log, etc.                                          │
│  Content Script → Background Worker → WebSocket → Backend (WSL:8129) │
│                                                          ↓           │
│                                              Browser MCP Server      │
│                                              (Windows node.exe)      │
│                                                          ↓           │
│                                                    Claude Code       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                           CDP-BASED TOOLS                            │
│    (browser_screenshot, browser_click, browser_fill, browser_*_tab, │
│              browser_download_image, browser_get_element)            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Chrome Browser (Windows with --remote-debugging-port=9222)          │
│         ↓                                                            │
│     CDP / WebSocket (localhost:9222)                                 │
│         ↓                                                            │
│  Browser MCP Server (Windows node.exe + puppeteer-core)              │
│         ↓                                                            │
│     Claude Code (WSL2)                                               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Key insight:** The MCP server runs via Windows `node.exe` so it can access Chrome's `localhost:9222` directly. WSL2's localhost is isolated from Windows localhost.

## Requirements

1. **Backend running:** `cd backend && npm start` (in WSL2)
2. **Chrome extension loaded:** Reload at `chrome://extensions`
3. **Chrome with remote debugging:** Start with `--remote-debugging-port=9222`
4. **MCP server deployed to Windows:** See [WSL2_SETUP.md](WSL2_SETUP.md)

## WSL2 Setup (Quick Reference)

The MCP server must run on Windows to access Chrome's CDP. Config in `~/.mcp.json`:

```json
{
  "mcpServers": {
    "browser": {
      "command": "node.exe",
      "args": ["C:\\Users\\<username>\\browser-mcp-dist\\index.js"],
      "env": { "BACKEND_URL": "http://localhost:8129" }
    }
  }
}
```

**Deploy updates:**
```bash
npm run build && cp -r dist/* /mnt/c/Users/<username>/browser-mcp-dist/
```

See [WSL2_SETUP.md](WSL2_SETUP.md) for full setup instructions.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Cannot connect to backend" | Start backend: `cd backend && npm start` |
| "No logs captured" | Open Chrome tabs and interact with pages |
| "Request timed out" | Check Chrome is open with extension installed |
| Tools not showing | Restart Claude Code after configuring `~/.mcp.json` |
| "CDP not available" | Start Chrome with `--remote-debugging-port=9222` |
| "CDP not available" (WSL2) | Ensure MCP server runs via `node.exe`, not WSL `node` |
| "No active page found" | Open a webpage (not chrome:// pages) |
| "Element not found" | Check selector matches an element on the page |
| Screenshots not working | Ensure `~/ai-images/` or `C:\Users\<user>\ai-images\` exists |
| MCP loads but tools fail | Sync both `~/.mcp.json` AND `~/.claude/mcp.json` |
