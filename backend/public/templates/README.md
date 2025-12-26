# HTML Templates

Static HTML page templates for building interactive features.

## Available Templates

### `mcp-test/`

Test pages designed with clear, consistent selectors for MCP tool automation.

| File | Size | Purpose |
|------|------|---------|
| `index.html` | 12KB | Hub page with navigation, quick start guide, selector reference |
| `forms.html` | 21KB | Login form, search, multi-step wizard, textarea |
| `buttons.html` | 22KB | Action buttons, toggles, icon buttons, button states |
| `navigation.html` | 24KB | Tabs, dropdowns, modals, pagination, breadcrumbs |
| `data.html` | 23KB | Sortable table, interactive list, product cards, tree view |
| `network.html` | 20KB | API request testing, network capture, request log |
| `CLAUDE-GUIDE.md` | 7KB | Best practices, workflows, selector strategies |

### Key Features

**Consistent Selectors** - Every interactive element has:
- Unique `id` (e.g., `#login-email`, `#btn-primary`)
- `data-testid` attribute for stability
- `data-action` for semantic querying

**Selectors Panel** - Every page has a collapsible panel in the bottom-right showing all available selectors

**State Indicators** - Visual feedback for actions:
- `#login-status` - Login result
- `#click-count` - Button click counter
- `#active-tab` - Current tab
- `#cart-summary` - Shopping cart

### To Test

```bash
# Start backend if not running
cd backend && npm start

# Open in browser via MCP
mcp-cli call tabz/tabz_open_url '{"url": "http://localhost:8129/templates/mcp-test/"}'
```

**Direct URL:** `http://localhost:8129/templates/mcp-test/`

---

## Future Ideas

- **MCP Playground** - Interactive dashboard that calls MCP tools directly:
  - Multi-search (Google, Bing, DuckDuckGo at once)
  - Batch image generation (DALL-E, Midjourney, etc.)
  - Tab management dashboard
  - Bookmark organizer
