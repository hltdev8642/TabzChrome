/**
 * Browser MCP - History management handlers
 * Search browsing history, get visit details, delete history entries
 */

import { sendToWebSocket } from '../websocket'

/**
 * Search browsing history by keyword and date range
 */
export async function handleBrowserHistorySearch(message: {
  requestId: string
  query: string
  startTime?: number
  endTime?: number
  maxResults?: number
}): Promise<void> {
  try {
    const { query, startTime, endTime, maxResults = 100 } = message

    // Default to last 24 hours if no time range specified
    const now = Date.now()
    const defaultStartTime = now - (24 * 60 * 60 * 1000) // 24 hours ago

    const results = await chrome.history.search({
      text: query,
      startTime: startTime ?? defaultStartTime,
      endTime: endTime ?? now,
      maxResults: Math.min(maxResults, 1000) // Cap at 1000
    })

    const items = results.map(item => ({
      id: item.id,
      url: item.url || '',
      title: item.title || '',
      lastVisitTime: item.lastVisitTime,
      visitCount: item.visitCount || 0,
      typedCount: item.typedCount || 0
    }))

    sendToWebSocket({
      type: 'browser-history-search-result',
      requestId: message.requestId,
      success: true,
      items,
      total: items.length
    })
  } catch (err) {
    sendToWebSocket({
      type: 'browser-history-search-result',
      requestId: message.requestId,
      success: false,
      items: [],
      total: 0,
      error: (err as Error).message
    })
  }
}

/**
 * Get visit details for a specific URL
 */
export async function handleBrowserHistoryVisits(message: {
  requestId: string
  url: string
}): Promise<void> {
  try {
    const { url } = message

    if (!url) {
      sendToWebSocket({
        type: 'browser-history-visits-result',
        requestId: message.requestId,
        success: false,
        visits: [],
        error: 'URL is required'
      })
      return
    }

    const visits = await chrome.history.getVisits({ url })

    const visitDetails = visits.map(visit => ({
      id: visit.id,
      visitId: visit.visitId,
      visitTime: visit.visitTime,
      referringVisitId: visit.referringVisitId,
      transition: visit.transition
    }))

    sendToWebSocket({
      type: 'browser-history-visits-result',
      requestId: message.requestId,
      success: true,
      url,
      visits: visitDetails,
      total: visitDetails.length
    })
  } catch (err) {
    sendToWebSocket({
      type: 'browser-history-visits-result',
      requestId: message.requestId,
      success: false,
      visits: [],
      error: (err as Error).message
    })
  }
}

/**
 * Get most recent N history entries
 */
export async function handleBrowserHistoryRecent(message: {
  requestId: string
  maxResults?: number
}): Promise<void> {
  try {
    const { maxResults = 50 } = message

    // Empty query returns all history, sorted by most recent
    const results = await chrome.history.search({
      text: '',
      maxResults: Math.min(maxResults, 1000),
      startTime: 0 // All time
    })

    const items = results.map(item => ({
      id: item.id,
      url: item.url || '',
      title: item.title || '',
      lastVisitTime: item.lastVisitTime,
      visitCount: item.visitCount || 0,
      typedCount: item.typedCount || 0
    }))

    sendToWebSocket({
      type: 'browser-history-recent-result',
      requestId: message.requestId,
      success: true,
      items,
      total: items.length
    })
  } catch (err) {
    sendToWebSocket({
      type: 'browser-history-recent-result',
      requestId: message.requestId,
      success: false,
      items: [],
      total: 0,
      error: (err as Error).message
    })
  }
}

/**
 * Delete a specific URL from history
 */
export async function handleBrowserHistoryDeleteUrl(message: {
  requestId: string
  url: string
}): Promise<void> {
  try {
    const { url } = message

    if (!url) {
      sendToWebSocket({
        type: 'browser-history-delete-url-result',
        requestId: message.requestId,
        success: false,
        error: 'URL is required'
      })
      return
    }

    await chrome.history.deleteUrl({ url })

    sendToWebSocket({
      type: 'browser-history-delete-url-result',
      requestId: message.requestId,
      success: true,
      url
    })
  } catch (err) {
    sendToWebSocket({
      type: 'browser-history-delete-url-result',
      requestId: message.requestId,
      success: false,
      error: (err as Error).message
    })
  }
}

/**
 * Delete history within a date range
 */
export async function handleBrowserHistoryDeleteRange(message: {
  requestId: string
  startTime: number
  endTime: number
}): Promise<void> {
  try {
    const { startTime, endTime } = message

    if (startTime === undefined || endTime === undefined) {
      sendToWebSocket({
        type: 'browser-history-delete-range-result',
        requestId: message.requestId,
        success: false,
        error: 'Both startTime and endTime are required'
      })
      return
    }

    if (startTime > endTime) {
      sendToWebSocket({
        type: 'browser-history-delete-range-result',
        requestId: message.requestId,
        success: false,
        error: 'startTime must be less than or equal to endTime'
      })
      return
    }

    await chrome.history.deleteRange({
      startTime,
      endTime
    })

    sendToWebSocket({
      type: 'browser-history-delete-range-result',
      requestId: message.requestId,
      success: true,
      startTime,
      endTime
    })
  } catch (err) {
    sendToWebSocket({
      type: 'browser-history-delete-range-result',
      requestId: message.requestId,
      success: false,
      error: (err as Error).message
    })
  }
}
