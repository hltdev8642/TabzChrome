/**
 * Browser MCP - Chrome Debugger Emulation handlers
 * Device emulation, network throttling, geolocation, media, and vision deficiency simulation
 *
 * Note: CDP emulation settings persist only while the debugger is attached.
 * These handlers keep the debugger attached after applying settings.
 * Use tabz_emulate_clear to reset everything and detach.
 */

import { sendToWebSocket } from '../websocket'

// ============================================
// Device Presets
// ============================================

interface DeviceMetrics {
  width: number
  height: number
  deviceScaleFactor: number
  mobile: boolean
}

const DEVICE_PRESETS: Record<string, DeviceMetrics> = {
  iPhone_14: { width: 390, height: 844, deviceScaleFactor: 3, mobile: true },
  iPhone_14_Pro_Max: { width: 430, height: 932, deviceScaleFactor: 3, mobile: true },
  iPhone_SE: { width: 375, height: 667, deviceScaleFactor: 2, mobile: true },
  Pixel_7: { width: 412, height: 915, deviceScaleFactor: 2.625, mobile: true },
  Pixel_7_Pro: { width: 412, height: 892, deviceScaleFactor: 3.5, mobile: true },
  iPad: { width: 768, height: 1024, deviceScaleFactor: 2, mobile: true },
  iPad_Pro: { width: 1024, height: 1366, deviceScaleFactor: 2, mobile: true },
  Galaxy_S23: { width: 360, height: 780, deviceScaleFactor: 3, mobile: true },
  Galaxy_Fold: { width: 280, height: 653, deviceScaleFactor: 3, mobile: true },
}

// ============================================
// Network Presets
// ============================================

interface NetworkConditions {
  offline: boolean
  downloadThroughput: number // bytes/sec, -1 for disabled
  uploadThroughput: number // bytes/sec, -1 for disabled
  latency: number // ms
}

const NETWORK_PRESETS: Record<string, NetworkConditions> = {
  offline: { offline: true, downloadThroughput: 0, uploadThroughput: 0, latency: 0 },
  slow_3g: { offline: false, downloadThroughput: 50000, uploadThroughput: 50000, latency: 2000 },
  fast_3g: { offline: false, downloadThroughput: 180000, uploadThroughput: 84375, latency: 562 },
  '4g': { offline: false, downloadThroughput: 4000000, uploadThroughput: 3000000, latency: 20 },
  wifi: { offline: false, downloadThroughput: 30000000, uploadThroughput: 15000000, latency: 2 },
  no_throttle: { offline: false, downloadThroughput: -1, uploadThroughput: -1, latency: 0 },
}

// ============================================
// Debugger Helpers
// ============================================

/**
 * Send a debugger command and return the result
 */
function sendDebuggerCommand<T>(
  target: chrome.debugger.Debuggee,
  method: string,
  params?: { [key: string]: unknown },
  timeoutMs: number = 10000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Debugger command '${method}' timed out after ${timeoutMs}ms`))
    }, timeoutMs)

    chrome.debugger.sendCommand(target, method, params, (result) => {
      clearTimeout(timeout)
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
      } else {
        resolve(result as T)
      }
    })
  })
}

/**
 * Ensure debugger is attached to a tab
 * Returns true if already attached or newly attached
 */
async function ensureDebuggerAttached(tabId: number): Promise<boolean> {
  const target: chrome.debugger.Debuggee = { tabId }

  try {
    await chrome.debugger.attach(target, '1.3')
    return true
  } catch (err) {
    const message = (err as Error).message || ''
    // Already attached is fine - continue with the operation
    if (message.includes('already attached') || message.includes('Another debugger')) {
      return true
    }
    throw err
  }
}

/**
 * Detach debugger from a tab (ignore errors)
 */
async function detachDebugger(tabId: number): Promise<void> {
  const target: chrome.debugger.Debuggee = { tabId }
  try {
    await chrome.debugger.detach(target)
  } catch {
    // Ignore errors - debugger may not be attached
  }
}

// ============================================
// Device Emulation Handler
// ============================================

/**
 * Emulate device viewport and metrics
 */
export async function handleBrowserEmulateDevice(message: {
  requestId: string
  tabId?: number
  device?: string
  width?: number
  height?: number
  deviceScaleFactor?: number
  mobile?: boolean
}): Promise<void> {
  try {
    // Get target tab
    const targetTabId = message.tabId || (await chrome.tabs.query({ active: true, lastFocusedWindow: true }))[0]?.id
    if (!targetTabId) {
      sendToWebSocket({
        type: 'browser-emulate-device-result',
        requestId: message.requestId,
        success: false,
        error: 'No active tab found'
      })
      return
    }

    // Determine device metrics
    let metrics: DeviceMetrics

    if (message.device && message.device !== 'custom') {
      // Use preset
      const preset = DEVICE_PRESETS[message.device]
      if (!preset) {
        sendToWebSocket({
          type: 'browser-emulate-device-result',
          requestId: message.requestId,
          success: false,
          error: `Unknown device preset: ${message.device}. Available: ${Object.keys(DEVICE_PRESETS).join(', ')}`
        })
        return
      }
      metrics = { ...preset }
    } else {
      // Use custom dimensions
      if (!message.width || !message.height) {
        sendToWebSocket({
          type: 'browser-emulate-device-result',
          requestId: message.requestId,
          success: false,
          error: "Custom device requires 'width' and 'height' parameters"
        })
        return
      }
      metrics = {
        width: message.width,
        height: message.height,
        deviceScaleFactor: message.deviceScaleFactor || 1,
        mobile: message.mobile !== undefined ? message.mobile : true
      }
    }

    // Attach debugger (keep attached for emulation to persist)
    await ensureDebuggerAttached(targetTabId)
    const target: chrome.debugger.Debuggee = { tabId: targetTabId }

    // Set device metrics
    await sendDebuggerCommand(target, 'Emulation.setDeviceMetricsOverride', {
      width: metrics.width,
      height: metrics.height,
      deviceScaleFactor: metrics.deviceScaleFactor,
      mobile: metrics.mobile,
      screenWidth: metrics.width,
      screenHeight: metrics.height
    })

    sendToWebSocket({
      type: 'browser-emulate-device-result',
      requestId: message.requestId,
      success: true,
      device: message.device || 'custom',
      metrics,
      message: `Emulating ${message.device || 'custom'} (${metrics.width}x${metrics.height}). Use tabz_emulate_clear to reset.`
    })
  } catch (err) {
    sendToWebSocket({
      type: 'browser-emulate-device-result',
      requestId: message.requestId,
      success: false,
      error: (err as Error).message
    })
  }
}

// ============================================
// Clear Emulation Handler
// ============================================

/**
 * Clear all emulation overrides and detach debugger
 */
export async function handleBrowserEmulateClear(message: {
  requestId: string
  tabId?: number
}): Promise<void> {
  try {
    // Get target tab
    const targetTabId = message.tabId || (await chrome.tabs.query({ active: true, lastFocusedWindow: true }))[0]?.id
    if (!targetTabId) {
      sendToWebSocket({
        type: 'browser-emulate-clear-result',
        requestId: message.requestId,
        success: false,
        error: 'No active tab found'
      })
      return
    }

    const target: chrome.debugger.Debuggee = { tabId: targetTabId }
    const cleared: string[] = []

    try {
      // Try to clear each emulation type (some may fail if not set)
      try {
        await sendDebuggerCommand(target, 'Emulation.clearDeviceMetricsOverride')
        cleared.push('device')
      } catch { /* ignore */ }

      try {
        await sendDebuggerCommand(target, 'Emulation.clearGeolocationOverride')
        cleared.push('geolocation')
      } catch { /* ignore */ }

      try {
        await sendDebuggerCommand(target, 'Emulation.setEmulatedMedia', { media: '', features: [] })
        cleared.push('media')
      } catch { /* ignore */ }

      try {
        await sendDebuggerCommand(target, 'Emulation.setEmulatedVisionDeficiency', { type: 'none' })
        cleared.push('vision')
      } catch { /* ignore */ }

      try {
        await sendDebuggerCommand(target, 'Network.emulateNetworkConditions', {
          offline: false,
          latency: 0,
          downloadThroughput: -1,
          uploadThroughput: -1
        })
        cleared.push('network')
      } catch { /* ignore */ }
    } catch {
      // Debugger may not be attached - that's fine
    }

    // Detach debugger
    await detachDebugger(targetTabId)

    sendToWebSocket({
      type: 'browser-emulate-clear-result',
      requestId: message.requestId,
      success: true,
      cleared,
      message: 'All emulation cleared and debugger detached'
    })
  } catch (err) {
    sendToWebSocket({
      type: 'browser-emulate-clear-result',
      requestId: message.requestId,
      success: false,
      error: (err as Error).message
    })
  }
}

// ============================================
// Geolocation Handler
// ============================================

/**
 * Override geolocation
 */
export async function handleBrowserEmulateGeolocation(message: {
  requestId: string
  tabId?: number
  latitude?: number
  longitude?: number
  accuracy?: number
  clear?: boolean
}): Promise<void> {
  try {
    // Get target tab
    const targetTabId = message.tabId || (await chrome.tabs.query({ active: true, lastFocusedWindow: true }))[0]?.id
    if (!targetTabId) {
      sendToWebSocket({
        type: 'browser-emulate-geolocation-result',
        requestId: message.requestId,
        success: false,
        error: 'No active tab found'
      })
      return
    }

    // Attach debugger
    await ensureDebuggerAttached(targetTabId)
    const target: chrome.debugger.Debuggee = { tabId: targetTabId }

    if (message.clear) {
      // Clear geolocation override
      await sendDebuggerCommand(target, 'Emulation.clearGeolocationOverride')
      sendToWebSocket({
        type: 'browser-emulate-geolocation-result',
        requestId: message.requestId,
        success: true,
        message: 'Geolocation override cleared'
      })
    } else {
      // Validate coordinates
      if (message.latitude === undefined || message.longitude === undefined) {
        sendToWebSocket({
          type: 'browser-emulate-geolocation-result',
          requestId: message.requestId,
          success: false,
          error: "Geolocation requires 'latitude' and 'longitude' parameters"
        })
        return
      }

      // Set geolocation override
      await sendDebuggerCommand(target, 'Emulation.setGeolocationOverride', {
        latitude: message.latitude,
        longitude: message.longitude,
        accuracy: message.accuracy || 100
      })

      sendToWebSocket({
        type: 'browser-emulate-geolocation-result',
        requestId: message.requestId,
        success: true,
        latitude: message.latitude,
        longitude: message.longitude,
        accuracy: message.accuracy || 100,
        message: `Geolocation set to ${message.latitude}, ${message.longitude}`
      })
    }
  } catch (err) {
    sendToWebSocket({
      type: 'browser-emulate-geolocation-result',
      requestId: message.requestId,
      success: false,
      error: (err as Error).message
    })
  }
}

// ============================================
// Network Throttling Handler
// ============================================

/**
 * Emulate network conditions
 */
export async function handleBrowserEmulateNetwork(message: {
  requestId: string
  tabId?: number
  preset?: string
  offline?: boolean
  downloadThroughput?: number
  uploadThroughput?: number
  latency?: number
}): Promise<void> {
  try {
    // Get target tab
    const targetTabId = message.tabId || (await chrome.tabs.query({ active: true, lastFocusedWindow: true }))[0]?.id
    if (!targetTabId) {
      sendToWebSocket({
        type: 'browser-emulate-network-result',
        requestId: message.requestId,
        success: false,
        error: 'No active tab found'
      })
      return
    }

    // Determine network conditions
    let conditions: NetworkConditions

    if (message.preset) {
      const preset = NETWORK_PRESETS[message.preset]
      if (!preset) {
        sendToWebSocket({
          type: 'browser-emulate-network-result',
          requestId: message.requestId,
          success: false,
          error: `Unknown network preset: ${message.preset}. Available: ${Object.keys(NETWORK_PRESETS).join(', ')}`
        })
        return
      }
      conditions = { ...preset }
    } else {
      // Custom conditions
      conditions = {
        offline: message.offline || false,
        downloadThroughput: message.downloadThroughput ?? -1,
        uploadThroughput: message.uploadThroughput ?? -1,
        latency: message.latency || 0
      }
    }

    // Attach debugger
    await ensureDebuggerAttached(targetTabId)
    const target: chrome.debugger.Debuggee = { tabId: targetTabId }

    // Enable Network domain (required for network emulation)
    await sendDebuggerCommand(target, 'Network.enable')

    // Set network conditions
    await sendDebuggerCommand(target, 'Network.emulateNetworkConditions', {
      offline: conditions.offline,
      latency: conditions.latency,
      downloadThroughput: conditions.downloadThroughput,
      uploadThroughput: conditions.uploadThroughput
    })

    sendToWebSocket({
      type: 'browser-emulate-network-result',
      requestId: message.requestId,
      success: true,
      preset: message.preset || 'custom',
      conditions,
      message: `Network emulation set to ${message.preset || 'custom'}. Use tabz_emulate_clear to reset.`
    })
  } catch (err) {
    sendToWebSocket({
      type: 'browser-emulate-network-result',
      requestId: message.requestId,
      success: false,
      error: (err as Error).message
    })
  }
}

// ============================================
// Media Emulation Handler
// ============================================

/**
 * Emulate media type and features
 */
export async function handleBrowserEmulateMedia(message: {
  requestId: string
  tabId?: number
  media?: 'screen' | 'print' | ''
  colorScheme?: 'light' | 'dark' | 'no-preference'
  reducedMotion?: 'reduce' | 'no-preference'
  forcedColors?: 'active' | 'none'
}): Promise<void> {
  try {
    // Get target tab
    const targetTabId = message.tabId || (await chrome.tabs.query({ active: true, lastFocusedWindow: true }))[0]?.id
    if (!targetTabId) {
      sendToWebSocket({
        type: 'browser-emulate-media-result',
        requestId: message.requestId,
        success: false,
        error: 'No active tab found'
      })
      return
    }

    // Attach debugger
    await ensureDebuggerAttached(targetTabId)
    const target: chrome.debugger.Debuggee = { tabId: targetTabId }

    // Build features array
    const features: Array<{ name: string; value: string }> = []
    if (message.colorScheme) {
      features.push({ name: 'prefers-color-scheme', value: message.colorScheme })
    }
    if (message.reducedMotion) {
      features.push({ name: 'prefers-reduced-motion', value: message.reducedMotion })
    }
    if (message.forcedColors) {
      features.push({ name: 'forced-colors', value: message.forcedColors })
    }

    // Set emulated media
    await sendDebuggerCommand(target, 'Emulation.setEmulatedMedia', {
      media: message.media || '',
      features
    })

    const applied: string[] = []
    if (message.media) applied.push(`media: ${message.media}`)
    if (message.colorScheme) applied.push(`color-scheme: ${message.colorScheme}`)
    if (message.reducedMotion) applied.push(`reduced-motion: ${message.reducedMotion}`)
    if (message.forcedColors) applied.push(`forced-colors: ${message.forcedColors}`)

    sendToWebSocket({
      type: 'browser-emulate-media-result',
      requestId: message.requestId,
      success: true,
      media: message.media,
      features,
      message: applied.length > 0
        ? `Media emulation applied: ${applied.join(', ')}`
        : 'Media emulation cleared'
    })
  } catch (err) {
    sendToWebSocket({
      type: 'browser-emulate-media-result',
      requestId: message.requestId,
      success: false,
      error: (err as Error).message
    })
  }
}

// ============================================
// Vision Deficiency Handler
// ============================================

type VisionDeficiencyType =
  | 'none'
  | 'blurredVision'
  | 'reducedContrast'
  | 'achromatopsia'
  | 'deuteranopia'
  | 'protanopia'
  | 'tritanopia'

/**
 * Simulate vision deficiency
 */
export async function handleBrowserEmulateVision(message: {
  requestId: string
  tabId?: number
  type: VisionDeficiencyType
}): Promise<void> {
  try {
    // Get target tab
    const targetTabId = message.tabId || (await chrome.tabs.query({ active: true, lastFocusedWindow: true }))[0]?.id
    if (!targetTabId) {
      sendToWebSocket({
        type: 'browser-emulate-vision-result',
        requestId: message.requestId,
        success: false,
        error: 'No active tab found'
      })
      return
    }

    const validTypes: VisionDeficiencyType[] = [
      'none', 'blurredVision', 'reducedContrast',
      'achromatopsia', 'deuteranopia', 'protanopia', 'tritanopia'
    ]

    if (!validTypes.includes(message.type)) {
      sendToWebSocket({
        type: 'browser-emulate-vision-result',
        requestId: message.requestId,
        success: false,
        error: `Invalid vision type: ${message.type}. Valid: ${validTypes.join(', ')}`
      })
      return
    }

    // Attach debugger
    await ensureDebuggerAttached(targetTabId)
    const target: chrome.debugger.Debuggee = { tabId: targetTabId }

    // Set vision deficiency
    await sendDebuggerCommand(target, 'Emulation.setEmulatedVisionDeficiency', {
      type: message.type
    })

    const descriptions: Record<VisionDeficiencyType, string> = {
      none: 'Normal vision',
      blurredVision: 'Blurred vision simulation',
      reducedContrast: 'Reduced contrast sensitivity',
      achromatopsia: 'Total color blindness (monochromacy)',
      deuteranopia: 'Red-green color blindness (green-blind)',
      protanopia: 'Red-green color blindness (red-blind)',
      tritanopia: 'Blue-yellow color blindness'
    }

    sendToWebSocket({
      type: 'browser-emulate-vision-result',
      requestId: message.requestId,
      success: true,
      visionType: message.type,
      message: message.type === 'none'
        ? 'Vision deficiency simulation cleared'
        : `Simulating: ${descriptions[message.type]}`
    })
  } catch (err) {
    sendToWebSocket({
      type: 'browser-emulate-vision-result',
      requestId: message.requestId,
      success: false,
      error: (err as Error).message
    })
  }
}
