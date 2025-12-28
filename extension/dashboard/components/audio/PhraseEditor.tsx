import React, { useRef } from 'react'
import { RotateCcw } from 'lucide-react'
import { getAvailableVariables, getDefaultPhrase, renderPreview } from '../../../utils/audioTemplates'

interface PhraseEditorProps {
  eventType: string
  phraseTemplate?: string
  onChange: (template: string | undefined) => void
}

export default function PhraseEditor({
  eventType,
  phraseTemplate,
  onChange,
}: PhraseEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const defaultPhrase = getDefaultPhrase(eventType)
  const availableVariables = getAvailableVariables(eventType)
  const currentTemplate = phraseTemplate || defaultPhrase
  const isCustom = phraseTemplate !== undefined

  const handleInsertVariable = (variable: string) => {
    const input = inputRef.current
    if (!input) return

    const start = input.selectionStart || 0
    const end = input.selectionEnd || 0
    const currentValue = input.value

    // Insert variable at cursor position
    const newValue = currentValue.slice(0, start) + variable + currentValue.slice(end)
    onChange(newValue)

    // Restore cursor position after the inserted variable
    setTimeout(() => {
      input.focus()
      const newPosition = start + variable.length
      input.setSelectionRange(newPosition, newPosition)
    }, 0)
  }

  const handleReset = () => {
    onChange(undefined)
  }

  const preview = renderPreview(currentTemplate, eventType)

  return (
    <div className="space-y-3">
      <label className="block text-xs font-medium text-muted-foreground">
        Custom Phrase {!isCustom && '(using default)'}
      </label>

      {/* Input with reset button */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={phraseTemplate ?? ''}
          onChange={(e) => onChange(e.target.value || undefined)}
          placeholder={defaultPhrase}
          className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
        {isCustom && (
          <button
            onClick={handleReset}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title="Reset to default"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Variable chips */}
      <div className="flex flex-wrap gap-2">
        {availableVariables.map((variable) => (
          <button
            key={variable}
            onClick={() => handleInsertVariable(variable)}
            className="px-2 py-1 text-xs bg-primary/20 text-primary rounded-full hover:bg-primary/30 transition-colors"
          >
            {variable}
          </button>
        ))}
      </div>

      {/* Preview */}
      <div className="text-xs text-muted-foreground">
        Preview: <span className="text-foreground/80">"{preview}"</span>
      </div>
    </div>
  )
}
