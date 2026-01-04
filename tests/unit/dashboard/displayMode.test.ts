import { describe, it, expect } from 'vitest'

/**
 * Tests for display mode computation logic used in dashboard
 *
 * The displayMode is computed from Chrome session flags:
 * - focusedIn3D: true → '3d'
 * - poppedOut: true → 'popout'
 * - otherwise → 'sidebar'
 */

type TerminalDisplayMode = 'sidebar' | 'popout' | '3d'

interface ChromeSession {
  id: string
  focusedIn3D?: boolean
  poppedOut?: boolean
  popoutWindowId?: number
}

// This is the logic used in Home.tsx and Terminals.tsx
function computeDisplayMode(chromeSession: ChromeSession | undefined): TerminalDisplayMode {
  return chromeSession?.focusedIn3D ? '3d'
    : chromeSession?.poppedOut ? 'popout'
    : 'sidebar'
}

describe('displayMode computation', () => {
  describe('computeDisplayMode', () => {
    it('should return "sidebar" when chromeSession is undefined', () => {
      expect(computeDisplayMode(undefined)).toBe('sidebar')
    })

    it('should return "sidebar" when neither focusedIn3D nor poppedOut is set', () => {
      const session: ChromeSession = { id: 'test-1' }
      expect(computeDisplayMode(session)).toBe('sidebar')
    })

    it('should return "sidebar" when both flags are false', () => {
      const session: ChromeSession = {
        id: 'test-1',
        focusedIn3D: false,
        poppedOut: false
      }
      expect(computeDisplayMode(session)).toBe('sidebar')
    })

    it('should return "3d" when focusedIn3D is true', () => {
      const session: ChromeSession = {
        id: 'test-1',
        focusedIn3D: true
      }
      expect(computeDisplayMode(session)).toBe('3d')
    })

    it('should return "popout" when poppedOut is true', () => {
      const session: ChromeSession = {
        id: 'test-1',
        poppedOut: true,
        popoutWindowId: 12345
      }
      expect(computeDisplayMode(session)).toBe('popout')
    })

    it('should prioritize "3d" over "popout" when both are true', () => {
      // This edge case shouldn't happen in practice, but testing the precedence
      const session: ChromeSession = {
        id: 'test-1',
        focusedIn3D: true,
        poppedOut: true
      }
      expect(computeDisplayMode(session)).toBe('3d')
    })

    it('should return "popout" when focusedIn3D is false and poppedOut is true', () => {
      const session: ChromeSession = {
        id: 'test-1',
        focusedIn3D: false,
        poppedOut: true
      }
      expect(computeDisplayMode(session)).toBe('popout')
    })
  })

  describe('session matching', () => {
    const chromeSessions: ChromeSession[] = [
      { id: 'ctt-claude-abc123', focusedIn3D: false, poppedOut: false },
      { id: 'ctt-claude-def456', focusedIn3D: true },
      { id: 'ctt-bash-ghi789', poppedOut: true, popoutWindowId: 999 },
    ]

    it('should find matching session by id and compute displayMode', () => {
      const terminalId = 'ctt-claude-def456'
      const chromeSession = chromeSessions.find(cs => cs.id === terminalId)
      expect(computeDisplayMode(chromeSession)).toBe('3d')
    })

    it('should return sidebar for unmatched terminal', () => {
      const terminalId = 'ctt-unknown-xyz'
      const chromeSession = chromeSessions.find(cs => cs.id === terminalId)
      expect(computeDisplayMode(chromeSession)).toBe('sidebar')
    })

    it('should correctly identify popout terminal', () => {
      const terminalId = 'ctt-bash-ghi789'
      const chromeSession = chromeSessions.find(cs => cs.id === terminalId)
      expect(computeDisplayMode(chromeSession)).toBe('popout')
    })
  })
})
