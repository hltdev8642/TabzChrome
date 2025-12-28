// Profile utilities - shared helpers for profile migration and validation

import type { Profile, AudioMode } from '../components/settings/types'

/**
 * Migrates old profile formats to current schema.
 * Handles:
 * - Old 'theme' field → 'themeName' field
 * - Old audioOverrides format (enabled: boolean) → (mode: AudioMode)
 * - Missing required fields with defaults
 *
 * @param profiles - Raw profiles from storage (may be old format)
 * @returns Migrated profiles with all required fields
 */
export function migrateProfiles(profiles: any[]): Profile[] {
  return profiles.map(p => {
    // Convert old theme field to themeName
    let themeName = p.themeName
    if (!themeName && p.theme) {
      themeName = 'high-contrast' // Map old dark/light to high-contrast
    }

    // Migrate audioOverrides: convert enabled:false to mode:'disabled'
    let audioOverrides = p.audioOverrides
    if (audioOverrides) {
      const { enabled, events, ...rest } = audioOverrides
      // Convert enabled: false → mode: 'disabled'
      if (enabled === false) {
        audioOverrides = { ...rest, mode: 'disabled' as AudioMode }
      } else if (events !== undefined || enabled !== undefined) {
        // Remove old fields (events, enabled)
        audioOverrides = Object.keys(rest).length > 0 ? rest : undefined
      }
    }

    return {
      ...p,
      fontSize: p.fontSize ?? 16,
      fontFamily: p.fontFamily ?? 'monospace',
      themeName: themeName ?? 'high-contrast',
      theme: undefined, // Remove old field
      audioOverrides,
    }
  })
}

/**
 * Checks if any profiles need migration.
 *
 * @param profiles - Raw profiles from storage
 * @returns true if migration is needed
 */
export function profilesNeedMigration(profiles: any[]): boolean {
  return profiles.some(
    p => p.fontSize === undefined ||
         p.fontFamily === undefined ||
         p.themeName === undefined ||
         p.theme !== undefined ||
         (p.audioOverrides && (p.audioOverrides.enabled !== undefined || p.audioOverrides.events !== undefined))
  )
}

/**
 * Validates and returns a valid default profile ID.
 *
 * @param savedDefaultId - The saved default profile ID
 * @param profiles - Current list of profiles
 * @returns A valid profile ID (first profile if saved is invalid)
 */
export function getValidDefaultProfileId(savedDefaultId: string | undefined, profiles: Profile[]): string {
  const defaultId = savedDefaultId || 'default'
  const profileIds = profiles.map(p => p.id)

  if (profileIds.includes(defaultId)) {
    return defaultId
  }

  // Fallback to first profile or 'default'
  return profiles.length > 0 ? profiles[0].id : 'default'
}
