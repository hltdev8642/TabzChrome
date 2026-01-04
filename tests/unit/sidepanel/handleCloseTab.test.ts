import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Tests for handleCloseTab behavior
 *
 * When closing a sidebar tab, it should:
 * 1. Close the popout window if terminal is popped out
 * 2. Close the 3D focus tab if terminal is in 3D mode
 * 3. Send CLOSE_TERMINAL message to kill the terminal
 */

interface TerminalSession {
  id: string
  sessionName?: string
  poppedOut?: boolean
  popoutWindowId?: number
  focusedIn3D?: boolean
}

// Simulated handleCloseTab logic (extracted from sidepanel.tsx)
async function handleCloseTabLogic(
  terminalId: string,
  sessions: TerminalSession[],
  sendMessage: (msg: { type: string; terminalId: string }) => void
) {
  const session = sessions.find(s => s.id === terminalId)

  // Close popout window if terminal is popped out
  if (session?.popoutWindowId) {
    try {
      await chrome.windows.remove(session.popoutWindowId)
    } catch (err) {
      // Window may already be closed
    }
  }

  // Close 3D focus tab if terminal is in 3D mode
  if (session?.focusedIn3D) {
    try {
      const tabs = await chrome.tabs.query({ url: chrome.runtime.getURL('3d/3d-focus.html') + '*' })
      const matchingTab = tabs.find(t => t.url?.includes(`session=${session.sessionName}`))
      if (matchingTab?.id) {
        await chrome.tabs.remove(matchingTab.id)
      }
    } catch (err) {
      // Tab may already be closed
    }
  }

  sendMessage({
    type: 'CLOSE_TERMINAL',
    terminalId,
  })
}

describe('handleCloseTab', () => {
  const mockSendMessage = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('regular sidebar terminal', () => {
    it('should send CLOSE_TERMINAL message', async () => {
      const sessions: TerminalSession[] = [
        { id: 'ctt-test-123', sessionName: 'ctt-test-123' }
      ]

      await handleCloseTabLogic('ctt-test-123', sessions, mockSendMessage)

      expect(mockSendMessage).toHaveBeenCalledWith({
        type: 'CLOSE_TERMINAL',
        terminalId: 'ctt-test-123'
      })
    })

    it('should not call chrome.windows.remove for sidebar terminal', async () => {
      const sessions: TerminalSession[] = [
        { id: 'ctt-test-123', sessionName: 'ctt-test-123' }
      ]

      await handleCloseTabLogic('ctt-test-123', sessions, mockSendMessage)

      expect(chrome.windows.remove).not.toHaveBeenCalled()
    })

    it('should not call chrome.tabs.query for sidebar terminal', async () => {
      const sessions: TerminalSession[] = [
        { id: 'ctt-test-123', sessionName: 'ctt-test-123' }
      ]

      await handleCloseTabLogic('ctt-test-123', sessions, mockSendMessage)

      expect(chrome.tabs.query).not.toHaveBeenCalled()
    })
  })

  describe('popped out terminal', () => {
    it('should close popout window and send CLOSE_TERMINAL', async () => {
      const sessions: TerminalSession[] = [
        { id: 'ctt-test-456', sessionName: 'ctt-test-456', poppedOut: true, popoutWindowId: 12345 }
      ]

      await handleCloseTabLogic('ctt-test-456', sessions, mockSendMessage)

      expect(chrome.windows.remove).toHaveBeenCalledWith(12345)
      expect(mockSendMessage).toHaveBeenCalledWith({
        type: 'CLOSE_TERMINAL',
        terminalId: 'ctt-test-456'
      })
    })

    it('should handle error when popout window is already closed', async () => {
      vi.mocked(chrome.windows.remove).mockRejectedValueOnce(new Error('Window not found'))

      const sessions: TerminalSession[] = [
        { id: 'ctt-test-456', sessionName: 'ctt-test-456', poppedOut: true, popoutWindowId: 99999 }
      ]

      // Should not throw
      await handleCloseTabLogic('ctt-test-456', sessions, mockSendMessage)

      expect(mockSendMessage).toHaveBeenCalled()
    })
  })

  describe('3D focus terminal', () => {
    it('should close 3D tab and send CLOSE_TERMINAL', async () => {
      const mockTabs = [
        { id: 101, url: 'chrome-extension://mock-id/3d/3d-focus.html?session=ctt-test-789' }
      ]
      vi.mocked(chrome.tabs.query).mockResolvedValueOnce(mockTabs as chrome.tabs.Tab[])

      const sessions: TerminalSession[] = [
        { id: 'ctt-test-789', sessionName: 'ctt-test-789', focusedIn3D: true }
      ]

      await handleCloseTabLogic('ctt-test-789', sessions, mockSendMessage)

      expect(chrome.tabs.query).toHaveBeenCalledWith({
        url: 'chrome-extension://mock-id/3d/3d-focus.html*'
      })
      expect(chrome.tabs.remove).toHaveBeenCalledWith(101)
      expect(mockSendMessage).toHaveBeenCalledWith({
        type: 'CLOSE_TERMINAL',
        terminalId: 'ctt-test-789'
      })
    })

    it('should not call tabs.remove if no matching 3D tab found', async () => {
      vi.mocked(chrome.tabs.query).mockResolvedValueOnce([])

      const sessions: TerminalSession[] = [
        { id: 'ctt-test-789', sessionName: 'ctt-test-789', focusedIn3D: true }
      ]

      await handleCloseTabLogic('ctt-test-789', sessions, mockSendMessage)

      expect(chrome.tabs.query).toHaveBeenCalled()
      expect(chrome.tabs.remove).not.toHaveBeenCalled()
      expect(mockSendMessage).toHaveBeenCalled()
    })

    it('should handle error when 3D tab query fails', async () => {
      vi.mocked(chrome.tabs.query).mockRejectedValueOnce(new Error('Query failed'))

      const sessions: TerminalSession[] = [
        { id: 'ctt-test-789', sessionName: 'ctt-test-789', focusedIn3D: true }
      ]

      // Should not throw
      await handleCloseTabLogic('ctt-test-789', sessions, mockSendMessage)

      expect(mockSendMessage).toHaveBeenCalled()
    })
  })

  describe('edge cases', () => {
    it('should handle unknown terminal ID gracefully', async () => {
      const sessions: TerminalSession[] = [
        { id: 'ctt-test-123', sessionName: 'ctt-test-123' }
      ]

      await handleCloseTabLogic('ctt-unknown-xxx', sessions, mockSendMessage)

      expect(chrome.windows.remove).not.toHaveBeenCalled()
      expect(chrome.tabs.query).not.toHaveBeenCalled()
      expect(mockSendMessage).toHaveBeenCalledWith({
        type: 'CLOSE_TERMINAL',
        terminalId: 'ctt-unknown-xxx'
      })
    })

    it('should handle both popout and 3D flags (edge case)', async () => {
      // Unlikely in practice, but should handle gracefully
      const mockTabs = [
        { id: 202, url: 'chrome-extension://mock-id/3d/3d-focus.html?session=ctt-test-both' }
      ]
      vi.mocked(chrome.tabs.query).mockResolvedValueOnce(mockTabs as chrome.tabs.Tab[])

      const sessions: TerminalSession[] = [
        {
          id: 'ctt-test-both',
          sessionName: 'ctt-test-both',
          poppedOut: true,
          popoutWindowId: 55555,
          focusedIn3D: true
        }
      ]

      await handleCloseTabLogic('ctt-test-both', sessions, mockSendMessage)

      expect(chrome.windows.remove).toHaveBeenCalledWith(55555)
      expect(chrome.tabs.remove).toHaveBeenCalledWith(202)
      expect(mockSendMessage).toHaveBeenCalled()
    })
  })
})
