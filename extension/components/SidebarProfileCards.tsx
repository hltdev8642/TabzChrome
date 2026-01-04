import React from 'react'
import { Terminal, Pin } from 'lucide-react'
import type { Profile } from './settings/types'

interface SidebarProfileCardsProps {
  /** All profiles from storage */
  profiles: Profile[]
  /** ID of the default profile */
  defaultProfileId: string
  /** Callback when a profile card is clicked */
  onSpawnProfile: (profile: Profile) => void
  /** Category settings for colors */
  getCategoryColor?: (category: string) => string
}

/**
 * SidebarProfileCards - Displays pinned profiles as clickable cards in sidebar empty state
 *
 * Shows profiles that have `pinnedToNewTab: true` as quick-access cards.
 * If no profiles are pinned, shows the default profile instead.
 *
 * Features:
 * - Compact card layout optimized for sidebar width
 * - Shows profile name with optional emoji icon
 * - Category color accent on cards (matches newtab ProfilesGrid styling)
 * - Click to spawn terminal
 */
export function SidebarProfileCards({
  profiles,
  defaultProfileId,
  onSpawnProfile,
  getCategoryColor,
}: SidebarProfileCardsProps) {
  // Get pinned profiles, sorted with default first
  const pinnedProfiles = profiles
    .filter(p => p.pinnedToNewTab)
    .sort((a, b) => {
      if (a.id === defaultProfileId) return -1
      if (b.id === defaultProfileId) return 1
      return a.name.localeCompare(b.name)
    })

  // If no profiles are pinned, show the default profile (or first profile as fallback)
  const displayProfiles = pinnedProfiles.length > 0
    ? pinnedProfiles.slice(0, 6) // Limit to 6 for 2x3 grid
    : profiles.filter(p => p.id === defaultProfileId || profiles.indexOf(p) === 0).slice(0, 1)

  if (displayProfiles.length === 0) {
    return null
  }

  // Extract emoji from profile name if present
  const getProfileIcon = (name: string): { emoji: string | null; cleanName: string } => {
    // Match emoji at start of name (including emoji with variation selectors)
    const emojiMatch = name.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)\s*/u)
    if (emojiMatch) {
      return {
        emoji: emojiMatch[1],
        cleanName: name.slice(emojiMatch[0].length)
      }
    }
    return { emoji: null, cleanName: name }
  }

  return (
    <div className="w-full max-w-xs mx-auto">
      {/* Header */}
      <div className="flex items-center justify-center gap-2 mb-3 text-gray-500">
        <Pin className="w-3 h-3" />
        <span className="text-[10px] font-medium uppercase tracking-widest">
          {pinnedProfiles.length > 0 ? 'Pinned Profiles' : 'Quick Start'}
        </span>
      </div>

      {/* Profile Cards Grid - 2 columns for sidebar, 3px accent bar like newtab */}
      <div className="grid grid-cols-2 gap-2">
        {displayProfiles.map((profile, index) => {
          const { emoji, cleanName } = getProfileIcon(profile.name)
          const categoryColor = getCategoryColor?.(profile.category || '') || '#00ffd5'
          const isDefault = profile.id === defaultProfileId

          return (
            <button
              key={profile.id}
              onClick={() => onSpawnProfile(profile)}
              className="group relative flex flex-col items-center p-3 rounded-xl bg-[#0a0a0c] border border-[#222225] hover:border-[#333338] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg overflow-hidden"
              style={{
                // CSS custom property for category accent color
                '--card-accent': categoryColor,
              } as React.CSSProperties}
              title={`Spawn ${profile.name}${profile.command ? `\n$ ${profile.command}` : ''}`}
            >
              {/* Category color accent bar (3px, matches newtab) */}
              <div
                className="absolute top-0 left-0 right-0 h-[3px] opacity-60 group-hover:opacity-100 transition-opacity"
                style={{ backgroundColor: categoryColor }}
              />

              {/* Icon wrapper (36x36, matches newtab) */}
              <div
                className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#111114] mb-2"
                style={{ color: categoryColor }}
              >
                {emoji ? (
                  <span className="text-lg leading-none">{emoji}</span>
                ) : (
                  <Terminal className="w-4 h-4" />
                )}
              </div>

              {/* Name - JetBrains Mono style, proper truncation */}
              <div
                className="text-[11px] font-medium text-[#f0f0f0] text-center w-full overflow-hidden text-ellipsis whitespace-nowrap"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {cleanName || profile.name}
              </div>

              {/* Keyboard shortcut badge (top-right, matches newtab) */}
              {index < 6 && (
                <div
                  className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded bg-[#111114] border border-[#222225] text-gray-500"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {index + 1}
                </div>
              )}

              {/* Default badge (bottom-right, subtle) */}
              {isDefault && (
                <div className="absolute bottom-1.5 right-1.5 text-[8px] text-[#00ffd5]/70 uppercase tracking-wide">
                  def
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Hint to pin more profiles */}
      {pinnedProfiles.length === 0 && (
        <p className="text-[10px] text-gray-600 text-center mt-3">
          Pin profiles in Settings to show them here
        </p>
      )}
    </div>
  )
}
