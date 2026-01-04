import React, { useState, useEffect, useRef, useCallback } from 'react'
import type { TerminalSession } from '../hooks/useTerminalSessions'

/**
 * Props for the UnifiedIndicatorsDropdown component
 */
interface UnifiedIndicatorsDropdownProps {
  // Ghost sessions (orphaned tmux sessions)
  orphanedSessions: string[]
  orphanedCount: number
  isLoading: boolean
  onRefresh: () => Promise<void>
  onReattach: (sessions: string[]) => Promise<{ success: boolean; message: string }>
  onKill: (sessions: string[]) => Promise<{ success: boolean; message: string }>

  // Popout sessions (terminals in popup windows)
  popoutSessions: TerminalSession[]
  onReturnFromPopout: (session: TerminalSession) => Promise<void>

  // 3D Focus sessions
  focusedIn3DSessions: TerminalSession[]
  onReturnFrom3D: (terminalId: string) => void

  // Dropdown control
  showDropdown: boolean
  setShowDropdown: (show: boolean) => void
}

type IndicatorSection = 'ghost' | 'popout' | '3d'

interface SectionItem {
  section: IndicatorSection
  id: string
  name: string
  session?: TerminalSession
}

/**
 * UnifiedIndicatorsDropdown - Consolidated indicator for terminals not in sidebar
 *
 * Shows a combined badge when there are:
 * - Detached tmux sessions (ghost 👻)
 * - Popped out terminals (window 🪟)
 * - 3D Focus terminals (cube 🧊)
 *
 * Each section has multi-select with appropriate actions:
 * - Ghost: Reattach or Kill
 * - Popout/3D: Return to Sidebar
 * - "Restore All" brings everything back at once
 */
export function UnifiedIndicatorsDropdown({
  orphanedSessions,
  orphanedCount,
  isLoading,
  onRefresh,
  onReattach,
  onKill,
  popoutSessions,
  onReturnFromPopout,
  focusedIn3DSessions,
  onReturnFrom3D,
  showDropdown,
  setShowDropdown,
}: UnifiedIndicatorsDropdownProps) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const itemRefs = useRef<Map<number, HTMLButtonElement>>(new Map())

  const popoutCount = popoutSessions.length
  const focusedIn3DCount = focusedIn3DSessions.length
  const totalCount = orphanedCount + popoutCount + focusedIn3DCount

  // Build flat list of all items for keyboard navigation
  const allItems: SectionItem[] = [
    ...orphanedSessions.map(s => ({
      section: 'ghost' as const,
      id: `ghost-${s}`,
      name: parseSessionName(s),
      session: undefined,
    })),
    ...popoutSessions.map(s => ({
      section: 'popout' as const,
      id: `popout-${s.id}`,
      name: s.name,
      session: s,
    })),
    ...focusedIn3DSessions.map(s => ({
      section: '3d' as const,
      id: `3d-${s.id}`,
      name: s.name,
      session: s,
    })),
  ]

  // Reset state when dropdown opens/closes
  useEffect(() => {
    if (showDropdown) {
      setFocusedIndex(-1)
      setStatusMessage(null)
      setSelectedItems(new Set())
    }
  }, [showDropdown])

  // Auto-clear status message after 3 seconds
  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => setStatusMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [statusMessage])

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex >= 0) {
      const element = itemRefs.current.get(focusedIndex)
      element?.scrollIntoView({ block: 'nearest' })
    }
  }, [focusedIndex])

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const totalItems = allItems.length
    if (totalItems === 0 && e.key !== 'Escape') return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setFocusedIndex(prev => (prev < totalItems - 1 ? prev + 1 : prev))
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusedIndex(prev => (prev > 0 ? prev - 1 : prev))
        break
      case 'Home':
        e.preventDefault()
        setFocusedIndex(0)
        break
      case 'End':
        e.preventDefault()
        setFocusedIndex(totalItems - 1)
        break
      case 'Enter':
      case ' ':
        if (focusedIndex >= 0 && focusedIndex < totalItems) {
          e.preventDefault()
          toggleItem(allItems[focusedIndex].id)
        }
        break
      case 'Escape':
        e.preventDefault()
        setShowDropdown(false)
        break
    }
  }, [allItems, focusedIndex, setShowDropdown])

  const toggleItem = (id: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Parse session name from ctt-ProfileName-shortId format
  function parseSessionName(session: string): string {
    const parts = session.split('-')
    if (parts.length >= 2) {
      const profileName = parts[1]
      const shortId = parts.length >= 3 ? parts.slice(2).join('-').slice(0, 6) : ''
      return shortId ? `${profileName} (${shortId})` : profileName
    }
    return session
  }

  // Get selected items by section
  const getSelectedBySection = (section: IndicatorSection) => {
    return allItems.filter(item =>
      item.section === section && selectedItems.has(item.id)
    )
  }

  // Handle Restore All - return all popout and 3D sessions
  const handleRestoreAll = async () => {
    let restored = 0

    // Return all popout sessions
    for (const session of popoutSessions) {
      try {
        await onReturnFromPopout(session)
        restored++
      } catch (e) {
        console.warn('[UnifiedIndicators] Failed to return popout:', e)
      }
    }

    // Return all 3D sessions
    for (const session of focusedIn3DSessions) {
      try {
        onReturnFrom3D(session.id)
        restored++
      } catch (e) {
        console.warn('[UnifiedIndicators] Failed to return 3D:', e)
      }
    }

    if (restored > 0) {
      setStatusMessage({ text: `Restored ${restored} session(s)`, type: 'success' })
    }
  }

  // Handle actions for selected items
  const handleReturnSelected = async () => {
    const selectedPopouts = getSelectedBySection('popout')
    const selected3D = getSelectedBySection('3d')
    let returned = 0

    for (const item of selectedPopouts) {
      if (item.session) {
        try {
          await onReturnFromPopout(item.session)
          returned++
        } catch (e) {
          console.warn('[UnifiedIndicators] Failed to return popout:', e)
        }
      }
    }

    for (const item of selected3D) {
      if (item.session) {
        try {
          onReturnFrom3D(item.session.id)
          returned++
        } catch (e) {
          console.warn('[UnifiedIndicators] Failed to return 3D:', e)
        }
      }
    }

    if (returned > 0) {
      setSelectedItems(new Set())
      setStatusMessage({ text: `Returned ${returned} session(s)`, type: 'success' })
    }
  }

  const handleReattachSelected = async () => {
    const selectedGhosts = getSelectedBySection('ghost')
    if (selectedGhosts.length === 0) return

    const sessionNames = selectedGhosts.map(item => item.id.replace('ghost-', ''))
    const result = await onReattach(sessionNames)

    if (result.success) {
      setSelectedItems(new Set())
      setStatusMessage({ text: result.message, type: 'success' })
    } else {
      setStatusMessage({ text: result.message, type: 'error' })
    }
  }

  const handleKillSelected = async () => {
    const selectedGhosts = getSelectedBySection('ghost')
    if (selectedGhosts.length === 0) return

    const sessionNames = selectedGhosts.map(item => item.id.replace('ghost-', ''))
    const confirmed = window.confirm(`Kill ${sessionNames.length} session(s)? This cannot be undone.`)

    if (confirmed) {
      const result = await onKill(sessionNames)
      if (result.success) {
        setSelectedItems(new Set())
        setStatusMessage({ text: result.message, type: 'success' })
      } else {
        setStatusMessage({ text: result.message, type: 'error' })
      }
    }
  }

  // Count selected by section for action buttons
  const selectedGhostCount = getSelectedBySection('ghost').length
  const selectedReturnableCount = getSelectedBySection('popout').length + getSelectedBySection('3d').length

  if (totalCount === 0) return null

  // Determine badge color based on what's present
  // Priority: ghost (purple) > popout (blue) > 3d (cyan)
  const badgeColors = orphanedCount > 0
    ? 'bg-purple-500/20 text-purple-400 border-purple-500/30 hover:bg-purple-500/30'
    : popoutCount > 0
    ? 'bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30'
    : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/30'

  // Badge icon
  const badgeIcon = orphanedCount > 0 ? '👻' : popoutCount > 0 ? '🪟' : '🧊'

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation()
          setShowDropdown(!showDropdown)
          if (!showDropdown) {
            onRefresh()
          }
        }}
        className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs border transition-colors ${badgeColors}`}
        title={`${totalCount} terminal(s) outside sidebar - click to manage`}
        aria-label={`${totalCount} terminals outside sidebar. Click to manage.`}
        aria-expanded={showDropdown}
        aria-haspopup="menu"
      >
        <span aria-hidden="true">{badgeIcon}</span>
        <span>{totalCount}</span>
      </button>

      {showDropdown && (
        <div
          className="absolute right-0 top-full mt-1 bg-[#1a1a1a] border border-gray-700 rounded-md shadow-2xl min-w-[300px] z-50 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={handleKeyDown}
          tabIndex={-1}
        >
          {/* Header */}
          <div className="px-3 py-2 border-b border-gray-800 flex items-center justify-between">
            <span className="text-sm font-medium text-white">
              Outside Sidebar ({totalCount})
            </span>
            <button
              onClick={() => onRefresh()}
              className="text-xs text-gray-400 hover:text-white transition-colors"
              title="Refresh"
              aria-label="Refresh session list"
            >
              {isLoading ? '...' : '↻'}
            </button>
          </div>

          {/* Scrollable list */}
          <div className="max-h-[280px] overflow-y-auto">
            {/* Ghost Section - Detached Sessions */}
            {orphanedCount > 0 && (
              <div>
                <div className="px-3 py-1.5 bg-purple-500/10 border-b border-gray-800">
                  <span className="text-xs font-medium text-purple-400 flex items-center gap-1.5">
                    <span>👻</span> Detached ({orphanedCount})
                  </span>
                </div>
                {orphanedSessions.map((session, index) => {
                  const itemId = `ghost-${session}`
                  const globalIndex = index
                  const isFocused = focusedIndex === globalIndex
                  const isSelected = selectedItems.has(itemId)

                  return (
                    <button
                      key={itemId}
                      ref={(el) => { if (el) itemRefs.current.set(globalIndex, el) }}
                      onClick={() => toggleItem(itemId)}
                      className={`w-full px-3 py-2 text-left text-xs transition-colors flex items-center gap-2 ${
                        isSelected
                          ? 'text-purple-400 bg-purple-500/10'
                          : 'text-gray-300 hover:bg-white/5'
                      } ${isFocused ? 'bg-purple-500/20 outline outline-2 outline-purple-500/50' : ''}`}
                      aria-label={`${isSelected ? 'Deselect' : 'Select'} detached session ${parseSessionName(session)}`}
                      aria-pressed={isSelected}
                    >
                      <span className="w-4 flex-shrink-0" aria-hidden="true">
                        {isSelected ? '☑' : '☐'}
                      </span>
                      <span className="truncate flex-1 font-mono">{parseSessionName(session)}</span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Popout Section */}
            {popoutCount > 0 && (
              <div>
                <div className="px-3 py-1.5 bg-blue-500/10 border-b border-gray-800">
                  <span className="text-xs font-medium text-blue-400 flex items-center gap-1.5">
                    <span>🪟</span> Popout Windows ({popoutCount})
                  </span>
                </div>
                {popoutSessions.map((session, index) => {
                  const itemId = `popout-${session.id}`
                  const globalIndex = orphanedCount + index
                  const isFocused = focusedIndex === globalIndex
                  const isSelected = selectedItems.has(itemId)

                  return (
                    <button
                      key={itemId}
                      ref={(el) => { if (el) itemRefs.current.set(globalIndex, el) }}
                      onClick={() => toggleItem(itemId)}
                      className={`w-full px-3 py-2 text-left text-xs transition-colors flex items-center gap-2 ${
                        isSelected
                          ? 'text-blue-400 bg-blue-500/10'
                          : 'text-gray-300 hover:bg-white/5'
                      } ${isFocused ? 'bg-blue-500/20 outline outline-2 outline-blue-500/50' : ''}`}
                      aria-label={`${isSelected ? 'Deselect' : 'Select'} popout ${session.name}`}
                      aria-pressed={isSelected}
                    >
                      <span className="w-4 flex-shrink-0" aria-hidden="true">
                        {isSelected ? '☑' : '☐'}
                      </span>
                      <span className="truncate flex-1">{session.name}</span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* 3D Focus Section */}
            {focusedIn3DCount > 0 && (
              <div>
                <div className="px-3 py-1.5 bg-cyan-500/10 border-b border-gray-800">
                  <span className="text-xs font-medium text-cyan-400 flex items-center gap-1.5">
                    <span>🧊</span> 3D Focus ({focusedIn3DCount})
                  </span>
                </div>
                {focusedIn3DSessions.map((session, index) => {
                  const itemId = `3d-${session.id}`
                  const globalIndex = orphanedCount + popoutCount + index
                  const isFocused = focusedIndex === globalIndex
                  const isSelected = selectedItems.has(itemId)

                  return (
                    <button
                      key={itemId}
                      ref={(el) => { if (el) itemRefs.current.set(globalIndex, el) }}
                      onClick={() => toggleItem(itemId)}
                      className={`w-full px-3 py-2 text-left text-xs transition-colors flex items-center gap-2 ${
                        isSelected
                          ? 'text-cyan-400 bg-cyan-500/10'
                          : 'text-gray-300 hover:bg-white/5'
                      } ${isFocused ? 'bg-cyan-500/20 outline outline-2 outline-cyan-500/50' : ''}`}
                      aria-label={`${isSelected ? 'Deselect' : 'Select'} 3D focus ${session.name}`}
                      aria-pressed={isSelected}
                    >
                      <span className="w-4 flex-shrink-0" aria-hidden="true">
                        {isSelected ? '☑' : '☐'}
                      </span>
                      <span className="truncate flex-1">{session.name}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div className={`px-3 py-2 text-xs ${
              statusMessage.type === 'success'
                ? 'bg-green-500/10 text-green-400 border-t border-green-500/30'
                : 'bg-red-500/10 text-red-400 border-t border-red-500/30'
            }`}>
              {statusMessage.type === 'success' ? '✓' : '✗'} {statusMessage.text}
            </div>
          )}

          {/* Action Buttons */}
          <div className="px-3 py-2 border-t border-gray-800 flex flex-col gap-2">
            {/* Ghost actions row */}
            {selectedGhostCount > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={handleReattachSelected}
                  className="flex-1 px-3 py-1.5 text-xs rounded bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/30 hover:bg-[#00ff88]/30 transition-colors"
                  aria-label={`Reattach ${selectedGhostCount} detached session(s)`}
                >
                  Reattach ({selectedGhostCount})
                </button>
                <button
                  onClick={handleKillSelected}
                  className="flex-1 px-3 py-1.5 text-xs rounded bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors"
                  aria-label={`Kill ${selectedGhostCount} detached session(s)`}
                >
                  Kill ({selectedGhostCount})
                </button>
              </div>
            )}

            {/* Return selected (popout/3D) */}
            {selectedReturnableCount > 0 && (
              <button
                onClick={handleReturnSelected}
                className="w-full px-3 py-1.5 text-xs rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 transition-colors"
                aria-label={`Return ${selectedReturnableCount} session(s) to sidebar`}
              >
                Return to Sidebar ({selectedReturnableCount})
              </button>
            )}

            {/* Restore All - when popout or 3D sessions exist */}
            {(popoutCount > 0 || focusedIn3DCount > 0) && (
              <button
                onClick={handleRestoreAll}
                className="w-full px-3 py-1.5 text-xs rounded bg-white/10 text-gray-300 border border-gray-600 hover:bg-white/20 transition-colors"
                aria-label="Restore all popout and 3D sessions to sidebar"
              >
                Restore All ({popoutCount + focusedIn3DCount})
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
