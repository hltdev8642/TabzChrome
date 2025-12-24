import React from 'react'
import { type Profile } from './SettingsModal'

/**
 * Terminal session data for context menu display
 */
interface TerminalSession {
  id: string
  name: string
  type: string
  active: boolean
  sessionName?: string
  workingDir?: string
  profile?: Profile
  assignedVoice?: string
}

/**
 * Props for the SessionContextMenu component
 */
interface SessionContextMenuProps {
  /** Whether the menu is currently visible */
  show: boolean
  /** X position for the menu */
  x: number
  /** Y position for the menu */
  y: number
  /** Terminal session to show menu for */
  terminal: TerminalSession | null
  /** Current font size offset for this terminal */
  fontSizeOffset?: number
  /** Callback to increase font size for this terminal */
  onIncreaseFontSize?: () => void
  /** Callback to decrease font size for this terminal */
  onDecreaseFontSize?: () => void
  /** Callback to reset font size to default */
  onResetFontSize?: () => void
  /** Callback to edit the profile for this terminal */
  onEditProfile?: () => void
  /** Callback to rename the terminal tab */
  onRename: () => void
  /** Callback to copy the session ID to clipboard */
  onCopyId: () => void
  /** Callback to view terminal output as selectable text */
  onViewAsText?: () => void
  /** Callback to detach the session (keeps tmux running) */
  onDetach: () => void
  /** Callback to kill the session (destroys tmux) */
  onKill: () => void
  /** Callback to open the session in 3D Focus mode */
  onOpenIn3D: () => void
  /** Callback to close the context menu */
  onClose: () => void
}

/**
 * SessionContextMenu - Right-click context menu for terminal tabs
 *
 * Provides session-level operations when right-clicking a terminal tab.
 * Tmux-backed terminals (ctt-* prefix) have additional options.
 *
 * Available actions:
 * - **Rename Tab**: Change the display name of the tab
 * - **Copy Session ID**: Copy tmux session name to clipboard (useful for tmux attach)
 * - **Detach Session**: Remove from UI but keep tmux session running (becomes orphaned)
 * - **Kill Session**: Destroy the terminal and its tmux session permanently
 *
 * @param props - Menu position and action callbacks
 * @returns Context menu component or null if not visible
 */
export function SessionContextMenu({
  show,
  x,
  y,
  terminal,
  fontSizeOffset,
  onIncreaseFontSize,
  onDecreaseFontSize,
  onResetFontSize,
  onEditProfile,
  onRename,
  onCopyId,
  onViewAsText,
  onDetach,
  onKill,
  onOpenIn3D,
  onClose,
}: SessionContextMenuProps) {
  if (!show || !terminal) return null

  // All ctt-* terminals have tmux sessions (the ID is the session name)
  const isTmuxSession = terminal.id?.startsWith('ctt-') || terminal.sessionName

  // Font size offset bounds
  const MIN_FONT_OFFSET = -4
  const MAX_FONT_OFFSET = 8
  const currentOffset = fontSizeOffset || 0
  const canIncrease = currentOffset < MAX_FONT_OFFSET
  const canDecrease = currentOffset > MIN_FONT_OFFSET

  return (
    <div
      className="tab-context-menu"
      style={{
        position: 'fixed',
        left: `${x}px`,
        top: `${y}px`,
        zIndex: 10000,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Font Size Controls - at the top for quick access */}
      {/* These don't close the menu so users can click multiple times */}
      {onIncreaseFontSize && onDecreaseFontSize && onResetFontSize && (
        <>
          <div className="context-menu-row">
            <span className="context-menu-label">🔍 Font Size</span>
            <div className="context-menu-buttons">
              <button
                className={`context-menu-btn ${!canDecrease ? 'disabled' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  if (canDecrease) onDecreaseFontSize()
                }}
                disabled={!canDecrease}
                title="Decrease font size (Ctrl+-)"
              >
                −
              </button>
              <span className="context-menu-value">
                {currentOffset > 0 ? `+${currentOffset}` : currentOffset < 0 ? currentOffset : '0'}
              </span>
              <button
                className={`context-menu-btn ${!canIncrease ? 'disabled' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  if (canIncrease) onIncreaseFontSize()
                }}
                disabled={!canIncrease}
                title="Increase font size (Ctrl+=)"
              >
                +
              </button>
              <button
                className={`context-menu-btn reset ${currentOffset === 0 ? 'disabled' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  if (currentOffset !== 0) onResetFontSize()
                }}
                disabled={currentOffset === 0}
                title="Reset font size (Ctrl+0)"
              >
                ↺
              </button>
            </div>
          </div>
          <div className="context-menu-divider" />
        </>
      )}
      {onEditProfile && (
        <button
          className="context-menu-item"
          onClick={() => {
            onEditProfile()
            onClose()
          }}
        >
          ⚙️ Edit Profile...
        </button>
      )}
      <button
        className="context-menu-item"
        onClick={() => {
          onRename()
          onClose()
        }}
      >
        ✏️ Rename Tab...
      </button>
      {isTmuxSession && (
        <button
          className="context-menu-item"
          onClick={() => {
            onOpenIn3D()
            onClose()
          }}
        >
          🧊 Open in 3D Focus
        </button>
      )}
      {isTmuxSession && (
        <>
          <div className="context-menu-divider" />
          <button
            className="context-menu-item"
            onClick={() => {
              onCopyId()
              onClose()
            }}
          >
            📋 Copy Session ID
          </button>
          {onViewAsText && (
            <button
              className="context-menu-item"
              onClick={() => {
                onViewAsText()
                onClose()
              }}
            >
              📄 View as Text
            </button>
          )}
          <div className="context-menu-divider" />
          <button
            className="context-menu-item"
            onClick={() => {
              onDetach()
              onClose()
            }}
          >
            👻 Detach Session
          </button>
          <button
            className="context-menu-item"
            onClick={() => {
              onKill()
              onClose()
            }}
          >
            ❌ Kill Session
          </button>
        </>
      )}
    </div>
  )
}
