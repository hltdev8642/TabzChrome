/**
 * Browser MCP - Profile and settings handlers
 * Get terminal profiles and extension settings
 */

import { sendToWebSocket } from '../websocket'

/**
 * Get all profiles from Chrome storage
 * Allows Claude to see available terminal profiles for spawning
 */
export async function handleBrowserGetProfiles(message: { requestId: string }): Promise<void> {
  try {
    const result = await chrome.storage.local.get(['profiles', 'defaultProfile', 'globalWorkingDir'])
    // Return full profile data - don't strip fields
    const profiles = (result.profiles || []) as Array<Record<string, unknown>>
    const defaultProfileId = result.defaultProfile as string | undefined
    const globalWorkingDir = (result.globalWorkingDir as string) || '~'

    sendToWebSocket({
      type: 'browser-profiles-result',
      requestId: message.requestId,
      success: true,
      profiles,  // Pass through all profile fields
      defaultProfileId,
      globalWorkingDir
    })
  } catch (err) {
    sendToWebSocket({
      type: 'browser-profiles-result',
      requestId: message.requestId,
      success: false,
      profiles: [],
      error: (err as Error).message
    })
  }
}

/**
 * Get lightweight settings for external integrations (like GGPrompts)
 * Returns just globalWorkingDir and default profile name - no full profiles array
 */
export async function handleBrowserGetSettings(message: { requestId: string }): Promise<void> {
  try {
    const result = await chrome.storage.local.get(['profiles', 'defaultProfile', 'globalWorkingDir'])
    const profiles = (result.profiles || []) as Array<{ id: string; name: string }>
    const defaultProfileId = result.defaultProfile as string | undefined
    const globalWorkingDir = (result.globalWorkingDir as string) || '~'

    // Find default profile name
    const defaultProfile = profiles.find(p => p.id === defaultProfileId)
    const defaultProfileName = defaultProfile?.name || 'Bash'

    sendToWebSocket({
      type: 'browser-settings-result',
      requestId: message.requestId,
      success: true,
      globalWorkingDir,
      defaultProfileName
    })
  } catch (err) {
    sendToWebSocket({
      type: 'browser-settings-result',
      requestId: message.requestId,
      success: false,
      error: (err as Error).message
    })
  }
}
