import React, { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Play, Volume2 } from 'lucide-react'
import type { SoundEffect, SoundEffectType, SoundPreset } from '../../../components/settings/types'
import { SOUND_PRESETS } from '../../../components/settings/types'
import { previewSoundEffect, isSoundEffectConfigured } from '../../../utils/audioEffects'

interface WordSubstitutionEditorProps {
  substitutions?: Record<string, SoundEffect>
  onChange: (substitutions: Record<string, SoundEffect> | undefined) => void
  volume: number
}

interface SubstitutionEntry {
  id: string  // Stable ID for React key
  word: string
  effect: SoundEffect
}

// Generate a stable ID for new entries
let nextId = 0
function generateId(): string {
  return `sub-${Date.now()}-${nextId++}`
}

// WordInput component that maintains local state until blur
function WordInput({
  initialValue,
  onCommit,
  placeholder,
}: {
  initialValue: string
  onCommit: (value: string) => void
  placeholder?: string
}) {
  const [value, setValue] = useState(initialValue)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync with external changes (e.g., when entry is first created)
  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  const handleBlur = () => {
    const trimmed = value.trim()
    if (trimmed && trimmed !== initialValue) {
      onCommit(trimmed)
    } else if (!trimmed) {
      // Reset to original if empty
      setValue(initialValue)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur()
    }
  }

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className="flex-1 px-2 py-1 bg-background border border-border rounded text-sm text-foreground focus:border-primary focus:outline-none"
    />
  )
}

export default function WordSubstitutionEditor({
  substitutions = {},
  onChange,
  volume,
}: WordSubstitutionEditorProps) {
  const [previewingWord, setPreviewingWord] = useState<string | null>(null)
  // Track stable IDs for each word to prevent React key issues
  const [wordIds, setWordIds] = useState<Record<string, string>>({})

  // Generate entries with stable IDs
  const entries: SubstitutionEntry[] = Object.entries(substitutions).map(([word, effect]) => {
    // Get or create a stable ID for this word
    let id = wordIds[word]
    if (!id) {
      id = generateId()
      // Update wordIds in next render cycle to avoid state update during render
      setTimeout(() => {
        setWordIds(prev => ({ ...prev, [word]: id }))
      }, 0)
    }
    return { id, word, effect }
  })

  const handleAddEntry = () => {
    const newWord = `word${entries.length + 1}`
    const newId = generateId()
    // Track the ID for the new word
    setWordIds(prev => ({ ...prev, [newWord]: newId }))
    onChange({
      ...substitutions,
      [newWord]: { type: 'preset', preset: 'beep' },
    })
  }

  const handleRemoveEntry = (word: string) => {
    const newSubs = { ...substitutions }
    delete newSubs[word]
    onChange(Object.keys(newSubs).length > 0 ? newSubs : undefined)
  }

  const handleWordChange = (oldWord: string, newWord: string) => {
    if (!newWord.trim() || newWord === oldWord) return

    const trimmedNew = newWord.trim()

    // Transfer the ID from old word to new word
    setWordIds(prev => {
      const newIds = { ...prev }
      if (prev[oldWord]) {
        newIds[trimmedNew] = prev[oldWord]
        delete newIds[oldWord]
      }
      return newIds
    })

    const newSubs: Record<string, SoundEffect> = {}
    for (const [key, value] of Object.entries(substitutions)) {
      if (key === oldWord) {
        newSubs[trimmedNew] = value
      } else {
        newSubs[key] = value
      }
    }
    onChange(newSubs)
  }

  const handleEffectTypeChange = (word: string, type: SoundEffectType) => {
    onChange({
      ...substitutions,
      [word]: {
        type,
        preset: type === 'preset' ? 'beep' : undefined,
        url: type === 'url' ? '' : undefined,
        filePath: type === 'file' ? '' : undefined,
      },
    })
  }

  const handlePresetChange = (word: string, preset: SoundPreset) => {
    onChange({
      ...substitutions,
      [word]: { ...substitutions[word], type: 'preset', preset },
    })
  }

  const handleUrlChange = (word: string, url: string) => {
    onChange({
      ...substitutions,
      [word]: { ...substitutions[word], type: 'url', url },
    })
  }

  const handleFilePathChange = (word: string, filePath: string) => {
    onChange({
      ...substitutions,
      [word]: { ...substitutions[word], type: 'file', filePath },
    })
  }

  const handlePreview = async (word: string, effect: SoundEffect) => {
    if (!isSoundEffectConfigured(effect) || previewingWord) return

    setPreviewingWord(word)
    try {
      await previewSoundEffect(effect, volume)
    } finally {
      setPreviewingWord(null)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-medium text-muted-foreground">
          Word Substitutions
        </label>
        <button
          onClick={handleAddEntry}
          className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
        >
          <Plus className="w-3 h-3" />
          Add
        </button>
      </div>

      {entries.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">
          No word substitutions. Add one to replace specific words with sounds.
        </p>
      ) : (
        <div className="space-y-3">
          {entries.map(({ id, word, effect }) => (
            <div
              key={id}
              className="p-3 bg-muted/30 rounded-lg border border-border space-y-2"
            >
              {/* Word and delete button */}
              <div className="flex items-center gap-2">
                <WordInput
                  initialValue={word}
                  onCommit={(newWord) => handleWordChange(word, newWord)}
                  placeholder="Word to replace"
                />
                <span className="text-xs text-muted-foreground">→</span>
                <button
                  onClick={() => handleRemoveEntry(word)}
                  className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                  title="Remove substitution"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Sound source */}
              <div className="flex gap-2">
                <select
                  value={effect.type}
                  onChange={(e) => handleEffectTypeChange(word, e.target.value as SoundEffectType)}
                  className="px-2 py-1 bg-background border border-border rounded text-xs text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="preset">Preset</option>
                  <option value="url">URL</option>
                  <option value="file">File</option>
                </select>

                {effect.type === 'preset' && (
                  <select
                    value={effect.preset || 'beep'}
                    onChange={(e) => handlePresetChange(word, e.target.value as SoundPreset)}
                    className="flex-1 px-2 py-1 bg-background border border-border rounded text-xs text-foreground focus:border-primary focus:outline-none"
                  >
                    {SOUND_PRESETS.map((preset) => (
                      <option key={preset} value={preset}>
                        {preset.charAt(0).toUpperCase() + preset.slice(1)}
                      </option>
                    ))}
                  </select>
                )}

                {effect.type === 'url' && (
                  <input
                    type="url"
                    value={effect.url || ''}
                    onChange={(e) => handleUrlChange(word, e.target.value)}
                    placeholder="https://..."
                    className="flex-1 px-2 py-1 bg-background border border-border rounded text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                  />
                )}

                {effect.type === 'file' && (
                  <input
                    type="text"
                    value={effect.filePath || ''}
                    onChange={(e) => handleFilePathChange(word, e.target.value)}
                    placeholder="~/sounds/..."
                    className="flex-1 px-2 py-1 bg-background border border-border rounded text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                  />
                )}

                <button
                  onClick={() => handlePreview(word, effect)}
                  disabled={previewingWord !== null || !isSoundEffectConfigured(effect)}
                  className="p-1 rounded bg-primary/20 text-primary hover:bg-primary/30 transition-colors disabled:opacity-50"
                  title="Preview sound"
                >
                  {previewingWord === word ? (
                    <Volume2 className="w-4 h-4 animate-pulse" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Words matching these patterns will play a sound instead of being spoken.
      </p>
    </div>
  )
}
