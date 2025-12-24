import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, Plus, X } from 'lucide-react'

interface CategoryComboboxProps {
  value: string
  onChange: (value: string) => void
  categories: string[]
  placeholder?: string
}

export function CategoryCombobox({
  value,
  onChange,
  categories,
  placeholder = 'Select or create category...',
}: CategoryComboboxProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setIsCreatingNew(false)
        setInputValue('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus input when entering create mode
  useEffect(() => {
    if (isCreatingNew && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isCreatingNew])

  const handleSelect = (category: string) => {
    onChange(category)
    setIsOpen(false)
    setIsCreatingNew(false)
    setInputValue('')
  }

  const handleCreateNew = () => {
    if (inputValue.trim()) {
      onChange(inputValue.trim())
      setIsOpen(false)
      setIsCreatingNew(false)
      setInputValue('')
    }
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
    setIsOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault()
      handleCreateNew()
    } else if (e.key === 'Escape') {
      setIsCreatingNew(false)
      setInputValue('')
      setIsOpen(false)
    }
  }

  // Filter categories based on input when creating new
  const filteredCategories = isCreatingNew && inputValue
    ? categories.filter(cat =>
        cat.toLowerCase().includes(inputValue.toLowerCase())
      )
    : categories

  // Check if input matches an existing category
  const inputMatchesExisting = inputValue.trim() &&
    categories.some(cat => cat.toLowerCase() === inputValue.trim().toLowerCase())

  return (
    <div ref={containerRef} className="relative">
      {/* Main button/display */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 bg-black/50 border border-gray-700 rounded text-sm text-left flex items-center justify-between focus:border-[#00ff88] focus:outline-none transition-colors"
      >
        <span className={value ? 'text-white' : 'text-gray-500'}>
          {value || placeholder}
        </span>
        <div className="flex items-center gap-1">
          {value && (
            <span
              role="button"
              onClick={handleClear}
              className="p-0.5 hover:bg-gray-700 rounded transition-colors"
            >
              <X className="h-3.5 w-3.5 text-gray-400 hover:text-gray-200" />
            </span>
          )}
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-gray-900 border border-gray-700 rounded-lg shadow-xl overflow-hidden">
          {/* Existing categories */}
          {filteredCategories.length > 0 && (
            <div className="max-h-48 overflow-y-auto">
              {filteredCategories.map(category => (
                <button
                  key={category}
                  type="button"
                  onClick={() => handleSelect(category)}
                  className={`w-full px-3 py-2 text-sm text-left hover:bg-[#00ff88]/10 transition-colors flex items-center gap-2 ${
                    value === category ? 'bg-[#00ff88]/20 text-[#00ff88]' : 'text-gray-300'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          )}

          {/* Divider */}
          {filteredCategories.length > 0 && <div className="border-t border-gray-700" />}

          {/* Create new option */}
          {isCreatingNew ? (
            <div className="p-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type new category name..."
                className="w-full px-3 py-2 bg-black/50 border border-gray-600 rounded text-white text-sm focus:border-[#00ff88] focus:outline-none"
                autoFocus
              />
              {inputValue.trim() && !inputMatchesExisting && (
                <button
                  type="button"
                  onClick={handleCreateNew}
                  className="w-full mt-2 px-3 py-2 bg-[#00ff88]/20 hover:bg-[#00ff88]/30 text-[#00ff88] rounded text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Create "{inputValue.trim()}"
                </button>
              )}
              {inputMatchesExisting && (
                <p className="text-xs text-gray-400 mt-2 px-1">
                  Category already exists - select from list above
                </p>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsCreatingNew(true)}
              className="w-full px-3 py-2 text-sm text-left text-[#00ff88] hover:bg-[#00ff88]/10 transition-colors flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create new category...
            </button>
          )}
        </div>
      )}
    </div>
  )
}
