import React, { useState, useEffect } from 'react'
import { Volume2, RefreshCw } from 'lucide-react'
import {
  AudioSettings,
  AudioEventSettings,
  AudioEventConfig,
  AudioEventType,
  TTS_VOICES,
  DEFAULT_AUDIO_SETTINGS,
} from '../../components/settings/types'
import EventCard from '../components/audio/EventCard'

export default function AudioSection() {
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(DEFAULT_AUDIO_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [audioTestPlaying, setAudioTestPlaying] = useState(false)

  // Load settings from Chrome storage
  useEffect(() => {
    const loadSettings = async () => {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage) {
          chrome.storage.local.get(['audioSettings'], (result: { audioSettings?: AudioSettings }) => {
            if (result.audioSettings) {
              setAudioSettings({ ...DEFAULT_AUDIO_SETTINGS, ...result.audioSettings })
            }
            setLoading(false)
          })
        } else {
          setLoading(false)
        }
      } catch (err) {
        console.error('Failed to load audio settings:', err)
        setLoading(false)
      }
    }
    loadSettings()
  }, [])

  // Listen for external changes to audio settings
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const listener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
        if (areaName !== 'local') return
        if (changes.audioSettings?.newValue) {
          setAudioSettings({ ...DEFAULT_AUDIO_SETTINGS, ...changes.audioSettings.newValue })
        }
      }
      chrome.storage.onChanged.addListener(listener)
      return () => chrome.storage.onChanged.removeListener(listener)
    }
  }, [])

  // Save settings to Chrome storage
  const saveSettings = (newSettings: AudioSettings) => {
    setAudioSettings(newSettings)
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ audioSettings: newSettings })
    }
  }

  const updateAudioSettings = (updates: Partial<AudioSettings>) => {
    saveSettings({ ...audioSettings, ...updates })
  }

  const updateAudioEvents = (updates: Partial<AudioEventSettings>) => {
    saveSettings({
      ...audioSettings,
      events: { ...audioSettings.events, ...updates },
    })
  }

  // Update per-event audio config (voice/rate/pitch overrides)
  const updateEventConfig = (eventType: AudioEventType, config: AudioEventConfig | undefined) => {
    const configKey = `${eventType}Config` as keyof AudioEventSettings
    saveSettings({
      ...audioSettings,
      events: { ...audioSettings.events, [configKey]: config },
    })
  }

  // Get config for an event type
  const getEventConfig = (eventType: AudioEventType): AudioEventConfig | undefined => {
    const configKey = `${eventType}Config` as keyof AudioEventSettings
    return audioSettings.events[configKey] as AudioEventConfig | undefined
  }

  const handleAudioTest = async () => {
    if (audioTestPlaying) return
    setAudioTestPlaying(true)

    try {
      // If voice is "random", pick a random voice for testing
      const testVoice = audioSettings.voice === 'random'
        ? TTS_VOICES[Math.floor(Math.random() * TTS_VOICES.length)].value
        : audioSettings.voice

      const response = await fetch('http://localhost:8129/api/audio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'Claude ready',
          voice: testVoice,
          rate: audioSettings.rate,
          pitch: audioSettings.pitch,
        }),
      })
      const data = await response.json()

      if (data.success && data.url) {
        const audio = new Audio(data.url)
        audio.volume = audioSettings.volume
        audio.onended = () => setAudioTestPlaying(false)
        audio.onerror = () => setAudioTestPlaying(false)
        await audio.play()
      } else {
        setAudioTestPlaying(false)
      }
    } catch (err) {
      console.error('[Audio] Test failed:', err)
      setAudioTestPlaying(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-mono text-primary terminal-glow flex items-center gap-3">
          <Volume2 className="w-8 h-8" />
          Audio
        </h1>
        <p className="text-muted-foreground mt-1">
          Play audio notifications when Claude Code status changes.
          Audio is generated using neural text-to-speech and played through Chrome.
        </p>
      </div>

      {/* Master Toggle */}
      <section className="mb-8">
        <div className="rounded-xl bg-card border border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Enable Audio Notifications</h3>
              <p className="text-sm text-muted-foreground mt-1">Master switch for all audio alerts</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={audioSettings.enabled}
                onChange={(e) => updateAudioSettings({ enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>
      </section>

      {/* Voice & Speed Settings */}
      <section className={`mb-8 ${!audioSettings.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
        <h2 className="text-lg font-semibold mb-4">Voice Settings</h2>
        <div className="rounded-xl bg-card border border-border p-6 space-y-6">
          {/* Voice Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Voice</label>
            <select
              value={audioSettings.voice}
              onChange={(e) => updateAudioSettings({ voice: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:border-primary focus:outline-none"
            >
              <option value="random">Random (unique per terminal)</option>
              {TTS_VOICES.map((voice) => (
                <option key={voice.value} value={voice.value}>
                  {voice.label}
                </option>
              ))}
            </select>
            {audioSettings.voice === 'random' && (
              <p className="text-xs text-muted-foreground mt-2">
                Each terminal gets a unique voice. Helps distinguish multiple Claude sessions.
              </p>
            )}
          </div>

          {/* Rate Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Speech Rate</label>
              <span className="text-sm text-muted-foreground">{audioSettings.rate}</span>
            </div>
            <input
              type="range"
              min="-50"
              max="100"
              step="10"
              value={parseInt(audioSettings.rate)}
              onChange={(e) => {
                const val = parseInt(e.target.value)
                updateAudioSettings({ rate: val >= 0 ? `+${val}%` : `${val}%` })
              }}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>-50% (slower)</span>
              <span>0%</span>
              <span>+100% (faster)</span>
            </div>
          </div>

          {/* Pitch Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Pitch</label>
              <span className="text-sm text-muted-foreground">{audioSettings.pitch}</span>
            </div>
            <input
              type="range"
              min="0"
              max="300"
              step="50"
              value={parseInt(audioSettings.pitch)}
              onChange={(e) => {
                const val = parseInt(e.target.value)
                updateAudioSettings({ pitch: `+${val}Hz` })
              }}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>0Hz (default)</span>
              <span>+150Hz</span>
              <span>+300Hz (higher)</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Context alerts auto-elevate: warning (+100Hz, +15% rate), critical (+200Hz, +30% rate)
            </p>
          </div>

          {/* Volume Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Volume</label>
              <span className="text-sm text-muted-foreground">{Math.round(audioSettings.volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={audioSettings.volume}
              onChange={(e) => updateAudioSettings({ volume: parseFloat(e.target.value) })}
              className="w-full accent-primary"
            />
          </div>

          {/* Test Button */}
          <div className="pt-2">
            <button
              onClick={handleAudioTest}
              disabled={audioTestPlaying}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Volume2 className="h-4 w-4" />
              {audioTestPlaying ? 'Playing...' : 'Test Sound'}
            </button>
          </div>
        </div>
      </section>

      {/* Event Cards */}
      <section className={`mb-8 ${!audioSettings.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
        <h2 className="text-lg font-semibold mb-4">Events</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Click the arrow on any event to customize its voice, rate, and pitch.
        </p>
        <div className="rounded-xl bg-card border border-border divide-y divide-border">
          {/* Ready */}
          <EventCard
            eventType="ready"
            label="Ready notification"
            description="When Claude finishes and awaits input"
            enabled={audioSettings.events.ready}
            config={getEventConfig('ready')}
            onToggle={(checked) => updateAudioEvents({ ready: checked })}
            onConfigChange={(config) => updateEventConfig('ready', config)}
            volume={audioSettings.volume}
          />

          {/* Session Start */}
          <EventCard
            eventType="sessionStart"
            label="Session start"
            description="When a new Claude session begins"
            enabled={audioSettings.events.sessionStart}
            config={getEventConfig('sessionStart')}
            onToggle={(checked) => updateAudioEvents({ sessionStart: checked })}
            onConfigChange={(config) => updateEventConfig('sessionStart', config)}
            volume={audioSettings.volume}
          />

          {/* Tools */}
          <EventCard
            eventType="tools"
            label="Tool announcements"
            description={`"Reading", "Editing", "Searching"...`}
            enabled={audioSettings.events.tools}
            config={getEventConfig('tools')}
            onToggle={(checked) => updateAudioEvents({ tools: checked })}
            onConfigChange={(config) => updateEventConfig('tools', config)}
            volume={audioSettings.volume}
          >
            {/* Tool Details (nested under tools) */}
            {audioSettings.events.tools && (
              <div className="bg-muted/30 border-t border-border">
                <div className="flex items-center justify-between p-4 pl-8">
                  <div>
                    <span className="text-sm font-medium">Include file names</span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      "Reading settings.tsx", "Editing api.js"...
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={audioSettings.events.toolDetails}
                      onChange={(e) => updateAudioEvents({ toolDetails: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-muted rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>
            )}
          </EventCard>

          {/* Subagents */}
          <EventCard
            eventType="subagents"
            label="Subagent activity"
            description={`"Spawning agent", agent count changes`}
            enabled={audioSettings.events.subagents}
            config={getEventConfig('subagents')}
            onToggle={(checked) => updateAudioEvents({ subagents: checked })}
            onConfigChange={(config) => updateEventConfig('subagents', config)}
            volume={audioSettings.volume}
          />

          {/* Context Warning */}
          <EventCard
            eventType="contextWarning"
            label="Context warning"
            description={<>Alert when context reaches <span className="text-yellow-400">50%</span></>}
            enabled={audioSettings.events.contextWarning}
            config={getEventConfig('contextWarning')}
            onToggle={(checked) => updateAudioEvents({ contextWarning: checked })}
            onConfigChange={(config) => updateEventConfig('contextWarning', config)}
            volume={audioSettings.volume}
          />

          {/* Context Critical */}
          <EventCard
            eventType="contextCritical"
            label="Context critical"
            description={<>Alert when context reaches <span className="text-red-400">75%</span></>}
            enabled={audioSettings.events.contextCritical}
            config={getEventConfig('contextCritical')}
            onToggle={(checked) => updateAudioEvents({ contextCritical: checked })}
            onConfigChange={(config) => updateEventConfig('contextCritical', config)}
            volume={audioSettings.volume}
          />

          {/* MCP Downloads */}
          <EventCard
            eventType="mcpDownloads"
            label="MCP downloads"
            description={`"Downloaded image.png" when files complete`}
            enabled={audioSettings.events.mcpDownloads}
            config={getEventConfig('mcpDownloads')}
            onToggle={(checked) => updateAudioEvents({ mcpDownloads: checked })}
            onConfigChange={(config) => updateEventConfig('mcpDownloads', config)}
            volume={audioSettings.volume}
          />
        </div>
      </section>

      {/* Tool Debounce (only shown if tools enabled) */}
      {audioSettings.enabled && audioSettings.events.tools && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Tool Debounce</h2>
          <div className="rounded-xl bg-card border border-border p-6">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Minimum time between announcements</label>
              <span className="text-sm text-muted-foreground">{audioSettings.toolDebounceMs}ms</span>
            </div>
            <input
              type="range"
              min="0"
              max="3000"
              step="250"
              value={audioSettings.toolDebounceMs}
              onChange={(e) => updateAudioSettings({ toolDebounceMs: parseInt(e.target.value) })}
              className="w-full accent-primary"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Prevents spam when Claude uses many tools in quick succession
            </p>
          </div>
        </section>
      )}

      {/* Info */}
      <section>
        <div className="rounded-xl bg-muted/50 border border-border p-4">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> Audio uses edge-tts neural voices. First playback may have a brief delay while audio is generated - subsequent plays are instant (cached).
          </p>
        </div>
      </section>
    </div>
  )
}
