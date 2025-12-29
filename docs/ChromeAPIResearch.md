# Chrome Extension API gaps in TabzChrome MCP tools

The current 47-tool implementation covers **10 Chrome API namespaces**, leaving approximately **25+ additional namespaces** and substantial Chrome DevTools Protocol capabilities unexplored. The highest-impact gaps are in **browsing data access** (history, cookies, sessions) and **CDP methods** for screenshots, device emulation, and network simulation—capabilities that would dramatically expand Claude's ability to assist with research, testing, and automation workflows.

---

## Current implementation baseline

The TabzChrome MCP tools currently implement these namespaces:

| Namespace | Current Tools |
|-----------|---------------|
| chrome.tabs | List, switch, rename, get info |
| chrome.scripting | executeScript, click, fill |
| chrome.tabGroups | List, create, update, add, ungroup |
| chrome.windows | List, create, update, close, tile |
| chrome.system.display | Get displays |
| chrome.downloads | Download, get downloads, cancel |
| chrome.bookmarks | Tree, search, save, create folder, move, delete |
| chrome.webRequest | Network capture, get requests, clear |
| chrome.pageCapture | Save as MHTML |
| chrome.debugger | DOM tree, performance profiling, code coverage |
| TTS | Edge neural voices |

---

## HIGH priority APIs to add

These APIs would significantly enhance Claude's ability to help users with automation, research, and productivity tasks.

### 1. chrome.history — Browsing history access

The history API provides programmatic access to the browser's record of visited pages, enabling powerful research and memory-assistance capabilities.

**Key methods:**
- `search(query)` — Find pages matching text, with time range and max results
- `getVisits(url)` — Get all visits to a specific URL with transition types
- `addUrl()` / `deleteUrl()` / `deleteRange()` — Modify history

**Permission:** `"history"` (triggers user warning)

**Suggested MCP tools:**
| Tool Name | Description |
|-----------|-------------|
| `history_search` | Search browsing history by keyword, date range |
| `history_get_visits` | Get visit details for specific URL |
| `history_recent` | Get most recent N history entries |
| `history_delete` | Remove specific URLs or date ranges |
| `history_analytics` | Analyze browsing patterns, time spent |

**AI automation value:** Claude could help users find "that article I read last week," analyze research patterns, identify frequently visited resources, and provide intelligent suggestions based on browsing behavior.

---

### 2. chrome.cookies — Cookie management

Full programmatic cookie access including HttpOnly cookies that client-side JavaScript cannot read.

**Key methods:**
- `get(details)` / `getAll(filter)` — Retrieve cookies by domain, name, path
- `set(details)` — Create/modify cookies with full control over attributes
- `remove(details)` — Delete specific cookies
- `getAllCookieStores()` — List all cookie stores including incognito

**Permission:** `"cookies"` + host permissions for target domains

**Suggested MCP tools:**
| Tool Name | Description |
|-----------|-------------|
| `cookies_get` | Get specific cookie by name and URL |
| `cookies_list` | List all cookies for a domain |
| `cookies_set` | Create or update a cookie |
| `cookies_delete` | Remove specific cookie |
| `cookies_audit` | List third-party/tracking cookies on current page |

**AI automation value:** Session management across browser restarts, authentication debugging, privacy auditing to identify tracking cookies, and cookie-based testing workflows.

---

### 3. chrome.storage — Extension state persistence

Extension-specific storage that works in service workers, persists across cache clears, and can sync across devices via Chrome account.

**Storage areas:**
- **local** — 10 MB, persistent until extension removed
- **sync** — ~100 KB, synced across user's Chrome instances
- **session** — 10 MB, memory only, cleared on restart

**Key methods:** `get()`, `set()`, `remove()`, `clear()`, `getBytesInUse()`

**Permission:** `"storage"` (no user warning)

**Suggested MCP tools:**
| Tool Name | Description |
|-----------|-------------|
| `storage_get` | Retrieve stored values by key(s) |
| `storage_set` | Store key-value pairs |
| `storage_list` | List all stored keys and sizes |
| `storage_sync_status` | Check sync storage quota usage |

**AI automation value:** Persist Claude conversation context, save user preferences, maintain task queues, store cached API responses—essential infrastructure for stateful automation.

---

### 4. chrome.sessions — Recently closed tabs and cross-device sessions

Access to recently closed tabs/windows and synced sessions from user's other devices.

**Key methods:**
- `getRecentlyClosed()` — Get up to 25 recently closed tabs/windows
- `getDevices()` — Get all devices with synced sessions
- `restore(sessionId)` — Restore closed tab/window with full history

**Permission:** `"sessions"`

**Suggested MCP tools:**
| Tool Name | Description |
|-----------|-------------|
| `sessions_recently_closed` | List recently closed tabs/windows |
| `sessions_restore` | Restore specific closed tab/window |
| `sessions_devices` | List tabs open on other synced devices |
| `sessions_find` | Search across all sessions by title/URL |

**AI automation value:** Help users recover accidentally closed tabs, find content open on their phone, restore complete window sessions for specific workflows.

---

### 5. chrome.topSites — Frequently visited sites

Simple read-only access to the user's most visited sites as displayed on the new tab page.

**Key methods:** `get()` — Returns array of `{url, title}` objects

**Permission:** `"topSites"` (user warning about reading frequent sites)

**Suggested MCP tools:**
| Tool Name | Description |
|-----------|-------------|
| `topsites_list` | Get user's most frequently visited sites |

**AI automation value:** Personalize suggestions, understand user's primary domains of interest, create workflows based on frequently accessed sites.

---

### 6. chrome.search — Programmatic web search

Execute searches using Chrome's default search provider—fully programmatic with no user gesture required.

**Key methods:** `query({text, disposition})` — Execute search in current/new tab

**Permission:** `"search"`

**Suggested MCP tools:**
| Tool Name | Description |
|-----------|-------------|
| `search_web` | Execute web search with query text |
| `search_in_tab` | Search and show results in specific tab |

**AI automation value:** Claude can programmatically trigger searches for research, fact-checking, or context gathering. Limitation: cannot read search results back directly (must combine with tab content extraction).

---

### 7. chrome.sidePanel — Persistent side panel UI

MV3-exclusive API for displaying extension UI in a persistent side panel alongside web content.

**Key methods:**
- `setOptions()` — Configure panel path, enable/disable per-tab
- `open()` — Programmatically open panel (Chrome 116+, requires user gesture)
- `setPanelBehavior()` — Configure action button behavior

**Permission:** `"sidePanel"`

**Suggested MCP tools:**
| Tool Name | Description |
|-----------|-------------|
| `sidepanel_open` | Open side panel (with user gesture context) |
| `sidepanel_configure` | Set panel path and enabled state |

**AI automation value:** Display Claude chat interface persistently alongside browsing, show research notes, present analysis results without disrupting the main page.

---

### 8. chrome.readingList — Reading list management

MV3-exclusive API (Chrome 120+) for managing Chrome's built-in Reading List.

**Key methods:** `addEntry()`, `query()`, `updateEntry()`, `removeEntry()`

**Permission:** `"readingList"`

**Suggested MCP tools:**
| Tool Name | Description |
|-----------|-------------|
| `readinglist_add` | Save URL to reading list |
| `readinglist_list` | Get all reading list entries |
| `readinglist_mark_read` | Mark entry as read/unread |
| `readinglist_remove` | Remove entry |

**AI automation value:** Claude can help curate articles for later reading, track reading progress, build topic-based reading queues that sync across devices.

---

### 9. chrome.notifications — Desktop notifications

Create rich system notifications with templates, action buttons, and progress bars.

**Template types:** basic, image, list, progress

**Key methods:** `create()`, `update()`, `clear()`, `getAll()`

**Permission:** `"notifications"` (user warning)

**Suggested MCP tools:**
| Tool Name | Description |
|-----------|-------------|
| `notification_show` | Display desktop notification |
| `notification_progress` | Show/update progress notification |
| `notification_clear` | Dismiss notification |

**AI automation value:** Alert users when long-running automations complete, display actionable notifications for approve/reject workflows, show reminders for scheduled tasks.

---

### 10. chrome.alarms — Scheduled tasks

Schedule code to run at specific times or intervals, persisting across browser restarts.

**Key methods:** `create()`, `get()`, `getAll()`, `clear()`, `clearAll()`

**Limitations:** Minimum interval 30 seconds, maximum 500 active alarms

**Permission:** `"alarms"`

**Suggested MCP tools:**
| Tool Name | Description |
|-----------|-------------|
| `alarm_create` | Schedule one-time or recurring alarm |
| `alarm_list` | Get all active alarms |
| `alarm_cancel` | Cancel specific alarm |

**AI automation value:** Schedule periodic data syncs, reminders, health checks, or delayed task execution.

---

### 11. CDP methods via chrome.debugger — Critical additions

The Chrome DevTools Protocol offers powerful capabilities beyond current implementation. These represent the highest-impact additions for testing and debugging workflows.

**Page.captureScreenshot** — Screenshot capture

```
Method: Page.captureScreenshot
Params: format (jpeg/png/webp), quality, clip region, captureBeyondViewport
```

**Suggested tool:** `screenshot_capture` — Take screenshot of tab/region

**AI value:** Enable Claude to "see" pages for visual debugging, documentation, or accessibility analysis (especially powerful if combined with vision capabilities).

---

**Emulation domain** — Device and condition simulation

| Method | Purpose |
|--------|---------|
| `setDeviceMetricsOverride` | Emulate mobile viewports |
| `setGeolocationOverride` | Spoof location coordinates |
| `setTimezoneOverride` | Change browser timezone |
| `setUserAgentOverride` | Change user agent string |
| `setEmulatedMedia` | Set print/screen, prefers-color-scheme |
| `setEmulatedVisionDeficiency` | Simulate colorblindness |

**Suggested tools:**
| Tool Name | Description |
|-----------|-------------|
| `emulation_device` | Emulate mobile device viewport |
| `emulation_geolocation` | Set fake geolocation |
| `emulation_network` | Throttle network (3G, offline, etc.) |
| `emulation_accessibility` | Simulate vision deficiencies |

**AI value:** Test responsive designs, verify geolocation features, simulate slow networks—all essential for QA automation.

---

**Network domain** — Network throttling and control

| Method | Purpose |
|--------|---------|
| `emulateNetworkConditions` | Throttle to 3G, 4G, offline |
| `setBlockedURLs` | Block specific resources |
| `clearBrowserCache` | Clear cache programmatically |
| `getResponseBody` | Get response content |

**AI value:** Test app behavior under poor network conditions, block tracking requests during analysis, verify caching behavior.

---

**Input domain** — Reliable synthetic input

| Method | Purpose |
|--------|---------|
| `dispatchKeyEvent` | Simulate keyboard with modifiers |
| `dispatchMouseEvent` | Mouse clicks, movement, wheel |
| `dispatchTouchEvent` | Touch gestures |
| `synthesizeScrollGesture` | Smooth scroll simulation |

**AI value:** More reliable form filling and interaction than DOM events—handles focus, IME, and complex keyboard shortcuts properly.

---

**Runtime.evaluate with console capture** — Enhanced JS execution

```
Events: consoleAPICalled, exceptionThrown
Methods: evaluate with awaitPromise, userGesture flags
```

**AI value:** Execute JavaScript and capture console.log/warn/error output, detect uncaught exceptions, enable bidirectional communication with page scripts.

---

## MEDIUM priority APIs

These are useful but serve more specialized use cases.

### chrome.contextMenus — Right-click menu integration

Create custom items in Chrome's right-click context menu.

**Key insight:** Actions are user-initiated (right-click), so this is primarily for setting up interfaces that users trigger, not for direct AI automation.

**Suggested tool:** `contextmenu_create` — Add menu items that invoke Claude actions

**AI value:** Create "Ask AI about this selection" or "Summarize linked page" context menu items.

---

### chrome.identity — OAuth authentication

Obtain OAuth2 tokens for Google services and launch web auth flows for other providers.

**Complexity:** Requires Google Cloud Console setup, OAuth client registration

**Suggested tools:** `identity_get_token`, `identity_launch_auth_flow`

**AI value:** Access Google Workspace APIs (Drive, Calendar, Gmail) on user's behalf for productivity automation.

---

### chrome.management — Extension management

Query and control installed extensions.

**Key methods:** `getAll()`, `get(id)`, `setEnabled()`, `uninstall()`

**Restriction:** `setEnabled()` requires user gesture

**Suggested tools:** `extensions_list`, `extension_info`, `extension_toggle`

**AI value:** Help users audit installed extensions, identify excessive permissions, manage extension state.

---

### chrome.permissions — Dynamic permission requests

Request additional permissions at runtime instead of install time.

**Key methods:** `request()`, `contains()`, `getAll()`, `remove()`

**Restriction:** `request()` requires user gesture

**AI value:** Progressive permission unlocking, minimal-footprint operations.

---

### chrome.runtime — Messaging and lifecycle

Core API for extension component communication and lifecycle management.

**Key methods:** `sendMessage()`, `connect()`, `getManifest()`, `getPlatformInfo()`, `openOptionsPage()`

**AI value:** Coordinate between popup, content scripts, and service worker; detect platform for adaptive behavior.

---

### chrome.offscreen — Background DOM access (MV3)

Create hidden documents with DOM access when service workers cannot access DOM APIs.

**Use cases:** Clipboard operations, audio playback, DOMParser, Web Workers

**Permission:** `"offscreen"`

**AI value:** Enable clipboard read/write, audio processing, and heavy computation that service workers can't perform.

---

### chrome.action — Toolbar button control

Control extension icon badge, tooltip, popup, and enabled state.

**Key methods:** `setBadgeText()`, `setBadgeBackgroundColor()`, `setIcon()`, `openPopup()` (Chrome 127+)

**AI value:** Display status indicators (unread count, processing state), programmatically open popup.

---

### chrome.declarativeNetRequest — Network request modification

Manifest V3 replacement for webRequest blocking. Uses declarative rules instead of programmatic interception.

**Complexity:** HIGH — requires rule JSON schemas, quota management, static vs. dynamic rulesets

**AI value:** Ad/tracker blocking, HTTPS upgrading, header modification for testing.

---

### chrome.webNavigation — Navigation events

Detailed notifications about navigation request status.

**Events:** `onBeforeNavigate`, `onCommitted`, `onDOMContentLoaded`, `onCompleted`, `onErrorOccurred`, `onHistoryStateUpdated`

**AI value:** Track navigation flow, detect SPA navigation, monitor page load timing.

---

### chrome.idle — Machine idle detection

Detect when user is idle, active, or locked.

**Key methods:** `queryState()`, `setDetectionInterval()`

**AI value:** Auto-save during idle, defer intensive operations to idle time.

---

### chrome.power — Prevent system sleep

Override power management temporarily.

**Key methods:** `requestKeepAwake("display"|"system")`, `releaseKeepAwake()`

**AI value:** Keep screen on during presentations or long downloads.

---

### chrome.privacy — Privacy setting control

Manage Chrome's privacy-affecting features.

**Properties:** `network` (WebRTC, DNS prefetching), `services` (autofill, search suggest), `websites` (third-party cookies)

**AI value:** Privacy-focused automation, parental controls.

---

## LOW priority APIs

These have limited use cases or are primarily user-initiated.

| API | Reason for Low Priority |
|-----|------------------------|
| **chrome.commands** | User keyboard shortcuts—Claude can't invoke, only respond |
| **chrome.omnibox** | Requires user to type keyword first |
| **chrome.fontSettings** | Niche accessibility use case |
| **chrome.i18n** | Internationalization infrastructure, no permission needed |
| **chrome.proxy** | Network proxy configuration—security sensitive |
| **chrome.ttsEngine** | For implementing TTS engines (already have TTS via Edge) |

---

## APIs that are NOT feasible or have restrictions

### Require user gestures (cannot be fully automated)

| API | Method | Restriction |
|-----|--------|-------------|
| chrome.permissions | `request()` | Must be from user click |
| chrome.management | `setEnabled()` | Must be from user click |
| chrome.sidePanel | `open()` | Must be from user gesture |

### ChromeOS only

| API | Platform |
|-----|----------|
| chrome.printing | ChromeOS only |
| chrome.printingMetrics | ChromeOS only |
| chrome.vpnProvider | ChromeOS only |
| chrome.wallpaper | ChromeOS only |
| chrome.enterprise.* | ChromeOS enterprise only |
| chrome.login* | ChromeOS only |
| chrome.runtime.restart() | ChromeOS kiosk only |

### Deprecated or MV2 only

| API | Status |
|-----|--------|
| chrome.browserAction | Replaced by chrome.action in MV3 |
| chrome.pageAction | Replaced by chrome.action in MV3 |
| webRequest blocking | Must use declarativeNetRequest in MV3 |

### Specialized/enterprise

| API | Use Case |
|-----|----------|
| chrome.webAuthenticationProxy | Remote desktop passthrough only |
| chrome.printerProvider | Virtual printer implementations |
| chrome.documentScan | Document scanner integration |
| chrome.certificateProvider | Enterprise certificate management |

---

## Implementation roadmap

Based on value-to-complexity ratio, here's a recommended implementation order:

### Phase 1: High-impact, low complexity

1. **chrome.history** — Easy API, massive value for research workflows
2. **chrome.storage** — Essential infrastructure for stateful automation
3. **chrome.sessions** — Easy API, high user value (restore tabs)
4. **chrome.topSites** — Single method, useful personalization
5. **chrome.search** — Single method, programmatic search
6. **CDP: Page.captureScreenshot** — Critical for visual workflows

### Phase 2: High-impact, medium complexity

7. **chrome.cookies** — Requires host permission management
8. **chrome.notifications** — Platform variations require testing
9. **chrome.alarms** — Enables scheduled automation
10. **CDP: Emulation domain** — Device/network simulation
11. **CDP: Input domain** — Reliable synthetic input
12. **chrome.readingList** — Simple CRUD, Chrome 120+

### Phase 3: Medium-impact, specialized

13. **chrome.sidePanel** — Persistent UI surface
14. **chrome.offscreen** — Background DOM access
15. **chrome.contextMenus** — User-initiated AI triggers
16. **chrome.management** — Extension auditing
17. **CDP: Network throttling** — Testing workflows
18. **chrome.webNavigation** — Navigation monitoring

### Phase 4: Advanced/complex

19. **chrome.declarativeNetRequest** — Complex rule system
20. **chrome.identity** — OAuth complexity
21. **CDP: Fetch domain** — Request interception

---

## Summary of biggest opportunities

The **25+ missing API namespaces** represent substantial untapped potential. The most impactful additions would be:

1. **Browsing data trifecta** (history + cookies + sessions) — Transform Claude into a true research assistant that remembers what users have seen

2. **Screenshot capture via CDP** — Enable visual debugging and documentation workflows, especially powerful with vision capabilities

3. **Device/network emulation via CDP** — Essential for testing responsive designs and application behavior under various conditions

4. **Storage API** — Foundation for persistent, stateful automation that remembers context across sessions

5. **Notifications + alarms** — Enable scheduled automation and user alerting for long-running tasks

These additions would expand the current 47 tools to approximately **70-80 tools**, covering the most valuable Chrome Extension capabilities for AI-assisted browser automation.