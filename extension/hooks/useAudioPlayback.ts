import { useEffect, useState, useCallback, useRef } from 'react'
import type { Profile, AudioSettings } from '../components/SettingsModal'
import { playLowPriority, isHighPriorityPlaying } from '../utils/audioManager'
import { stripEmojis } from '../utils/audioTextFormatting'
import { VOICE_POOL, DEFAULT_AUDIO_SETTINGS } from '../constants/audioVoices'

export interface TerminalSession {
  id: string
  name: string
  profile?: Profile
  assignedVoice?: string
}

export interface UseAudioPlaybackParams {
  sessions: TerminalSession[]
}

export interface UseAudioPlaybackReturn {
  audioSettings: AudioSettings
  audioGlobalMute: boolean
  setAudioGlobalMute: (mute: boolean) => void
  settingsLoaded: boolean
  getNextAvailableVoice: () => string
  getAudioSettingsForProfile: (profile?: Profile, assignedVoice?: string) => {
    voice: string
    rate: string
    pitch: string
    volume: number
    enabled: boolean
  }
  playAudio: (
    text: string,
    session?: TerminalSession,
    isToolAnnouncement?: boolean,
    overrides?: { pitch?: string; rate?: string }
  ) => Promise<void>
}

/**
 * Hook to manage audio playback, settings, and voice assignment.
 * Handles Chrome storage sync, debouncing, and TTS API calls.
 */
export function useAudioPlayback({ sessions }: UseAudioPlaybackParams): UseAudioPlaybackReturn {
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(DEFAULT_AUDIO_SETTINGS)
  const [audioGlobalMute, setAudioGlobalMute] = useState(false)
  const [settingsLoaded, setSettingsLoaded] = useState(false)

  // Debounce refs
  const lastAudioTimeRef = useRef<number>(0)
  const lastToolAudioTimeRef = useRef<number>(0)
  const isMountedRef = useRef(true)

  // Load audio settings from Chrome storage
  useEffect(() => {
    isMountedRef.current = true

    chrome.storage.local.get(['audioSettings', 'audioGlobalMute'], (result) => {
      if (!isMountedRef.current) return

      if (result.audioSettings && typeof result.audioSettings === 'object') {
        setAudioSettings(prev => ({ ...prev, ...(result.audioSettings as Partial<AudioSettings>) }))
      }
      if (typeof result.audioGlobalMute === 'boolean') {
        setAudioGlobalMute(result.audioGlobalMute)
      }
      setSettingsLoaded(true)
    })

    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Save audio mute state when it changes
  useEffect(() => {
    chrome.storage.local.set({ audioGlobalMute })
  }, [audioGlobalMute])

  // Listen for audioSettings changes from settings modal
  useEffect(() => {
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (!isMountedRef.current) return
      if (changes.audioSettings?.newValue && typeof changes.audioSettings.newValue === 'object') {
        setAudioSettings(prev => ({ ...prev, ...(changes.audioSettings.newValue as Partial<AudioSettings>) }))
      }
    }
    chrome.storage.onChanged.addListener(handleStorageChange)
    return () => chrome.storage.onChanged.removeListener(handleStorageChange)
  }, [])

  // Get the next available voice from the pool (round-robin based on active sessions)
  const getNextAvailableVoice = useCallback((): string => {
    const usedVoices = sessions
      .filter(s => s.assignedVoice)
      .map(s => s.assignedVoice!)

    // Find first unused voice
    for (const voice of VOICE_POOL) {
      if (!usedVoices.includes(voice)) {
        return voice
      }
    }

    // All voices used - pick based on session count (round-robin)
    return VOICE_POOL[sessions.length % VOICE_POOL.length]
  }, [sessions])

  // Get merged audio settings for a profile (global + profile overrides)
  // Logic matrix:
  // | Header Mute | Profile Mode | Result |
  // |-------------|--------------|--------|
  // | OFF         | default      | Plays (if audioSettings.enabled) |
  // | OFF         | enabled      | Plays |
  // | OFF         | disabled     | Silent |
  // | ON          | default      | Silent (master mute) |
  // | ON          | enabled      | Silent (master mute) |
  // | ON          | disabled     | Silent |
  const getAudioSettingsForProfile = useCallback((
    profile?: Profile,
    assignedVoice?: string
  ): { voice: string; rate: string; pitch: string; volume: number; enabled: boolean } => {
    const overrides = profile?.audioOverrides
    const mode = overrides?.mode || 'default'

    // Determine if audio is enabled for this profile
    let enabled = false
    if (mode === 'disabled') {
      enabled = false
    } else if (audioGlobalMute) {
      enabled = false
    } else if (mode === 'enabled') {
      enabled = true
    } else {
      // mode === 'default' - follow global settings
      enabled = audioSettings.enabled
    }

    // Determine voice: profile override > global setting > auto-assigned fallback
    let voice: string
    if (overrides?.voice) {
      voice = overrides.voice
    } else if (audioSettings.voice === 'random') {
      voice = assignedVoice || VOICE_POOL[0]
    } else if (audioSettings.voice) {
      voice = audioSettings.voice
    } else {
      voice = assignedVoice || 'en-US-AndrewMultilingualNeural'
    }

    return {
      voice,
      rate: overrides?.rate || audioSettings.rate,
      pitch: overrides?.pitch || audioSettings.pitch,
      volume: audioSettings.volume,
      enabled,
    }
  }, [audioGlobalMute, audioSettings])

  // Audio playback helper - plays MP3 from backend cache via Chrome
  // Uses low priority - will be skipped if high-priority audio is playing
  const playAudio = useCallback(async (
    text: string,
    session?: TerminalSession,
    isToolAnnouncement = false,
    overrides?: { pitch?: string; rate?: string }
  ) => {
    const settings = getAudioSettingsForProfile(session?.profile, session?.assignedVoice)
    if (!settings.enabled) return

    // Skip if high-priority audio is playing
    if (isHighPriorityPlaying()) {
      console.log('[Audio] Skipping status update - high-priority audio playing')
      return
    }

    // Strip emojis for cleaner TTS
    const cleanText = stripEmojis(text)

    // Debounce: use separate timers for tools vs other announcements
    const now = Date.now()
    if (isToolAnnouncement) {
      const timeSinceLast = now - lastToolAudioTimeRef.current
      if (timeSinceLast < audioSettings.toolDebounceMs) return
      lastToolAudioTimeRef.current = now
    } else {
      const timeSinceLast = now - lastAudioTimeRef.current
      if (timeSinceLast < 1000) return
      lastAudioTimeRef.current = now
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000)

      const response = await fetch('http://localhost:8129/api/audio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: cleanText,
          voice: settings.voice,
          rate: overrides?.rate || settings.rate,
          pitch: overrides?.pitch || settings.pitch
        }),
        signal: controller.signal
      })
      clearTimeout(timeoutId)

      const data = await response.json()

      if (data.success && data.url) {
        playLowPriority(data.url, settings.volume)
      }
    } catch {
      // Silently ignore errors to prevent console spam
    }
  }, [getAudioSettingsForProfile, audioSettings.toolDebounceMs])

  return {
    audioSettings,
    audioGlobalMute,
    setAudioGlobalMute,
    settingsLoaded,
    getNextAvailableVoice,
    getAudioSettingsForProfile,
    playAudio,
  }
}
