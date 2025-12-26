# HTML Templates

Static HTML page templates for building interactive features.

## Available Templates

### `mcp-test/`
Test pages designed with clear, consistent selectors for MCP tool automation.

| File | Purpose |
|------|---------|
| `index.html` | Hub page with navigation |
| `forms.html` | Login, search, multi-step wizard |
| `buttons.html` | Action buttons, toggles, states |
| `navigation.html` | Tabs, dropdowns, modals, pagination |
| `data.html` | Sortable tables, lists, cards |
| `network.html` | API request testing |
| `CLAUDE-GUIDE.md` | Best practices for selectors |

**Key patterns used:**
- Every element has `id`, `data-testid`, and `data-action` attributes
- Inline selector hints shown next to form fields
- Collapsible "Selectors" panel on each page
- Visual state feedback for interactions

**To view:** `http://localhost:8129/templates/mcp-test/`

## Future Ideas

- **MCP Playground** - Interactive dashboard that calls MCP tools directly:
  - Multi-search (Google, Bing, DuckDuckGo at once)
  - Batch image generation (DALL-E, Midjourney, etc.)
  - Tab management dashboard
  - Bookmark organizer
