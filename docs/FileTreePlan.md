# Files Section for TabzChrome Dashboard

## Status: Phase 1 & 2 Complete ✅

**Completed:** 2025-12-22
**Source:** Adapted from Opustrator's FileTree component

## Overview

Add a "Files" section to the dashboard for browsing and viewing files with syntax highlighting, image support, and tab management. Read-only viewing with "Open in Editor" to spawn terminal editors.

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Edit mode | Read-only + "Open in Editor" | Security focused, use terminal editors |
| Split view | Optional 2-pane toggle | For ultrawide screens |
| Working dir | Shared via `useWorkingDirectory` hook | Syncs with Profiles section |
| Syntax highlighting | Basic (Prism.js planned) | Phase 3 enhancement |

## Layout

```
+------------------------------------------------------------------+
| Working Directory: ~/projects/TabzChrome              [Change v]  |
+------------------------------------------------------------------+
|                    |                                              |
| FILE TREE (w-72)   |  [Tab1.tsx] [Tab2.md] [image.png] [x]       |
| +--------------+   |  +----------------------------------------+ |
| | > src        |   |  | [Copy] [Open in Editor]                 | |
| |   App.tsx    |   |  +----------------------------------------+ |
| |   index.ts   |   |  |  1 | import React from 'react'         | |
| | > backend    |   |  |  2 | import { useState } from...       | |
| |   server.js  |   |  |  3 |                                    | |
| | README.md    |   |  |  4 | export function App() {           | |
| +--------------+   |  +----------------------------------------+ |
+------------------------------------------------------------------+
```

## Files Created

| File | Purpose | Status |
|------|---------|--------|
| `extension/dashboard/sections/Files.tsx` | Main section - layout, tabs, viewer | ✅ Done |
| `extension/dashboard/components/files/FileTree.tsx` | Left sidebar tree navigation | ✅ Done |
| `extension/dashboard/App.tsx` | Added "files" to Section type, navItems | ✅ Done |
| `backend/routes/files.js` | Added tilde (~) expansion | ✅ Done |

## Implementation Phases

### Phase 1: Foundation ✅

- [x] Create `Files.tsx` section skeleton
- [x] Register in `App.tsx` (navItems, Section type, renderSection)
- [x] Create `FileTree` component (adapted from Opustrator)
- [x] Tree navigation with expand/collapse
- [x] Search filter
- [x] Show/hide hidden files toggle
- [x] Home/Up/Refresh/Collapse buttons

### Phase 2: File Viewing ✅

- [x] Tab bar for multiple open files
- [x] Close tabs with X button
- [x] Code content display (monospace, scrollable)
- [x] Image viewer for png/jpg/gif/svg/webp
- [x] Copy button for code content
- [x] "Open in Editor" spawns terminal with nano
- [x] Working directory dropdown (shared with Profiles)
- [x] Syncs with `useWorkingDirectory` hook

### Phase 3: Polish (Future)

- [ ] Prism.js syntax highlighting
- [ ] Split view toggle (2-pane mode)
- [ ] Line numbers
- [ ] File size/modified date display
- [ ] Keyboard navigation in tree
- [ ] Context menu (right-click)

## Backend APIs Used

```
GET /api/files/tree?path=X&depth=5&showHidden=false  → FileNode tree
GET /api/files/content?path=X                        → { content, fileName, fileSize }
GET /api/files/image?path=X                          → { dataUri, mimeType, size }
```

**Backend Enhancement:** Added tilde expansion in `/api/files/tree` to support `~` as home directory.

## State Structure

```typescript
// Files.tsx
interface OpenFile {
  id: string
  path: string
  name: string
  content: string | null
  isImage: boolean
  imageDataUri?: string
  loading: boolean
  error?: string
}

const [openFiles, setOpenFiles] = useState<OpenFile[]>([])
const [activeFileId, setActiveFileId] = useState<string | null>(null)

// Shared working directory
const { globalWorkingDir, setGlobalWorkingDir, recentDirs } = useWorkingDirectory()
```

## Open in Editor

```typescript
chrome.runtime?.sendMessage({
  type: 'SPAWN_TERMINAL',
  name: `Edit: ${activeFile.name}`,
  command: `nano "${activeFile.path}"`,
  workingDir: dir,
})
```

## Reference Files

- `extension/dashboard/sections/Profiles.tsx` - Working dir dropdown pattern
- `extension/hooks/useWorkingDirectory.ts` - Shared working directory state
- `backend/routes/files.js` - API endpoints
- `~/projects/opustrator/frontend/src/components/FileTree.tsx` - Original source
