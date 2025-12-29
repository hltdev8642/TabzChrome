import { sendMessage, type SpawnTerminalMessage, type QueueCommandMessage, type PasteCommandMessage } from '../../shared/messaging'
import type { Profile } from '../../components/settings/types'

// Backend API base URL - extension pages can access localhost directly
const API_BASE = 'http://localhost:8129'

/**
 * Spawn a terminal using Chrome messaging (no auth required from extension pages)
 * Opens in sidebar by default
 */
export async function spawnTerminal(options: {
  name?: string
  command?: string
  workingDir?: string
  profile?: Profile
  pasteOnly?: boolean // If true, paste command without executing
}) {
  const message: SpawnTerminalMessage = {
    type: 'SPAWN_TERMINAL',
    name: options.name || 'Terminal',
    command: options.command,
    workingDir: options.workingDir,
    profile: options.profile,
    useTmux: true,
    pasteOnly: options.pasteOnly,
  }

  return sendMessage(message)
}

/**
 * Spawn a terminal as a popout window
 * Uses REST API + chrome.windows.create (similar to spawnQuickTerminal)
 */
export async function spawnTerminalPopout(options: {
  name?: string
  command?: string
  workingDir?: string
  profile?: Profile
  pasteOnly?: boolean
}): Promise<{ success: boolean; terminalId?: string; error?: string }> {
  try {
    // Get auth token from backend
    const tokenResponse = await fetch(`${API_BASE}/api/auth/token`)
    if (!tokenResponse.ok) {
      return { success: false, error: 'Failed to get auth token - is the backend running?' }
    }
    const { token } = await tokenResponse.json()

    // Spawn the terminal via API
    const spawnResponse = await fetch(`${API_BASE}/api/spawn`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': token
      },
      body: JSON.stringify({
        name: options.name || 'Terminal',
        workingDir: options.workingDir,
        command: options.pasteOnly ? null : (options.command || null),
        profile: options.profile,
      })
    })

    if (!spawnResponse.ok) {
      const err = await spawnResponse.json()
      return { success: false, error: err.error || 'Failed to spawn terminal' }
    }

    const { terminal } = await spawnResponse.json()
    const terminalId = terminal.id

    // Open popout window with the new terminal
    const sidepanelUrl = chrome.runtime.getURL(
      `sidepanel/sidepanel.html?popout=true&terminal=${encodeURIComponent(terminalId)}`
    )

    const newWindow = await chrome.windows.create({
      url: sidepanelUrl,
      type: 'popup',
      width: 700,
      height: 550,
      focused: true
    })

    // Notify sidebar that this terminal is in a popout window
    if (newWindow?.id) {
      chrome.runtime.sendMessage({
        type: 'TERMINAL_POPPED_OUT',
        terminalId,
        windowId: newWindow.id,
      })
    }

    // If pasteOnly, send the command to be pasted after terminal is ready
    if (options.pasteOnly && options.command) {
      // Brief delay to allow terminal to initialize
      setTimeout(async () => {
        try {
          await fetch(`${API_BASE}/api/terminals/${encodeURIComponent(terminalId)}/paste`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Auth-Token': token
            },
            body: JSON.stringify({ text: options.command })
          })
        } catch (e) {
          console.warn('[Dashboard] Failed to paste command to popout:', e)
        }
      }, 500)
    }

    return { success: true, terminalId }
  } catch (err) {
    console.error('[Dashboard] Failed to spawn popout terminal:', err)
    return { success: false, error: (err as Error).message }
  }
}

/**
 * Fetch profiles from Chrome storage (extension has direct access)
 */
export async function getProfiles(): Promise<Profile[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['profiles'], (result: { profiles?: Profile[] }) => {
      resolve(result.profiles || [])
    })
  })
}

/**
 * Fetch health data from backend (extension can access localhost without auth)
 */
export async function getHealth() {
  const res = await fetch(`${API_BASE}/api/health`)
  if (!res.ok) throw new Error('Backend not responding')
  return res.json()
}

/**
 * Fetch terminals list from backend
 */
export async function getTerminals() {
  const res = await fetch(`${API_BASE}/api/agents`)
  if (!res.ok) throw new Error('Failed to fetch terminals')
  return res.json()
}

/**
 * Fetch orphaned sessions from backend
 */
export async function getOrphanedSessions() {
  const res = await fetch(`${API_BASE}/api/tmux/orphaned-sessions`)
  if (!res.ok) throw new Error('Failed to fetch orphaned sessions')
  return res.json()
}

/**
 * Kill a tmux session
 */
export async function killSession(sessionName: string) {
  const res = await fetch(`${API_BASE}/api/tmux/sessions/${encodeURIComponent(sessionName)}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Failed to kill session')
  return res.json()
}

/**
 * Kill multiple tmux sessions
 */
export async function killSessions(sessionNames: string[]) {
  const res = await fetch(`${API_BASE}/api/tmux/sessions/bulk`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessions: sessionNames }),
  })
  if (!res.ok) throw new Error('Failed to kill sessions')
  return res.json()
}

/**
 * Reattach orphaned sessions
 */
export async function reattachSessions(sessionNames: string[]) {
  const res = await fetch(`${API_BASE}/api/tmux/reattach`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessions: sessionNames }),
  })
  if (!res.ok) throw new Error('Failed to reattach sessions')
  return res.json()
}

/**
 * Fetch all tmux sessions with detailed info (AI tool detection, etc.)
 */
export async function getAllTmuxSessions() {
  const res = await fetch(`${API_BASE}/api/tmux/sessions/detailed`)
  if (!res.ok) throw new Error('Failed to fetch tmux sessions')
  return res.json()
}

/**
 * Kill a tmux session by name (for external sessions)
 */
export async function killTmuxSession(sessionName: string) {
  const res = await fetch(`${API_BASE}/api/tmux/sessions/${encodeURIComponent(sessionName)}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Failed to kill tmux session')
  return res.json()
}

/**
 * Queue a command to the chat input (user selects terminal to send to)
 */
export async function queueCommand(command: string) {
  const message: QueueCommandMessage = {
    type: 'QUEUE_COMMAND',
    command,
  }
  return sendMessage(message)
}

/**
 * Paste a command directly into the active terminal
 */
export async function pasteCommand(command: string) {
  const message: PasteCommandMessage = {
    type: 'PASTE_COMMAND',
    command,
  }
  return sendMessage(message)
}
