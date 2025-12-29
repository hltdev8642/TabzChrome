/**
 * Browser MCP - Sessions handlers
 * Recover recently closed tabs/windows and view synced device tabs
 */

import { sendToWebSocket } from '../websocket'

/**
 * Get recently closed tabs and windows
 */
export async function handleBrowserSessionsRecent(message: {
  requestId: string
  maxResults?: number
}): Promise<void> {
  try {
    const sessions = await chrome.sessions.getRecentlyClosed({
      maxResults: message.maxResults || 25
    })

    // Transform sessions to a simpler format
    const formattedSessions = sessions.map(session => ({
      lastModified: session.lastModified,
      tab: session.tab ? {
        sessionId: session.tab.sessionId,
        url: session.tab.url || '',
        title: session.tab.title || '',
        favIconUrl: session.tab.favIconUrl
      } : undefined,
      window: session.window ? {
        sessionId: session.window.sessionId,
        tabCount: session.window.tabs?.length || 0,
        tabs: (session.window.tabs || []).map(tab => ({
          sessionId: tab.sessionId,
          url: tab.url || '',
          title: tab.title || '',
          favIconUrl: tab.favIconUrl
        }))
      } : undefined
    }))

    sendToWebSocket({
      type: 'browser-sessions-recent-result',
      requestId: message.requestId,
      success: true,
      sessions: formattedSessions
    })
  } catch (err) {
    sendToWebSocket({
      type: 'browser-sessions-recent-result',
      requestId: message.requestId,
      success: false,
      error: (err as Error).message
    })
  }
}

/**
 * Restore a closed session (tab or window)
 */
export async function handleBrowserSessionsRestore(message: {
  requestId: string
  sessionId?: string
}): Promise<void> {
  try {
    // If no sessionId provided, restore most recent
    const session = await chrome.sessions.restore(message.sessionId)

    const formattedSession = {
      lastModified: session.lastModified,
      tab: session.tab ? {
        sessionId: session.tab.sessionId,
        url: session.tab.url || '',
        title: session.tab.title || ''
      } : undefined,
      window: session.window ? {
        sessionId: session.window.sessionId,
        tabCount: session.window.tabs?.length || 0,
        tabs: (session.window.tabs || []).map(tab => ({
          sessionId: tab.sessionId,
          url: tab.url || '',
          title: tab.title || ''
        }))
      } : undefined
    }

    sendToWebSocket({
      type: 'browser-sessions-restore-result',
      requestId: message.requestId,
      success: true,
      session: formattedSession
    })
  } catch (err) {
    sendToWebSocket({
      type: 'browser-sessions-restore-result',
      requestId: message.requestId,
      success: false,
      error: (err as Error).message
    })
  }
}

/**
 * Get tabs from synced devices
 */
export async function handleBrowserSessionsDevices(message: {
  requestId: string
  maxResults?: number
}): Promise<void> {
  try {
    const devices = await chrome.sessions.getDevices({
      maxResults: message.maxResults || 10
    })

    // Transform devices to include session details
    const formattedDevices = devices.map(device => ({
      deviceName: device.deviceName,
      lastModifiedTime: device.sessions[0]?.lastModified || 0,
      sessions: device.sessions.map(session => ({
        lastModified: session.lastModified,
        tab: session.tab ? {
          sessionId: session.tab.sessionId,
          url: session.tab.url || '',
          title: session.tab.title || '',
          favIconUrl: session.tab.favIconUrl
        } : undefined,
        window: session.window ? {
          sessionId: session.window.sessionId,
          tabCount: session.window.tabs?.length || 0,
          tabs: (session.window.tabs || []).map(tab => ({
            sessionId: tab.sessionId,
            url: tab.url || '',
            title: tab.title || '',
            favIconUrl: tab.favIconUrl
          }))
        } : undefined
      }))
    }))

    sendToWebSocket({
      type: 'browser-sessions-devices-result',
      requestId: message.requestId,
      success: true,
      devices: formattedDevices
    })
  } catch (err) {
    sendToWebSocket({
      type: 'browser-sessions-devices-result',
      requestId: message.requestId,
      success: false,
      error: (err as Error).message
    })
  }
}
