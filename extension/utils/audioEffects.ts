/**
 * Audio effects utilities for playing sound effects
 * Supports preset sounds, URLs, and local files
 */

import type { SoundEffect } from '../components/settings/types'

const BACKEND_URL = 'http://localhost:8129'

/**
 * Get the playable URL for a sound effect
 * @param effect - The sound effect configuration
 * @returns URL to play, or null if not configured
 */
export function getSoundEffectUrl(effect: SoundEffect): string | null {
  switch (effect.type) {
    case 'preset':
      return effect.preset ? `${BACKEND_URL}/sounds/${effect.preset}.mp3` : null
    case 'url':
      return effect.url || null
    case 'file':
      return effect.filePath
        ? `${BACKEND_URL}/api/audio/local-file?path=${encodeURIComponent(effect.filePath)}`
        : null
    default:
      return null
  }
}

/**
 * Play a sound effect
 * @param effect - The sound effect configuration
 * @param globalSoundEffectsVolume - Global sound effects volume (0-1, from AudioSettings)
 * @returns Promise that resolves when playback completes
 */
export async function playSoundEffect(effect: SoundEffect, globalSoundEffectsVolume: number): Promise<void> {
  const url = getSoundEffectUrl(effect)
  if (!url) return

  return new Promise((resolve, reject) => {
    const audio = new Audio(url)
    // Apply global sound effects volume, then per-effect volume multiplier
    const effectVolume = effect.volume ?? 1.0
    audio.volume = Math.max(0, Math.min(1, globalSoundEffectsVolume * effectVolume))
    audio.onended = () => resolve()
    audio.onerror = (e) => {
      console.warn('[SoundEffect] Failed to play:', url, e)
      resolve() // Don't reject - allow TTS to continue if sound fails
    }
    audio.play().catch((e) => {
      console.warn('[SoundEffect] Play failed:', e)
      resolve()
    })
  })
}

/**
 * Preview a sound effect (for settings UI)
 * @param effect - The sound effect configuration
 * @param globalSoundEffectsVolume - Global sound effects volume (0-1)
 */
export async function previewSoundEffect(effect: SoundEffect, globalSoundEffectsVolume: number): Promise<void> {
  try {
    await playSoundEffect(effect, globalSoundEffectsVolume)
  } catch {
    // Ignore errors during preview
  }
}

/**
 * Check if a sound effect is configured (has a valid source)
 * @param effect - The sound effect configuration
 * @returns true if the effect has a valid source
 */
export function isSoundEffectConfigured(effect?: SoundEffect): boolean {
  if (!effect || effect.type === 'none') return false

  switch (effect.type) {
    case 'preset':
      return !!effect.preset
    case 'url':
      return !!effect.url
    case 'file':
      return !!effect.filePath
    default:
      return false
  }
}
