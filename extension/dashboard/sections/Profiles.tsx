import React, { useEffect, useState, useRef } from 'react'
import { Grid, Grid3X3, List, Search, Play, RefreshCw, Terminal, Folder, X, Settings, GripVertical, Star, Copy, ClipboardType, Paperclip, Filter, Check } from 'lucide-react'
import { spawnTerminal, getProfiles } from '../hooks/useDashboard'
import { useWorkingDirectory } from '../../hooks/useWorkingDirectory'
import { useDragDrop } from '../../hooks/useDragDrop'
import type { Profile } from '../../components/SettingsModal'
import type { CategorySettings } from '../../components/settings/types'
import { sendMessage } from '../../shared/messaging'
import { getEffectiveWorkingDir } from '../../shared/utils'
import { themes } from '../../styles/themes'
import { getGradientCSS, DEFAULT_PANEL_COLOR, DEFAULT_TRANSPARENCY } from '../../styles/terminal-backgrounds'

const DEFAULT_CATEGORY_COLOR = '#6b7280'

type ViewMode = 'grid' | 'list'

// Helper to get media URL (matches Terminal.tsx pattern)
const getMediaUrl = (path: string | undefined): string | null => {
  if (!path) return null
  // If it's already a URL, use it directly
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('file://')) {
    return path
  }
  // For local paths, serve via backend endpoint
  return `http://localhost:8129/api/media?path=${encodeURIComponent(path)}`
}

export default function ProfilesSection() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [filterOpen, setFilterOpen] = useState(false)
  const [categorySettings, setCategorySettings] = useState<CategorySettings>({})
  const [defaultProfile, setDefaultProfile] = useState<string>('')
  const filterRef = useRef<HTMLDivElement>(null)

  // Category drag-and-drop state (using shared hook)
  const {
    draggedItem: draggedCategory,
    dragOverItem: dragOverCategory,
    dropPosition: categoryDropPosition,
    setDraggedItem: setDraggedCategory,
    setDragOverItem: setDragOverCategory,
    setDropPosition: setCategoryDropPosition,
    resetDragState: resetCategoryDragState,
  } = useDragDrop<string>()

  // Profile drag-and-drop state (using shared hook)
  const {
    draggedItem: draggedIndex,
    dragOverItem: dragOverIndex,
    dropPosition,
    setDraggedItem: setDraggedIndex,
    setDragOverItem: setDragOverIndex,
    setDropPosition,
    resetDragState: resetProfileDragState,
  } = useDragDrop<number>()

  // Working directory (dropdown is now in sidebar)
  const { globalWorkingDir } = useWorkingDirectory()

  const fetchProfiles = async () => {
    try {
      setLoading(true)
      const profilesList = await getProfiles()
      setProfiles(profilesList)
      setError(null)
    } catch (err) {
      setError('Failed to load profiles')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfiles()
  }, [])

  // Load category settings and default profile from Chrome storage
  useEffect(() => {
    chrome.storage.local.get(['categorySettings', 'defaultProfile'], (result: { categorySettings?: CategorySettings; defaultProfile?: string }) => {
      if (result.categorySettings) {
        setCategorySettings(result.categorySettings)
      }
      if (result.defaultProfile) {
        setDefaultProfile(result.defaultProfile)
      }
    })
  }, [])

  // Listen for Chrome storage changes to auto-update when profiles/settings change
  useEffect(() => {
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName !== 'local') return

      if (changes.profiles?.newValue) {
        setProfiles(changes.profiles.newValue as Profile[])
      }
      if (changes.categorySettings?.newValue) {
        setCategorySettings(changes.categorySettings.newValue as CategorySettings)
      }
      if (changes.defaultProfile?.newValue !== undefined) {
        setDefaultProfile(changes.defaultProfile.newValue as string)
      }
    }

    chrome.storage.onChanged.addListener(handleStorageChange)
    return () => chrome.storage.onChanged.removeListener(handleStorageChange)
  }, [])

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false)
      }
    }
    if (filterOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [filterOpen])

  // Helper to get category color
  const getCategoryColor = (category: string) => {
    return categorySettings[category]?.color || DEFAULT_CATEGORY_COLOR
  }

  // Get unique categories
  const categories = Array.from(new Set(profiles.map((p) => p.category).filter(Boolean))) as string[]

  // Toggle category selection (multi-select)
  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
  }

  // Filter profiles
  const filteredProfiles = profiles.filter((profile) => {
    const matchesSearch =
      !searchQuery ||
      profile.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile.command?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategories.length === 0 ||
      selectedCategories.includes(profile.category || 'Uncategorized')
    return matchesSearch && matchesCategory
  })

  // Group by category for display (tracking original index for drag-drop)
  const groupedProfiles = profiles.reduce(
    (acc, profile, originalIndex) => {
      // Apply filters
      const matchesSearch =
        !searchQuery ||
        profile.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        profile.command?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = selectedCategories.length === 0 ||
        selectedCategories.includes(profile.category || 'Uncategorized')
      if (!matchesSearch || !matchesCategory) return acc

      const cat = profile.category || 'Uncategorized'
      if (!acc[cat]) acc[cat] = []
      acc[cat].push({ profile, originalIndex })
      return acc
    },
    {} as Record<string, { profile: Profile; originalIndex: number }[]>
  )

  const launchProfile = async (profile: Profile) => {
    try {
      const effectiveWorkingDir = getEffectiveWorkingDir(profile.workingDir, globalWorkingDir)
      await spawnTerminal({
        name: profile.name,
        command: profile.command,
        workingDir: effectiveWorkingDir,
        profile: { ...profile, workingDir: effectiveWorkingDir },
      })
    } catch (err) {
      console.error('Launch error:', err)
    }
  }

  // Launch profile but paste command without executing (for TUIs/CLIs with flags)
  const launchProfilePasteOnly = async (profile: Profile) => {
    try {
      const effectiveWorkingDir = getEffectiveWorkingDir(profile.workingDir, globalWorkingDir)
      await spawnTerminal({
        name: profile.name,
        command: profile.command,
        workingDir: effectiveWorkingDir,
        profile: { ...profile, workingDir: effectiveWorkingDir },
        pasteOnly: true,
      })
    } catch (err) {
      console.error('Paste-only launch error:', err)
    }
  }

  // Open sidebar settings modal to edit a profile
  const editProfile = (profileId: string) => {
    sendMessage({ type: 'OPEN_SETTINGS_EDIT_PROFILE', profileId })
  }

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number, horizontal = false) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const rect = e.currentTarget.getBoundingClientRect()
    let position: 'above' | 'below'

    if (horizontal) {
      // For grid layout: detect left/right based on X position
      const midpoint = rect.left + rect.width / 2
      position = e.clientX < midpoint ? 'above' : 'below'
    } else {
      // For list layout: detect top/bottom based on Y position
      const midpoint = rect.top + rect.height / 2
      position = e.clientY < midpoint ? 'above' : 'below'
    }

    setDragOverIndex(index)
    setDropPosition(position)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
    setDropPosition(null)
  }

  const handleDrop = (index: number, targetCategory: string) => {
    if (draggedIndex === null || draggedIndex === index) {
      resetProfileDragState()
      return
    }

    const newProfiles = [...profiles]
    const [draggedProfile] = newProfiles.splice(draggedIndex, 1)

    // Update category if dropped into a different category
    const newCategory = targetCategory === 'Uncategorized' ? undefined : targetCategory
    if (draggedProfile.category !== newCategory) {
      draggedProfile.category = newCategory
    }

    // Calculate the actual insert index based on drop position
    let insertIndex = index
    if (dropPosition === 'below') {
      insertIndex = index + 1
    }
    // Adjust for the removed item if it was before the insert point
    if (draggedIndex < insertIndex) {
      insertIndex -= 1
    }

    newProfiles.splice(insertIndex, 0, draggedProfile)
    setProfiles(newProfiles)

    // Save to Chrome storage
    chrome.storage.local.set({ profiles: newProfiles })

    // Dispatch event so other components update
    window.dispatchEvent(new CustomEvent('categorySettingsChanged', { detail: categorySettings }))

    resetProfileDragState()
  }

  const handleDragEnd = () => {
    resetProfileDragState()
  }

  // Get sorted categories (by order, then alphabetically)
  const getSortedCategories = (): string[] => {
    const cats = Object.keys(groupedProfiles)
    return cats.sort((a, b) => {
      // Uncategorized always goes last
      if (a === 'Uncategorized' && b !== 'Uncategorized') return 1
      if (b === 'Uncategorized' && a !== 'Uncategorized') return -1
      // Use order from settings if available
      const orderA = categorySettings[a]?.order ?? Infinity
      const orderB = categorySettings[b]?.order ?? Infinity
      if (orderA !== orderB) return orderA - orderB
      return a.localeCompare(b)
    })
  }

  // Category drag-and-drop handlers
  const handleCategoryDragStart = (category: string) => {
    setDraggedCategory(category)
  }

  const handleCategoryDragOver = (e: React.DragEvent, category: string) => {
    e.preventDefault()
    if (draggedCategory === null || draggedCategory === category) return

    const rect = e.currentTarget.getBoundingClientRect()
    const midpoint = rect.top + rect.height / 2
    const position = e.clientY < midpoint ? 'above' : 'below'

    setDragOverCategory(category)
    setCategoryDropPosition(position)
  }

  const handleCategoryDragLeave = () => {
    setDragOverCategory(null)
    setCategoryDropPosition(null)
  }

  const handleCategoryDrop = (targetCategory: string) => {
    if (draggedCategory === null || draggedCategory === targetCategory) {
      resetCategoryDragState()
      return
    }

    const sortedCategories = getSortedCategories()
    const draggedIdx = sortedCategories.indexOf(draggedCategory)
    let targetIdx = sortedCategories.indexOf(targetCategory)

    if (draggedIdx === -1 || targetIdx === -1) {
      resetCategoryDragState()
      return
    }

    // Adjust for drop position
    if (categoryDropPosition === 'below') {
      targetIdx += 1
    }
    if (draggedIdx < targetIdx) {
      targetIdx -= 1
    }

    // Build new order
    const newOrder = sortedCategories.filter(c => c !== draggedCategory)
    newOrder.splice(targetIdx, 0, draggedCategory)

    // Update categorySettings with new orders
    const newSettings = { ...categorySettings }
    newOrder.forEach((category, index) => {
      if (category !== 'Uncategorized') {
        newSettings[category] = {
          ...newSettings[category],
          color: newSettings[category]?.color || DEFAULT_CATEGORY_COLOR,
          order: index,
        }
      }
    })

    setCategorySettings(newSettings)
    chrome.storage.local.set({ categorySettings: newSettings })
    window.dispatchEvent(new CustomEvent('categorySettingsChanged', { detail: newSettings }))

    resetCategoryDragState()
  }

  const handleCategoryDragEnd = () => {
    resetCategoryDragState()
  }

  // All categories including Uncategorized if there are uncategorized profiles
  const allCategories = [
    ...categories,
    ...(profiles.some(p => !p.category) ? ['Uncategorized'] : [])
  ]

  return (
    <div className="p-6">

      {/* Header with integrated search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        {/* Title */}
        <div className="min-w-0 flex-shrink-0">
          <h1 className="text-2xl sm:text-3xl font-bold font-mono text-primary terminal-glow truncate flex items-center gap-3">
            <Grid3X3 className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0" />
            Profiles
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {profiles.length} profile{profiles.length !== 1 ? 's' : ''} · {categories.length} categor{categories.length !== 1 ? 'ies' : 'y'}
          </p>
        </div>

        {/* Search bar with filter - grows to fill space */}
        <div className="relative flex-1 min-w-0" ref={filterRef}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search profiles..."
            className="w-full pl-9 pr-20 py-2 rounded-lg bg-card border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm transition-all"
          />
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            {/* Filter button */}
            <button
              onClick={() => setFilterOpen(!filterOpen)}
              className={`p-1.5 rounded-md transition-colors relative ${
                filterOpen || selectedCategories.length > 0
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
              title="Filter by category"
            >
              <Filter className="w-3.5 h-3.5" />
              {selectedCategories.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-medium flex items-center justify-center">
                  {selectedCategories.length}
                </span>
              )}
            </button>
          </div>

          {/* Filter dropdown */}
          {filterOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-card border border-border rounded-lg shadow-xl z-50 overflow-hidden">
              <div className="p-2 border-b border-border flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Categories</span>
                {selectedCategories.length > 0 && (
                  <button
                    onClick={() => setSelectedCategories([])}
                    className="text-xs text-primary hover:underline"
                  >
                    Clear all
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto p-1">
                {allCategories.map((cat) => {
                  const catColor = getCategoryColor(cat)
                  const isSelected = selectedCategories.includes(cat)
                  return (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                        isSelected ? 'bg-muted' : 'hover:bg-muted/50'
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: catColor }}
                      />
                      <span className="flex-1 text-left truncate">{cat}</span>
                      {isSelected && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* View toggle & refresh */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex bg-muted/50 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              title="Grid view"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={fetchProfiles}
            disabled={loading}
            className="p-2 rounded-lg bg-muted/50 hover:bg-muted disabled:opacity-50 transition-colors"
            title="Refresh profiles"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive mb-6">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Profiles Display */}
      {!loading && !error && (
        <div className="space-y-8">
          {getSortedCategories().map((category) => {
            const categoryProfiles = groupedProfiles[category]
            if (!categoryProfiles) return null
            const catColor = getCategoryColor(category)
            const isUncategorized = category === 'Uncategorized'
            return (
            <div key={category}>
              {/* Category Header */}
              <div
                draggable={!isUncategorized}
                onDragStart={() => !isUncategorized && handleCategoryDragStart(category)}
                onDragOver={(e) => !isUncategorized && handleCategoryDragOver(e, category)}
                onDragLeave={handleCategoryDragLeave}
                onDrop={() => !isUncategorized && handleCategoryDrop(category)}
                onDragEnd={handleCategoryDragEnd}
                className={`
                  relative flex items-center gap-2 mb-4 py-1 px-1 -mx-1 rounded transition-all
                  ${!isUncategorized ? 'cursor-grab active:cursor-grabbing' : ''}
                  ${draggedCategory === category ? 'opacity-50' : ''}
                  ${draggedCategory && draggedCategory !== category && !isUncategorized ? 'hover:bg-muted/50' : ''}
                `}
              >
                {/* Drop indicator - above */}
                {dragOverCategory === category && categoryDropPosition === 'above' && (
                  <div className="absolute -top-[3px] left-0 right-0 h-[2px] bg-primary rounded-full shadow-[0_0_6px_var(--primary)]" />
                )}
                {/* Drop indicator - below */}
                {dragOverCategory === category && categoryDropPosition === 'below' && (
                  <div className="absolute -bottom-[3px] left-0 right-0 h-[2px] bg-primary rounded-full shadow-[0_0_6px_var(--primary)]" />
                )}
                {!isUncategorized && (
                  <GripVertical className="w-4 h-4 text-muted-foreground/50 hover:text-muted-foreground flex-shrink-0" />
                )}
                <Folder className="w-5 h-5 flex-shrink-0" style={{ color: catColor }} />
                <h2 className="text-lg font-semibold">{category}</h2>
                <span className="text-sm text-muted-foreground">({categoryProfiles.length})</span>
              </div>

              {/* Grid View */}
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {categoryProfiles.map(({ profile, originalIndex }) => (
                    <ProfileCard
                      key={profile.id}
                      profile={profile}
                      originalIndex={originalIndex}
                      isDefault={profile.id === defaultProfile}
                      category={category}
                      onClick={() => launchProfile(profile)}
                      onPasteOnly={() => launchProfilePasteOnly(profile)}
                      onEdit={() => editProfile(profile.id)}
                      isDragging={draggedIndex === originalIndex}
                      isDragOver={dragOverIndex === originalIndex}
                      dropPosition={dragOverIndex === originalIndex ? dropPosition : null}
                      onDragStart={() => handleDragStart(originalIndex)}
                      onDragOver={(e) => handleDragOver(e, originalIndex, true)}
                      onDragLeave={handleDragLeave}
                      onDrop={(targetCategory) => handleDrop(originalIndex, targetCategory)}
                      onDragEnd={handleDragEnd}
                    />
                  ))}
                </div>
              ) : (
                /* List View */
                <div className="space-y-2">
                  {categoryProfiles.map(({ profile, originalIndex }) => (
                    <ProfileListItem
                      key={profile.id}
                      profile={profile}
                      originalIndex={originalIndex}
                      isDefault={profile.id === defaultProfile}
                      category={category}
                      onClick={() => launchProfile(profile)}
                      onPasteOnly={() => launchProfilePasteOnly(profile)}
                      onEdit={() => editProfile(profile.id)}
                      isDragging={draggedIndex === originalIndex}
                      isDragOver={dragOverIndex === originalIndex}
                      dropPosition={dragOverIndex === originalIndex ? dropPosition : null}
                      onDragStart={() => handleDragStart(originalIndex)}
                      onDragOver={(e) => handleDragOver(e, originalIndex)}
                      onDragLeave={handleDragLeave}
                      onDrop={(targetCategory) => handleDrop(originalIndex, targetCategory)}
                      onDragEnd={handleDragEnd}
                    />
                  ))}
                </div>
              )}
            </div>
          )})}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredProfiles.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Terminal className="w-12 h-12 mb-4" />
          <p>{searchQuery ? 'No profiles match your search' : 'No profiles found'}</p>
        </div>
      )}
    </div>
  )
}

interface ProfileCardProps {
  profile: Profile
  originalIndex: number
  isDefault: boolean
  category: string
  onClick: () => void
  onPasteOnly: () => void
  onEdit: () => void
  isDragging: boolean
  isDragOver: boolean
  dropPosition: 'above' | 'below' | null
  onDragStart: () => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: (targetCategory: string) => void
  onDragEnd: () => void
}

function ProfileCard({
  profile,
  isDefault,
  category,
  onClick,
  onPasteOnly,
  onEdit,
  isDragging,
  isDragOver,
  dropPosition,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: ProfileCardProps) {
  const [mediaError, setMediaError] = useState(false)

  // Extract emoji from name if present
  const emojiMatch = profile.name.match(/^(\p{Emoji})\s*/u)
  const emoji = emojiMatch?.[1]
  const displayName = emoji ? profile.name.replace(emojiMatch[0], '') : profile.name

  // Show truncated working dir if set (like sidebar: ./dirname)
  const truncatedDir = profile.workingDir && profile.workingDir !== '~'
    ? './' + profile.workingDir.split('/').filter(Boolean).pop()
    : null

  // Compute effective background (matching Terminal.tsx 3-layer system)
  const effectiveGradientKey = profile.backgroundGradient ?? themes[profile.themeName]?.dark.backgroundGradient
  const effectiveGradientCSS = getGradientCSS(effectiveGradientKey, true)
  const effectivePanelColor = profile.panelColor ?? DEFAULT_PANEL_COLOR
  const gradientOpacity = (profile.transparency ?? DEFAULT_TRANSPARENCY) / 100

  // Get theme foreground color for profile title
  const themeForeground = themes[profile.themeName]?.dark.colors.foreground ?? '#e0e0e0'

  // Background media (video/image)
  const mediaUrl = getMediaUrl(profile.backgroundMedia)
  const mediaOpacity = (profile.backgroundMediaOpacity ?? 50) / 100
  const showMedia = profile.backgroundMediaType && profile.backgroundMediaType !== 'none' && mediaUrl && !mediaError

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={() => onDrop(category)}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`
        group relative flex flex-col rounded-xl border transition-all overflow-hidden cursor-pointer min-h-[180px]
        ${isDragging ? 'opacity-50 border-primary scale-95' : 'border-border hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10'}
      `}
    >
      {/* Layer 1: Base panel color */}
      <div
        className="absolute inset-0 rounded-xl"
        style={{ backgroundColor: effectivePanelColor }}
      />
      {/* Layer 2: Background media (video or image) */}
      {showMedia && profile.backgroundMediaType === 'video' && (
        <video
          key={mediaUrl}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none rounded-xl"
          style={{ opacity: mediaOpacity, zIndex: 0 }}
          src={mediaUrl}
          autoPlay
          loop
          muted
          playsInline
          onError={() => setMediaError(true)}
        />
      )}
      {showMedia && profile.backgroundMediaType === 'image' && (
        <img
          key={mediaUrl}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none rounded-xl"
          style={{ opacity: mediaOpacity, zIndex: 0 }}
          src={mediaUrl}
          alt=""
          onError={() => setMediaError(true)}
        />
      )}
      {/* Layer 3: Gradient overlay with transparency */}
      <div
        className="absolute inset-0 rounded-xl"
        style={{ background: effectiveGradientCSS, opacity: gradientOpacity, zIndex: 1 }}
      />
      {/* Drop indicator line - left (for grid layout) */}
      {isDragOver && dropPosition === 'above' && (
        <div className="absolute -left-[3px] top-0 bottom-0 w-[3px] bg-green-500 rounded-full shadow-[0_0_8px_#22c55e] z-50" />
      )}
      {/* Drop indicator line - right (for grid layout) */}
      {isDragOver && dropPosition === 'below' && (
        <div className="absolute -right-[3px] top-0 bottom-0 w-[3px] bg-green-500 rounded-full shadow-[0_0_8px_#22c55e] z-50" />
      )}

      {/* Drag handle - top left corner */}
      <div
        className="absolute top-2 left-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          className="p-1 rounded-md hover:bg-white/20 cursor-grab active:cursor-grabbing transition-colors"
          title="Drag to reorder"
        >
          <GripVertical className="w-3.5 h-3.5 text-white/50" />
        </div>
      </div>

      {/* Reference link - top right corner */}
      {profile.reference && (
        <button
          className="absolute top-2 right-2 z-20 flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-medium hover:bg-blue-500/30 transition-colors"
          title={`Open: ${profile.reference}`}
          onClick={(e) => {
            e.stopPropagation()
            const ref = profile.reference!
            if (ref.startsWith('http://') || ref.startsWith('https://')) {
              // Open URL in new tab
              window.open(ref, '_blank')
            } else {
              // Open file in dashboard Files section (same pattern as sidebar)
              window.location.hash = `/files?path=${encodeURIComponent(ref)}`
            }
          }}
        >
          <Paperclip className="w-2.5 h-2.5" />
          Ref
        </button>
      )}

      {/* Main card content area - Layer 3: Content above background */}
      <div className="relative z-10 flex flex-col items-center p-4 pt-5 pb-3 flex-1">
        {/* Default badge - centered */}
        {isDefault && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-medium mb-2">
            <Star className="w-2.5 h-2.5 fill-current" />
            Default
          </div>
        )}

        {/* Icon */}
        <div className="w-14 h-14 flex items-center justify-center mb-3 rounded-xl bg-white/10 text-3xl group-hover:scale-105 transition-transform">
          {emoji || <Terminal className="w-7 h-7 text-white/80" />}
        </div>

        {/* Name - uses profile's theme foreground color and font */}
        <span
          className="text-sm font-semibold text-center line-clamp-2 leading-tight"
          style={{ color: themeForeground, fontFamily: profile.fontFamily }}
        >
          {displayName}
        </span>

        {/* Working directory */}
        {truncatedDir && (
          <span className="text-[11px] text-white/50 mt-1 font-mono">{truncatedDir}</span>
        )}

        {/* Command preview - full width with natural truncation */}
        {profile.command && (
          <span
            className="text-xs text-white/70 mt-1.5 font-mono truncate w-full text-center px-1"
            title={profile.command}
          >
            {profile.command}
          </span>
        )}
      </div>

      {/* Action bar - always at bottom */}
      <div className="relative z-10 flex items-center justify-center gap-1 px-2 py-2 bg-black/20 backdrop-blur-sm border-t border-white/10 opacity-0 group-hover:opacity-100 transition-all mt-auto">
        <button
          onClick={(e) => {
            e.stopPropagation()
            navigator.clipboard.writeText(profile.command || 'bash')
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
          title="Copy command"
        >
          <Copy className="w-4 h-4 text-white/50" />
        </button>
        {profile.command && (
          <button
            onClick={(e) => { e.stopPropagation(); onPasteOnly() }}
            onMouseDown={(e) => e.stopPropagation()}
            className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
            title="Paste command without running (edit flags first)"
          >
            <ClipboardType className="w-4 h-4 text-white/50" />
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onEdit() }}
          onMouseDown={(e) => e.stopPropagation()}
          className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
          title="Edit profile"
        >
          <Settings className="w-4 h-4 text-white/50" />
        </button>
        <button
          onClick={onClick}
          className="p-1.5 rounded-md bg-white/10 hover:bg-white/20 transition-colors"
          title="Launch"
        >
          <Play className="w-4 h-4 text-white/70" />
        </button>
      </div>
    </div>
  )
}

interface ProfileListItemProps {
  profile: Profile
  originalIndex: number
  isDefault: boolean
  category: string
  onClick: () => void
  onPasteOnly: () => void
  onEdit: () => void
  isDragging: boolean
  isDragOver: boolean
  dropPosition: 'above' | 'below' | null
  onDragStart: () => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: (targetCategory: string) => void
  onDragEnd: () => void
}

function ProfileListItem({
  profile,
  isDefault,
  category,
  onClick,
  onPasteOnly,
  onEdit,
  isDragging,
  isDragOver,
  dropPosition,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: ProfileListItemProps) {
  const [mediaError, setMediaError] = useState(false)

  const emojiMatch = profile.name.match(/^(\p{Emoji})\s*/u)
  const emoji = emojiMatch?.[1]
  const displayName = emoji ? profile.name.replace(emojiMatch[0], '') : profile.name

  // Show truncated working dir if set (like sidebar: ./dirname)
  const truncatedDir = profile.workingDir && profile.workingDir !== '~'
    ? './' + profile.workingDir.split('/').filter(Boolean).pop()
    : null

  // Compute effective background (matching Terminal.tsx 3-layer system)
  const effectiveGradientKey = profile.backgroundGradient ?? themes[profile.themeName]?.dark.backgroundGradient
  const effectiveGradientCSS = getGradientCSS(effectiveGradientKey, true)
  const effectivePanelColor = profile.panelColor ?? DEFAULT_PANEL_COLOR
  const gradientOpacity = (profile.transparency ?? DEFAULT_TRANSPARENCY) / 100

  // Background media (video/image)
  const mediaUrl = getMediaUrl(profile.backgroundMedia)
  const mediaOpacity = (profile.backgroundMediaOpacity ?? 50) / 100
  const showMedia = profile.backgroundMediaType && profile.backgroundMediaType !== 'none' && mediaUrl && !mediaError

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={() => onDrop(category)}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`
        relative w-full flex items-center gap-4 p-3 rounded-lg border transition-all group overflow-hidden cursor-pointer
        ${isDragging ? 'opacity-50 border-primary' : 'border-border hover:border-primary/50'}
      `}
    >
      {/* Layer 1: Base panel color */}
      <div
        className="absolute inset-0 rounded-lg"
        style={{ backgroundColor: effectivePanelColor }}
      />
      {/* Layer 2: Background media (video or image) */}
      {showMedia && profile.backgroundMediaType === 'video' && (
        <video
          key={mediaUrl}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none rounded-lg"
          style={{ opacity: mediaOpacity, zIndex: 0 }}
          src={mediaUrl}
          autoPlay
          loop
          muted
          playsInline
          onError={() => setMediaError(true)}
        />
      )}
      {showMedia && profile.backgroundMediaType === 'image' && (
        <img
          key={mediaUrl}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none rounded-lg"
          style={{ opacity: mediaOpacity, zIndex: 0 }}
          src={mediaUrl}
          alt=""
          onError={() => setMediaError(true)}
        />
      )}
      {/* Layer 3: Gradient overlay with transparency */}
      <div
        className="absolute inset-0 rounded-lg"
        style={{ background: effectiveGradientCSS, opacity: gradientOpacity, zIndex: 1 }}
      />
      {/* Drop indicator line - above */}
      {isDragOver && dropPosition === 'above' && (
        <div className="absolute -top-[3px] left-0 right-0 h-[3px] bg-green-500 rounded-full shadow-[0_0_8px_#22c55e] z-50" />
      )}
      {/* Drop indicator line - below */}
      {isDragOver && dropPosition === 'below' && (
        <div className="absolute -bottom-[3px] left-0 right-0 h-[3px] bg-green-500 rounded-full shadow-[0_0_8px_#22c55e] z-50" />
      )}

      {/* Drag handle - pointer-events-none so drag passes to parent */}
      <div
        className="relative z-10 flex-shrink-0 cursor-grab active:cursor-grabbing text-white/30 hover:text-white/60 transition-colors pointer-events-none"
        title="Drag to reorder"
      >
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Content - pointer-events-none to allow drag through */}
      <div className="relative z-10 flex items-center gap-4 flex-1 min-w-0 pointer-events-none">
        <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/10 text-xl flex-shrink-0">
          {emoji || <Terminal className="w-5 h-5 text-white/80" />}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="font-medium truncate flex items-center gap-2 text-white">
            {displayName}
            {isDefault && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[10px] font-medium">
                <Star className="w-2.5 h-2.5 fill-current" />
                Default
              </span>
            )}
            {truncatedDir && (
              <span className="text-[10px] text-white/50 font-mono">{truncatedDir}</span>
            )}
          </div>
          {profile.command && (
            <div className="text-sm text-white/50 font-mono truncate">{profile.command}</div>
          )}
        </div>
      </div>
      {/* Reference link button */}
      {profile.reference && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            const ref = profile.reference!
            if (ref.startsWith('http://') || ref.startsWith('https://')) {
              window.open(ref, '_blank')
            } else {
              // Open file in dashboard Files section
              window.location.hash = `/files?path=${encodeURIComponent(ref)}`
            }
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className="relative p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-blue-500/20 transition-all flex-shrink-0 z-10"
          title={`Open: ${profile.reference}`}
        >
          <Paperclip className="w-4 h-4 text-blue-400 hover:text-blue-300" />
        </button>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation()
          navigator.clipboard.writeText(profile.command || 'bash')
        }}
        onMouseDown={(e) => e.stopPropagation()}
        className="relative p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-all flex-shrink-0 z-10"
        title="Copy command"
      >
        <Copy className="w-4 h-4 text-white/50 hover:text-white/80" />
      </button>
      {profile.command && (
        <button
          onClick={(e) => { e.stopPropagation(); onPasteOnly() }}
          onMouseDown={(e) => e.stopPropagation()}
          className="relative p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-all flex-shrink-0 z-10"
          title="Paste command without running (edit flags first)"
        >
          <ClipboardType className="w-4 h-4 text-white/50 hover:text-white/80" />
        </button>
      )}
      <button
        onClick={(e) => { e.stopPropagation(); onEdit() }}
        onMouseDown={(e) => e.stopPropagation()}
        className="relative p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-all flex-shrink-0 z-10"
        title="Edit profile"
      >
        <Settings className="w-4 h-4 text-white/50 hover:text-white/80" />
      </button>
      <div className="relative z-10 flex-shrink-0 pointer-events-none">
        <Play className="w-5 h-5 text-white/80 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  )
}
