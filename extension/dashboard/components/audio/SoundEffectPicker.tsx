import React, { useState } from 'react'
import { Play, Volume2, FolderOpen } from 'lucide-react'
import type { SoundEffect, SoundMode, SoundEffectType, SoundPreset } from '../../../components/settings/types'
import { SOUND_PRESETS } from '../../../components/settings/types'
import { previewSoundEffect, isSoundEffectConfigured } from '../../../utils/audioEffects'

interface SoundEffectPickerProps {
  soundMode?: SoundMode
  soundEffect?: SoundEffect
  onModeChange: (mode: SoundMode) => void
  onEffectChange: (effect: SoundEffect | undefined) => void
  soundEffectsVolume: number  // Global sound effects volume for preview
  onBrowseFile?: () => void   // Optional callback to open file browser
}

const SOUND_MODE_LABELS: Record<SoundMode, string> = {
  tts: 'Text-to-Speech',
  sound: 'Sound Effect',
  both: 'Both',
}

export default function SoundEffectPicker({
  soundMode = 'tts',
  soundEffect,
  onModeChange,
  onEffectChange,
  soundEffectsVolume,
  onBrowseFile,
}: SoundEffectPickerProps) {
  const [previewPlaying, setPreviewPlaying] = useState(false)

  const handleTypeChange = (type: SoundEffectType) => {
    if (type === 'none') {
      onEffectChange(undefined)
    } else {
      onEffectChange({
        type,
        preset: type === 'preset' ? 'beep' : undefined,
        url: type === 'url' ? '' : undefined,
        filePath: type === 'file' ? '' : undefined,
        volume: 1.0,  // Default per-effect volume
      })
    }
  }

  const handlePresetChange = (preset: SoundPreset) => {
    onEffectChange({ ...soundEffect, type: 'preset', preset })
  }

  const handleUrlChange = (url: string) => {
    onEffectChange({ ...soundEffect, type: 'url', url })
  }

  const handleFilePathChange = (filePath: string) => {
    onEffectChange({ ...soundEffect, type: 'file', filePath })
  }

  const handleVolumeChange = (volume: number) => {
    if (!soundEffect) return
    onEffectChange({ ...soundEffect, volume })
  }

  const handlePreview = async () => {
    if (!soundEffect || !isSoundEffectConfigured(soundEffect) || previewPlaying) return

    setPreviewPlaying(true)
    try {
      await previewSoundEffect(soundEffect, soundEffectsVolume)
    } finally {
      setPreviewPlaying(false)
    }
  }

  const showSoundConfig = soundMode === 'sound' || soundMode === 'both'

  return (
    <div className="space-y-3">
      <label className="block text-xs font-medium text-muted-foreground">Sound Mode</label>

      {/* Mode selector */}
      <div className="flex gap-2">
        {(['tts', 'sound', 'both'] as SoundMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => onModeChange(mode)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              soundMode === mode
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80 text-muted-foreground'
            }`}
          >
            {SOUND_MODE_LABELS[mode]}
          </button>
        ))}
      </div>

      {/* Sound effect config (shown when mode is 'sound' or 'both') */}
      {showSoundConfig && (
        <div className="space-y-3 p-3 bg-muted/30 rounded-lg border border-border">
          {/* Source type selector */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Sound Source
            </label>
            <select
              value={soundEffect?.type || 'none'}
              onChange={(e) => handleTypeChange(e.target.value as SoundEffectType)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:border-primary focus:outline-none"
            >
              <option value="none">None (TTS only)</option>
              <option value="preset">Built-in Preset</option>
              <option value="url">URL</option>
              <option value="file">Local File</option>
            </select>
          </div>

          {/* Preset selector */}
          {soundEffect?.type === 'preset' && (
            <div className="flex gap-2">
              <select
                value={soundEffect.preset || 'beep'}
                onChange={(e) => handlePresetChange(e.target.value as SoundPreset)}
                className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:border-primary focus:outline-none"
              >
                {SOUND_PRESETS.map((preset) => (
                  <option key={preset} value={preset}>
                    {preset.charAt(0).toUpperCase() + preset.slice(1)}
                  </option>
                ))}
              </select>
              <button
                onClick={handlePreview}
                disabled={previewPlaying}
                className="p-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors disabled:opacity-50"
                title="Preview sound"
              >
                {previewPlaying ? (
                  <Volume2 className="w-4 h-4 animate-pulse" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </button>
            </div>
          )}

          {/* URL input */}
          {soundEffect?.type === 'url' && (
            <div className="flex gap-2">
              <input
                type="url"
                value={soundEffect.url || ''}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="https://example.com/sound.mp3"
                className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
              <button
                onClick={handlePreview}
                disabled={previewPlaying || !soundEffect.url}
                className="p-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors disabled:opacity-50"
                title="Preview sound"
              >
                {previewPlaying ? (
                  <Volume2 className="w-4 h-4 animate-pulse" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </button>
            </div>
          )}

          {/* Local file input */}
          {soundEffect?.type === 'file' && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={soundEffect.filePath || ''}
                  onChange={(e) => handleFilePathChange(e.target.value)}
                  placeholder="~/sounds/alert.mp3"
                  className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
                {onBrowseFile && (
                  <button
                    onClick={onBrowseFile}
                    className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                    title="Browse files"
                  >
                    <FolderOpen className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
                <button
                  onClick={handlePreview}
                  disabled={previewPlaying || !soundEffect.filePath}
                  className="p-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors disabled:opacity-50"
                  title="Preview sound"
                >
                  {previewPlaying ? (
                    <Volume2 className="w-4 h-4 animate-pulse" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Path to audio file. Supports ~/ for home directory. Formats: mp3, wav, ogg, m4a
              </p>
            </div>
          )}

          {/* Per-effect volume slider - shown when any source is configured */}
          {soundEffect && soundEffect.type !== 'none' && (
            <div className="pt-3 mt-3 border-t border-border/50">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Effect Volume
                </label>
                <span className="text-xs text-muted-foreground">
                  {Math.round((soundEffect.volume ?? 1.0) * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={soundEffect.volume ?? 1.0}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>0%</span>
                <span>100%</span>
                <span>200%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Adjust this effect's volume relative to global sound effects level
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
