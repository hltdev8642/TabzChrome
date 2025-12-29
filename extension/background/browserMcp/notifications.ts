/**
 * Browser MCP - Notification handlers
 * Show, update, clear, and list Chrome notifications
 */

import { sendToWebSocket } from '../websocket'

/**
 * Get the default icon URL for notifications
 */
function getDefaultIconUrl(): string {
  return chrome.runtime.getURL('icons/icon48.png')
}

/**
 * Show a notification
 */
export async function handleBrowserNotificationShow(message: {
  requestId: string
  title: string
  message: string
  type?: 'basic' | 'image' | 'list' | 'progress'
  iconUrl?: string
  imageUrl?: string
  items?: Array<{ title: string; message: string }>
  progress?: number
  buttons?: Array<{ title: string; iconUrl?: string }>
  priority?: number
  notificationId?: string
  requireInteraction?: boolean
}): Promise<void> {
  try {
    const notificationType = message.type || 'basic'

    // Build notification options - using 'any' to bypass strict Chrome typing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const options: any = {
      type: notificationType,
      iconUrl: message.iconUrl || getDefaultIconUrl(),
      title: message.title,
      message: message.message,
      priority: message.priority ?? 0,
      requireInteraction: message.requireInteraction ?? false
    }

    // Add type-specific options
    if (notificationType === 'image' && message.imageUrl) {
      options.imageUrl = message.imageUrl
    }

    if (notificationType === 'list' && message.items) {
      options.items = message.items
    }

    if (notificationType === 'progress' && typeof message.progress === 'number') {
      options.progress = message.progress
    }

    if (message.buttons && message.buttons.length > 0) {
      options.buttons = message.buttons.slice(0, 2).map((btn: { title: string; iconUrl?: string }) => ({
        title: btn.title,
        iconUrl: btn.iconUrl
      }))
    }

    // Create notification with optional custom ID
    const notificationId = await new Promise<string>((resolve, reject) => {
      if (message.notificationId) {
        chrome.notifications.create(message.notificationId, options, (id) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message))
          } else {
            resolve(id)
          }
        })
      } else {
        chrome.notifications.create(options, (id) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message))
          } else {
            resolve(id)
          }
        })
      }
    })

    sendToWebSocket({
      type: 'browser-notification-show-result',
      requestId: message.requestId,
      success: true,
      notificationId
    })
  } catch (err) {
    sendToWebSocket({
      type: 'browser-notification-show-result',
      requestId: message.requestId,
      success: false,
      error: (err as Error).message
    })
  }
}

/**
 * Update an existing notification
 */
export async function handleBrowserNotificationUpdate(message: {
  requestId: string
  notificationId: string
  title?: string
  message?: string
  progress?: number
  type?: 'basic' | 'image' | 'list' | 'progress'
}): Promise<void> {
  try {
    // Build update options - only include fields that are provided
    const options: chrome.notifications.NotificationOptions = {
      // Type is required for update - default to basic if changing type or not specified
      type: message.type || 'basic',
      iconUrl: getDefaultIconUrl()
    }

    if (message.title !== undefined) {
      options.title = message.title
    }

    if (message.message !== undefined) {
      options.message = message.message
    }

    if (message.type === 'progress' && typeof message.progress === 'number') {
      options.progress = message.progress
    }

    const wasUpdated = await new Promise<boolean>((resolve, reject) => {
      chrome.notifications.update(message.notificationId, options, (updated) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
        } else {
          resolve(updated)
        }
      })
    })

    sendToWebSocket({
      type: 'browser-notification-update-result',
      requestId: message.requestId,
      success: true,
      wasUpdated
    })
  } catch (err) {
    sendToWebSocket({
      type: 'browser-notification-update-result',
      requestId: message.requestId,
      success: false,
      error: (err as Error).message
    })
  }
}

/**
 * Clear a notification
 */
export async function handleBrowserNotificationClear(message: {
  requestId: string
  notificationId: string
}): Promise<void> {
  try {
    const wasCleared = await new Promise<boolean>((resolve, reject) => {
      chrome.notifications.clear(message.notificationId, (cleared) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
        } else {
          resolve(cleared)
        }
      })
    })

    sendToWebSocket({
      type: 'browser-notification-clear-result',
      requestId: message.requestId,
      success: true,
      wasCleared
    })
  } catch (err) {
    sendToWebSocket({
      type: 'browser-notification-clear-result',
      requestId: message.requestId,
      success: false,
      error: (err as Error).message
    })
  }
}

/**
 * List all active notifications
 */
export async function handleBrowserNotificationList(message: {
  requestId: string
}): Promise<void> {
  try {
    // chrome.notifications.getAll returns Record<string, true> for active notifications
    const notifications = await new Promise<Record<string, boolean>>((resolve, reject) => {
      chrome.notifications.getAll((notifs) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
        } else {
          resolve(notifs)
        }
      })
    })

    // Return just the notification IDs (Chrome doesn't expose full options)
    const notificationIds = Object.keys(notifications)

    sendToWebSocket({
      type: 'browser-notification-list-result',
      requestId: message.requestId,
      success: true,
      notificationIds,
      count: notificationIds.length
    })
  } catch (err) {
    sendToWebSocket({
      type: 'browser-notification-list-result',
      requestId: message.requestId,
      success: false,
      error: (err as Error).message
    })
  }
}
