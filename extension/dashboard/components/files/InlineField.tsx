import React, { useState, useRef, useEffect } from 'react'

interface InlineFieldProps {
  fieldId: string
  hint?: string
  value: string
  onChange: (fieldId: string, value: string) => void
  onNavigate?: (direction: 'next' | 'prev') => void
  isActive?: boolean
}

export function InlineField({
  fieldId,
  hint,
  value,
  onChange,
  onNavigate,
  isActive,
}: InlineFieldProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync editValue when value prop changes
  useEffect(() => {
    setEditValue(value)
  }, [value])

  // Auto-focus when activated via tab navigation
  useEffect(() => {
    if (isActive && !isEditing) {
      setIsEditing(true)
    }
  }, [isActive])

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleClick = () => {
    setIsEditing(true)
  }

  const handleSave = () => {
    onChange(fieldId, editValue)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setEditValue(value) // Revert to original
      setIsEditing(false)
    } else if (e.key === 'Tab') {
      e.preventDefault()
      handleSave()
      onNavigate?.(e.shiftKey ? 'prev' : 'next')
    }
  }

  // Calculate input width based on content
  const getWidth = () => {
    const content = editValue || hint || fieldId
    const charWidth = 8
    const padding = 24
    const minWidth = 60
    const maxWidth = 300
    return Math.min(maxWidth, Math.max(minWidth, content.length * charWidth + padding))
  }

  const isEmpty = !value?.trim()
  const displayText = value?.trim() || hint || fieldId

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        placeholder={hint || fieldId}
        className="inline-block align-baseline px-2 py-0.5 mx-0.5 text-sm bg-pink-500/20 border border-pink-400/50 rounded focus:outline-none focus:ring-2 focus:ring-pink-400/50"
        style={{
          width: `${getWidth()}px`,
          fontFamily: 'inherit',
          fontSize: 'inherit',
          lineHeight: 'inherit',
        }}
      />
    )
  }

  return (
    <span
      onClick={handleClick}
      className={`inline-block align-baseline px-2 py-0.5 mx-0.5 text-sm rounded cursor-pointer transition-all ${
        isEmpty
          ? 'bg-pink-500/10 text-pink-400/70 border border-dashed border-pink-400/40 hover:bg-pink-500/20 hover:border-pink-400/60'
          : 'bg-pink-500/20 text-foreground border border-pink-400/30 hover:bg-pink-500/30'
      }`}
      title={`Click to edit: ${fieldId}`}
      style={{
        fontFamily: 'inherit',
        fontSize: 'inherit',
        lineHeight: 'inherit',
      }}
    >
      {displayText}
    </span>
  )
}
