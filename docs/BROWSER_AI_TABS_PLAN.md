# Browser & AI Tabs Feature Plan

Add browser tabs and AI chat tabs alongside terminal tabs in the sidebar.

## Goal

Allow users to:
- Send highlighted text to AI web interfaces (Claude, ChatGPT) in sidebar
- Have terminal, browser, and AI tabs in the same unified sidebar
- Use same keyboard shortcuts (Alt+1-9) for all tab types

## Current Architecture (Already Supports This)

```
sessions[] → generic tab array
currentSession → active tab ID
Tab switching → already tab-type agnostic
Context menu → "Send to Terminal" (extend for AI)
```

## Implementation

### 1. Extend Session Type

**File:** `extension/sidepanel/sidepanel.tsx` (line ~11-19)

```typescript
interface Session {
  id: string
  name: string
  type: 'terminal' | 'browser' | 'ai'  // Add discriminator
  active: boolean

  // Terminal-specific
  sessionName?: string
  workingDir?: string
  profile?: Profile

  // Browser/AI-specific
  url?: string
  iconUrl?: string
}
```

### 2. Add Panel Components

**New file:** `extension/components/BrowserPanel.tsx`

```tsx
interface BrowserPanelProps {
  url: string
  onNavigate?: (url: string) => void
}

export function BrowserPanel({ url, onNavigate }: BrowserPanelProps) {
  return (
    <div className="h-full w-full">
      <iframe
        src={url}
        className="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin allow-forms"
      />
    </div>
  )
}
```

**New file:** `extension/components/AIPanel.tsx`

```tsx
// Option A: Embed AI web interface
export function AIPanel({ url }: { url: string }) {
  return <iframe src={url} className="w-full h-full" />
}

// Option B: Custom chat UI hitting API directly
export function AIPanel({ apiKey, model }: AIPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')

  const sendMessage = async () => {
    // Hit Claude/OpenAI API directly
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {messages.map(m => <MessageBubble key={m.id} {...m} />)}
      </div>
      <input value={input} onChange={...} onSubmit={sendMessage} />
    </div>
  )
}
```

### 3. Conditional Rendering in Sidebar

**File:** `extension/sidepanel/sidepanel.tsx` (line ~750-777)

```tsx
{sessions.map(session => (
  <div
    key={session.id}
    style={{ display: session.id === currentSession ? 'block' : 'none' }}
    className="h-full"
  >
    {session.type === 'terminal' && (
      <Terminal
        terminalId={session.id}
        sessionName={session.name}
        fontSize={session.profile?.fontSize}
        pasteCommand={session.id === currentSession ? pasteCommand : null}
      />
    )}
    {session.type === 'browser' && (
      <BrowserPanel url={session.url!} />
    )}
    {session.type === 'ai' && (
      <AIPanel url={session.url!} />
    )}
  </div>
))}
```

### 4. Tab Bar Icons by Type

**File:** `extension/sidepanel/sidepanel.tsx` (tab bar section)

```tsx
import { Terminal as TerminalIcon, Globe, Bot } from 'lucide-react'

// In tab rendering
<div className="flex items-center gap-2">
  {session.type === 'terminal' && <TerminalIcon className="h-4 w-4" />}
  {session.type === 'browser' && <Globe className="h-4 w-4" />}
  {session.type === 'ai' && <Bot className="h-4 w-4" />}
  <span>{session.name}</span>
</div>
```

### 5. Extend Context Menu

**File:** `extension/background/background.ts` (line ~1049)

```typescript
// Create context menus
chrome.contextMenus.create({
  id: 'send-to-terminal',
  title: 'Send to Terminal',
  contexts: ['selection']
})

chrome.contextMenus.create({
  id: 'send-to-ai',
  title: 'Send to AI',
  contexts: ['selection']
})

// Handle clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'send-to-terminal' && info.selectionText) {
    broadcastToClients({
      type: 'PASTE_COMMAND',
      target: 'terminal',
      command: info.selectionText
    })
  }

  if (info.menuItemId === 'send-to-ai' && info.selectionText) {
    broadcastToClients({
      type: 'PASTE_COMMAND',
      target: 'ai',
      command: info.selectionText
    })
  }
})
```

### 6. New Message Types

**File:** `extension/shared/messaging.ts`

```typescript
// Add to ExtensionMessage union
| { type: 'OPEN_BROWSER_TAB'; url: string; name?: string }
| { type: 'OPEN_AI_TAB'; url?: string; name?: string }
| { type: 'PASTE_COMMAND'; target: 'terminal' | 'ai'; command: string }
```

### 7. "New Tab" Menu Options

**File:** `extension/sidepanel/sidepanel.tsx` (new tab button)

```tsx
<DropdownMenu>
  <DropdownMenuTrigger>
    <Plus className="h-4 w-4" />
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem onClick={handleNewTerminal}>
      <TerminalIcon className="h-4 w-4 mr-2" />
      New Terminal
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => handleNewAI('claude')}>
      <Bot className="h-4 w-4 mr-2" />
      Claude
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => handleNewAI('chatgpt')}>
      <Bot className="h-4 w-4 mr-2" />
      ChatGPT
    </DropdownMenuItem>
    <DropdownMenuItem onClick={handleNewBrowser}>
      <Globe className="h-4 w-4 mr-2" />
      Browser Tab
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

## AI Tab URL Options

```typescript
const AI_URLS = {
  claude: 'https://claude.ai/new',
  chatgpt: 'https://chat.openai.com',
  gemini: 'https://gemini.google.com',
  perplexity: 'https://perplexity.ai',
}
```

## Future Enhancements

- [ ] Auto-detect AI tab and inject text directly into input field
- [ ] Custom API-based chat (no iframe, direct API calls)
- [ ] Prompt templates in context menu submenu
- [ ] GGPrompts integration - browse prompts, send to AI tab
- [ ] Share conversation between terminal and AI tabs

## Files to Modify

| File | Changes |
|------|---------|
| `sidepanel.tsx` | Session type, conditional rendering, new tab menu |
| `background.ts` | Context menu options, message routing |
| `messaging.ts` | New message types |
| `components/BrowserPanel.tsx` | New component |
| `components/AIPanel.tsx` | New component |

## Notes

- Same Alt+1-9 tab switching works for all types (already generic)
- Storage persistence already handles arbitrary session objects
- Consider iframe sandbox permissions for AI sites
- Some AI sites may block iframe embedding (need to test)
