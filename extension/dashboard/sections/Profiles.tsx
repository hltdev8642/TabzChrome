import React, { useEffect, useState, useRef } from 'react'
import { Grid, List, Search, Play, RefreshCw, Terminal, Folder, X, FolderOpen, ChevronDown } from 'lucide-react'
import { spawnTerminal, getProfiles } from '../hooks/useDashboard'
import { useWorkingDirectory } from '../../hooks/useWorkingDirectory'
import type { Profile } from '../../components/SettingsModal'

type ViewMode = 'grid' | 'list'

export default function ProfilesSection() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Working directory management
  const {
    globalWorkingDir,
    setGlobalWorkingDir,
    recentDirs,
    setRecentDirs,
    addToRecentDirs,
  } = useWorkingDirectory()
  const [showDirDropdown, setShowDirDropdown] = useState(false)
  const [customDirInput, setCustomDirInput] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDirDropdown(false)
      }
    }
    if (showDirDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showDirDropdown])

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

  // Get unique categories
  const categories = Array.from(new Set(profiles.map((p) => p.category).filter(Boolean))) as string[]

  // Filter profiles
  const filteredProfiles = profiles.filter((profile) => {
    const matchesSearch =
      !searchQuery ||
      profile.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile.command?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = !selectedCategory || profile.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Group by category for display
  const groupedProfiles = filteredProfiles.reduce(
    (acc, profile) => {
      const cat = profile.category || 'Uncategorized'
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(profile)
      return acc
    },
    {} as Record<string, Profile[]>
  )

  const launchProfile = async (profile: Profile) => {
    try {
      // Use profile.workingDir only if it's set AND not just "~" (which means "inherit")
      const effectiveWorkingDir = (profile.workingDir && profile.workingDir !== '~')
        ? profile.workingDir
        : globalWorkingDir
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

  return (
    <div className="p-6">
      {/* Working Directory Bar */}
      <div className="mb-6 p-4 rounded-xl bg-card border border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FolderOpen className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">Working Directory</span>
          </div>
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDirDropdown(!showDirDropdown)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-background border border-border hover:border-primary/50 transition-colors font-mono text-sm"
            >
              <span className="max-w-[300px] truncate">{globalWorkingDir}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showDirDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showDirDropdown && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-lg shadow-xl z-50 overflow-hidden">
                {/* Custom input */}
                <div className="p-3 border-b border-border">
                  <input
                    type="text"
                    value={customDirInput}
                    onChange={(e) => setCustomDirInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && customDirInput.trim()) {
                        setGlobalWorkingDir(customDirInput.trim())
                        addToRecentDirs(customDirInput.trim())
                        setShowDirDropdown(false)
                        setCustomDirInput('')
                      } else if (e.key === 'Escape') {
                        setShowDirDropdown(false)
                      }
                    }}
                    placeholder="Type path and press Enter"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm font-mono focus:border-primary focus:outline-none"
                    autoFocus
                  />
                </div>

                {/* Recent directories */}
                <div className="max-h-[250px] overflow-y-auto">
                  {recentDirs.length === 0 ? (
                    <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                      No recent directories
                    </div>
                  ) : (
                    recentDirs.map((dir) => (
                      <div
                        key={dir}
                        className={`flex items-center justify-between px-3 py-2 hover:bg-muted transition-colors group ${
                          dir === globalWorkingDir ? 'bg-primary/10 text-primary' : ''
                        }`}
                      >
                        <button
                          onClick={() => {
                            setGlobalWorkingDir(dir)
                            setShowDirDropdown(false)
                          }}
                          className="flex-1 text-left text-sm font-mono truncate"
                        >
                          {dir}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setRecentDirs((prev) => prev.filter((d) => d !== dir))
                            if (globalWorkingDir === dir) {
                              setGlobalWorkingDir('~')
                            }
                          }}
                          className="ml-2 p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove from list"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Profiles without a specific directory will launch in this location
        </p>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold terminal-glow">Profiles</h1>
          <p className="text-muted-foreground mt-1">
            {profiles.length} profiles in {categories.length} categories
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-primary/20 text-primary' : 'hover:bg-muted'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-primary/20 text-primary' : 'hover:bg-muted'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={fetchProfiles}
            disabled={loading}
            className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search profiles..."
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-card border border-border focus:border-primary focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              !selectedCategory
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'bg-card border border-border hover:bg-muted'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === cat
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'bg-card border border-border hover:bg-muted'
              }`}
            >
              {cat}
            </button>
          ))}
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
          {Object.entries(groupedProfiles).map(([category, categoryProfiles]) => (
            <div key={category}>
              {/* Category Header */}
              <div className="flex items-center gap-2 mb-4">
                <Folder className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">{category}</h2>
                <span className="text-sm text-muted-foreground">({categoryProfiles.length})</span>
              </div>

              {/* Grid View */}
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                  {categoryProfiles.map((profile) => (
                    <ProfileCard key={profile.id} profile={profile} onClick={() => launchProfile(profile)} />
                  ))}
                </div>
              ) : (
                /* List View */
                <div className="space-y-2">
                  {categoryProfiles.map((profile) => (
                    <ProfileListItem key={profile.id} profile={profile} onClick={() => launchProfile(profile)} />
                  ))}
                </div>
              )}
            </div>
          ))}
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

function ProfileCard({ profile, onClick }: { profile: Profile; onClick: () => void }) {
  // Extract emoji from name if present
  const emojiMatch = profile.name.match(/^(\p{Emoji})\s*/u)
  const emoji = emojiMatch?.[1]
  const displayName = emoji ? profile.name.replace(emojiMatch[0], '') : profile.name

  // Show truncated working dir if set (like sidebar: ./dirname)
  const truncatedDir = profile.workingDir && profile.workingDir !== '~'
    ? './' + profile.workingDir.split('/').filter(Boolean).pop()
    : null

  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center p-4 rounded-xl bg-card border border-border hover:border-primary/50 hover:bg-primary/5 transition-all"
    >
      <div className="w-12 h-12 flex items-center justify-center mb-2 rounded-lg bg-primary/10 text-2xl group-hover:scale-110 transition-transform">
        {emoji || <Terminal className="w-6 h-6 text-primary" />}
      </div>
      <span className="text-sm font-medium text-center line-clamp-2">{displayName}</span>
      {truncatedDir && (
        <span className="text-[10px] text-muted-foreground mt-0.5 font-mono">{truncatedDir}</span>
      )}
      {profile.command && (
        <span className="text-xs text-muted-foreground mt-1 font-mono truncate max-w-full">
          {profile.command.length > 15 ? profile.command.slice(0, 15) + '...' : profile.command}
        </span>
      )}
      <Play className="w-4 h-4 text-primary mt-2 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  )
}

function ProfileListItem({ profile, onClick }: { profile: Profile; onClick: () => void }) {
  const emojiMatch = profile.name.match(/^(\p{Emoji})\s*/u)
  const emoji = emojiMatch?.[1]
  const displayName = emoji ? profile.name.replace(emojiMatch[0], '') : profile.name

  // Show truncated working dir if set (like sidebar: ./dirname)
  const truncatedDir = profile.workingDir && profile.workingDir !== '~'
    ? './' + profile.workingDir.split('/').filter(Boolean).pop()
    : null

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 p-3 rounded-lg bg-card border border-border hover:border-primary/50 hover:bg-primary/5 transition-all group"
    >
      <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary/10 text-xl flex-shrink-0">
        {emoji || <Terminal className="w-5 h-5 text-primary" />}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <div className="font-medium truncate flex items-center gap-2">
          {displayName}
          {truncatedDir && (
            <span className="text-[10px] text-muted-foreground font-mono">{truncatedDir}</span>
          )}
        </div>
        {profile.command && (
          <div className="text-sm text-muted-foreground font-mono truncate">{profile.command}</div>
        )}
      </div>
      <Play className="w-5 h-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
    </button>
  )
}
