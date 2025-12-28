import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { Terminal, Clock, Settings, Plus } from 'lucide-react'
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '../components/ui/command'
import { Badge } from '../components/ui/badge'
import { Separator } from '../components/ui/separator'
import { getLocal, SyncedSession, getActiveSessionCount } from '../shared/storage'
import { sendMessage } from '../shared/messaging'
import { formatTimestamp } from '../shared/utils'
import type { Profile } from '../components/SettingsModal'
import '../styles/globals.css'

// Helper to derive an icon from profile name/themeName
function getProfileIcon(profile: Profile): string {
  const name = profile.name.toLowerCase()
  const theme = (profile.themeName || '').toLowerCase()

  // Map common profile names to icons
  if (name.includes('default')) return '\uD83D\uDCBB' // computer
  if (name.includes('project')) return '\uD83D\uDCC1' // folder
  if (name.includes('log')) return '\uD83D\uDCDC' // scroll
  if (name.includes('git') || name.includes('lazygit')) return '\uD83C\uDF3F' // herb
  if (name.includes('vim') || name.includes('nvim')) return '\u270F\uFE0F' // pencil
  if (name.includes('htop') || name.includes('monitor')) return '\uD83D\uDCCA' // chart
  if (name.includes('large')) return '\uD83D\uDD0D' // magnifying glass

  // Map theme names to icons
  if (theme.includes('dracula')) return '\uD83E\uDDDB' // vampire
  if (theme.includes('matrix')) return '\uD83E\uDE9E' // lotus (close to matrix green)
  if (theme.includes('ocean')) return '\uD83C\uDF0A' // wave

  return '\u2699\uFE0F' // gear (default)
}

function ExtensionPopup() {
  const [recentSessions, setRecentSessions] = useState<SyncedSession[]>([])
  const [activeSessionCount, setActiveSessionCount] = useState(0)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [searchValue, setSearchValue] = useState('')

  useEffect(() => {
    // Clear old active sessions from storage (reset to 0)
    chrome.storage.local.set({ activeSessions: [] })

    // Load recent sessions from storage
    getLocal(['recentSessions']).then(({ recentSessions }) => {
      setRecentSessions(recentSessions || [])
    })

    // Get active session count (should be 0 after clear)
    getActiveSessionCount().then(count => {
      setActiveSessionCount(count)
    })

    // Load profiles from Chrome storage (or profiles.json on first run)
    chrome.storage.local.get(['profiles'], async (result) => {
      if (result.profiles && Array.isArray(result.profiles) && result.profiles.length > 0) {
        setProfiles(result.profiles)
      } else {
        // Initialize profiles from profiles.json on first load
        try {
          const url = chrome.runtime.getURL('profiles.json')
          const response = await fetch(url)
          const data = await response.json()
          setProfiles(data.profiles || [])
          // Save to storage so they persist
          chrome.storage.local.set({
            profiles: data.profiles,
            defaultProfile: data.defaultProfile || 'default'
          })
        } catch (error) {
          console.error('[Popup] Failed to load default profiles:', error)
        }
      }
    })
  }, [])

  const handleSessionSelect = (sessionName: string) => {
    sendMessage({
      type: 'OPEN_SESSION',
      sessionName,
    })
    window.close() // Close popup
  }

  const handleSpawn = (profile: Profile) => {
    sendMessage({
      type: 'SPAWN_TERMINAL',
      profile: profile,
      command: profile.command,
    })
    window.close()
  }

  const handleOpenSettings = async () => {
    // TODO: Create options page
    // For now, just open side panel
    try {
      // Get the browser window (not the popup) by getting the last focused window
      // Popups themselves have windowId -1, so we need the actual browser window
      const windows = await chrome.windows.getAll({ windowTypes: ['normal'] })
      const lastFocused = windows.find(w => w.focused) || windows[0]

      if (lastFocused?.id) {
        await chrome.sidePanel.open({ windowId: lastFocused.id })
        window.close()
      }
    } catch (error) {
      // Side panel may fail to open in some contexts - silently ignore
    }
  }

  const handleOpenSidePanel = async () => {
    try {
      // Get the browser window (not the popup) by getting the last focused window
      // Popups themselves have windowId -1, so we need the actual browser window
      const windows = await chrome.windows.getAll({ windowTypes: ['normal'] })
      const lastFocused = windows.find(w => w.focused) || windows[0]

      if (lastFocused?.id) {
        await chrome.sidePanel.open({ windowId: lastFocused.id })
        window.close()
      }
    } catch (error) {
      // Side panel may fail to open in some contexts - silently ignore
    }
  }

  // Filter profiles based on search
  const filteredProfiles = profiles.filter(profile =>
    profile.name.toLowerCase().includes(searchValue.toLowerCase()) ||
    (profile.command && profile.command.toLowerCase().includes(searchValue.toLowerCase())) ||
    (profile.category && profile.category.toLowerCase().includes(searchValue.toLowerCase()))
  )

  const filteredRecentSessions = recentSessions.filter(session =>
    session.name.toLowerCase().includes(searchValue.toLowerCase())
  )

  return (
    <div className="w-[400px] h-[500px] bg-background text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Terminal className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Terminal Tabs</h1>
        </div>
        <div className="flex items-center gap-2">
          {activeSessionCount > 0 && (
            <Badge variant="secondary">
              {activeSessionCount} active
            </Badge>
          )}
          <button
            onClick={handleOpenSettings}
            className="p-2 hover:bg-accent rounded-md transition-colors"
            title="Settings"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Command Palette */}
      <Command className="rounded-none border-0">
        <CommandInput
          placeholder="Search sessions or spawn new terminal..."
          value={searchValue}
          onValueChange={setSearchValue}
        />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          {/* Recent Sessions */}
          {filteredRecentSessions.length > 0 && (
            <>
              <CommandGroup heading="Recent Sessions">
                {filteredRecentSessions.map(session => (
                  <CommandItem
                    key={session.name}
                    value={session.name}
                    onSelect={() => handleSessionSelect(session.name)}
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    <div className="flex-1">
                      <div className="font-medium">{session.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {session.workingDir} • {formatTimestamp(session.lastActive)}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {/* Quick Spawn */}
          <CommandGroup heading="Quick Spawn">
            <CommandItem
              value="open-side-panel"
              onSelect={handleOpenSidePanel}
            >
              <Plus className="mr-2 h-4 w-4" />
              <div className="flex-1">
                <div className="font-medium">Open Side Panel</div>
                <div className="text-xs text-muted-foreground">
                  Full terminal interface in side panel
                </div>
              </div>
            </CommandItem>

            {filteredProfiles.slice(0, 8).map(profile => (
              <CommandItem
                key={profile.id}
                value={profile.name}
                onSelect={() => handleSpawn(profile)}
              >
                <span className="mr-2 text-lg">{getProfileIcon(profile)}</span>
                <div className="flex-1">
                  <div className="font-medium">{profile.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {profile.command || profile.workingDir || 'Default bash terminal'}
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-2 border-t bg-background">
        <div className="text-xs text-center text-muted-foreground">
          Click the extension icon or use context menu
        </div>
      </div>
    </div>
  )
}

// Mount the popup
ReactDOM.createRoot(document.getElementById('popup-root')!).render(
  <React.StrictMode>
    <ExtensionPopup />
  </React.StrictMode>
)
