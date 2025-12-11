# Tabz MCP Workflow Patterns

Common multi-step workflows for browser automation tasks.

## Screenshot a Specific Tab

When user wants to capture a tab that isn't currently active:

```bash
# 1. List all tabs to find the target
mcp-cli call tabz/tabz_list_tabs '{}'

# 2. Switch to the target tab (use tabId from step 1)
mcp-cli call tabz/tabz_switch_tab '{"tabId": 123}'

# 3. Take the screenshot
mcp-cli call tabz/tabz_screenshot '{}'

# 4. Display the image (use returned path)
# Use Read tool on the returned file path
```

## Fill and Submit a Form

Automate form completion:

```bash
# 1. Fill each field
mcp-cli call tabz/tabz_fill '{"selector": "#username", "value": "myuser"}'
mcp-cli call tabz/tabz_fill '{"selector": "#password", "value": "mypass"}'

# 2. Click submit
mcp-cli call tabz/tabz_click '{"selector": "button[type=submit]"}'

# 3. Optional: Screenshot the result
mcp-cli call tabz/tabz_screenshot '{}'
```

## Capture and Inspect API Calls

Monitor network requests to understand what APIs a page uses:

```bash
# 1. Enable network capture FIRST (before page makes requests)
mcp-cli call tabz/tabz_enable_network_capture '{}'

# 2. Navigate or interact with the page
# (user interaction or tabz_click/tabz_fill)

# 3. List captured requests
mcp-cli call tabz/tabz_get_network_requests '{}'

# 4. Get specific response body (use requestId from step 3)
mcp-cli call tabz/tabz_get_api_response '{"requestId": "req-abc123"}'
```

## Find Failed API Requests

Debug 4xx/5xx errors:

```bash
# 1. Enable capture
mcp-cli call tabz/tabz_enable_network_capture '{}'

# 2. Reproduce the issue (interact with page)

# 3. Filter for errors (status 400+)
mcp-cli call tabz/tabz_get_network_requests '{"statusMin": 400}'

# 4. Inspect the failed request
mcp-cli call tabz/tabz_get_api_response '{"requestId": "req-xyz789"}'
```

## Debug Page Errors

Investigate JavaScript errors:

```bash
# 1. Get console errors
mcp-cli call tabz/tabz_get_console_logs '{"level": "error"}'

# 2. Execute JS to inspect state
mcp-cli call tabz/tabz_execute_script '{"code": "window.myApp.state"}'

# 3. Get element details if needed
mcp-cli call tabz/tabz_get_element '{"selector": "#error-container", "includeStyles": true}'
```

## Download Generated Content

For AI tools that generate images (DALL-E, Midjourney, etc.):

```bash
# 1. Fill the prompt
mcp-cli call tabz/tabz_fill '{"selector": "textarea", "value": "a cat astronaut"}'

# 2. Click generate
mcp-cli call tabz/tabz_click '{"selector": "button.generate"}'

# 3. Wait for generation (may need to poll or wait)

# 4. Download the result image
mcp-cli call tabz/tabz_download_image '{"selector": "img.result"}'
```

## Monitor Long-Running Downloads

Track download progress:

```bash
# 1. Start a download
mcp-cli call tabz/tabz_download_file '{"url": "https://example.com/large-file.zip"}'

# 2. Check download status
mcp-cli call tabz/tabz_get_downloads '{}'

# 3. Cancel if needed
mcp-cli call tabz/tabz_cancel_download '{"downloadId": 12345}'
```

## Rename Tabs for Easy Reference

When working with multiple similar tabs:

```bash
# 1. List tabs
mcp-cli call tabz/tabz_list_tabs '{}'

# 2. Rename for clarity (persists by URL)
mcp-cli call tabz/tabz_rename_tab '{"tabId": 123, "name": "Prod Dashboard"}'
mcp-cli call tabz/tabz_rename_tab '{"tabId": 456, "name": "Staging Dashboard"}'

# 3. Now list shows custom names
mcp-cli call tabz/tabz_list_tabs '{}'
```

## Selector Tips

Common CSS selector patterns:

| Pattern | Example | Matches |
|---------|---------|---------|
| ID | `#submit-btn` | `<button id="submit-btn">` |
| Class | `.nav-link` | `<a class="nav-link">` |
| Tag | `textarea` | All `<textarea>` elements |
| Attribute | `input[type="email"]` | `<input type="email">` |
| Descendant | `.form input` | Inputs inside `.form` |
| First match | `button` | First button on page |
| Nth child | `li:nth-child(2)` | Second list item |
| Contains text | `button:contains("Submit")` | Button with "Submit" text |

**Finding selectors:**
1. Use `tabz_get_element` with a broad selector to inspect structure
2. Right-click in Chrome DevTools > Copy > Copy selector
3. Use `tabz_execute_script` to query: `document.querySelectorAll('.my-class').length`
