import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  X,
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  RefreshCw,
  Home,
  Music,
  Image,
  Video,
  FileCode,
  ChevronsDownUp,
  ChevronsUpDown,
} from 'lucide-react'
import { FILE_TYPE_FILTERS, type FilePickerFilterType, type FilePickerDefaults, DEFAULT_FILE_PICKER_DEFAULTS } from '../../../components/settings/types'

interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  size?: number
  modified?: string
  children?: FileNode[]
}

interface FilePickerModalProps {
  isOpen: boolean
  title?: string
  basePath?: string
  filterType?: FilePickerFilterType  // 'audio', 'images', 'videos'
  customExtensions?: string[]         // Override default extensions
  onSelect: (path: string) => void
  onClose: () => void
}

const API_BASE = 'http://localhost:8129'

// Filter tree to show only matching files and folders with matching files
function filterTree(node: FileNode, extensions: readonly string[]): FileNode | null {
  if (node.type === 'file') {
    const ext = node.name.split('.').pop()?.toLowerCase() || ''
    return extensions.includes(ext) ? node : null
  }

  // Directory - filter children
  const filteredChildren = node.children
    ?.map(child => filterTree(child, extensions))
    .filter((c): c is FileNode => c !== null)

  // Keep folder if it has visible children
  return filteredChildren && filteredChildren.length > 0
    ? { ...node, children: filteredChildren }
    : null
}

// Collect all folder paths from tree (for expand all)
function collectFolderPaths(node: FileNode): string[] {
  const paths: string[] = []
  if (node.type === 'directory') {
    paths.push(node.path)
    node.children?.forEach(child => {
      paths.push(...collectFolderPaths(child))
    })
  }
  return paths
}

// Get icon based on file extension
function getFileIcon(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''

  if (FILE_TYPE_FILTERS.audio.includes(ext as any)) {
    return <Music className="w-4 h-4 text-pink-400" />
  }
  if (FILE_TYPE_FILTERS.images.includes(ext as any)) {
    return <Image className="w-4 h-4 text-yellow-400" />
  }
  if (FILE_TYPE_FILTERS.videos.includes(ext as any)) {
    return <Video className="w-4 h-4 text-purple-400" />
  }
  return <File className="w-4 h-4 text-muted-foreground" />
}

export default function FilePickerModal({
  isOpen,
  title = 'Select File',
  basePath = '~',
  filterType,
  customExtensions,
  onSelect,
  onClose,
}: FilePickerModalProps) {
  const [fileTree, setFileTree] = useState<FileNode | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPath, setCurrentPath] = useState(basePath)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [allExpanded, setAllExpanded] = useState(false)
  const fallbackAttempted = useRef(false)
  const [filePickerDefaults, setFilePickerDefaults] = useState<FilePickerDefaults>(DEFAULT_FILE_PICKER_DEFAULTS)

  // Load file picker defaults from storage
  useEffect(() => {
    chrome.storage.local.get(['filePickerDefaults'], (result) => {
      if (result.filePickerDefaults) {
        setFilePickerDefaults({ ...DEFAULT_FILE_PICKER_DEFAULTS, ...result.filePickerDefaults })
      }
    })
  }, [])

  // Determine which extensions to filter
  const extensions = useMemo(() => {
    if (customExtensions) return customExtensions
    if (filterType) return [...FILE_TYPE_FILTERS[filterType]]
    return []  // No filter - show all files
  }, [filterType, customExtensions])

  // Fetch file tree (auto-fallback to ~ if path doesn't exist)
  const fetchFileTree = useCallback(async (path: string, forceRefresh = false, isRetry = false) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `${API_BASE}/api/files/tree?${new URLSearchParams({
          path,
          depth: '5',
          showHidden: 'false',
        })}`
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to load file tree')
      }

      const data = await response.json()
      setFileTree(data)
      setCurrentPath(data.path || path)
      setAllExpanded(false)  // Reset expand state on navigation

      // Expand root by default
      if (data?.path) {
        setExpandedFolders(new Set([data.path]))
      }
    } catch (err: any) {
      // Auto-fallback to ~ if path doesn't exist (and we haven't already tried)
      if (!isRetry && path !== '~' && !fallbackAttempted.current) {
        fallbackAttempted.current = true
        fetchFileTree('~', false, true)
        return
      }
      setError(err.message || 'Failed to load files')
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch when modal opens or path changes
  useEffect(() => {
    if (isOpen) {
      setSelectedPath(null)
      setAllExpanded(false)
      fallbackAttempted.current = false  // Reset fallback flag for new modal open
      fetchFileTree(basePath)
    }
  }, [isOpen, basePath, fetchFileTree])

  // Apply filtering
  const filteredTree = useMemo(() => {
    if (!fileTree) return null
    if (extensions.length === 0) return fileTree  // No filter
    return filterTree(fileTree, extensions)
  }, [fileTree, extensions])

  // Toggle folder expansion
  const toggleFolder = useCallback((path: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(path)) {
        newSet.delete(path)
      } else {
        newSet.add(path)
      }
      return newSet
    })
    setAllExpanded(false)  // Manual toggle breaks "all expanded" state
  }, [])

  // Expand/collapse all folders (uses filtered tree so only visible folders expand)
  const toggleExpandAll = useCallback(() => {
    if (!filteredTree) return

    if (allExpanded) {
      // Collapse all - just keep root expanded
      setExpandedFolders(new Set([filteredTree.path]))
      setAllExpanded(false)
    } else {
      // Expand all folders in filtered tree
      const allPaths = collectFolderPaths(filteredTree)
      setExpandedFolders(new Set(allPaths))
      setAllExpanded(true)
    }
  }, [filteredTree, allExpanded])

  // Navigate to parent (don't go above home directory)
  const navigateUp = useCallback(() => {
    // Don't go above home directory
    const homeDir = `/home/${currentPath.split('/')[2] || ''}`
    if (currentPath === '~' || currentPath === homeDir || currentPath === '/') {
      return  // Already at home or root, can't go higher
    }
    const parentPath = currentPath.split('/').slice(0, -1).join('/')
    // Ensure we don't go above home
    if (!parentPath || parentPath.length < homeDir.length) {
      fetchFileTree('~', true)
    } else {
      fetchFileTree(parentPath, true)
    }
  }, [currentPath, fetchFileTree])

  // Navigate home (always goes to ~ which backend expands reliably)
  const navigateHome = useCallback(() => {
    fetchFileTree('~', true)
  }, [fetchFileTree])

  // Handle node click
  const handleNodeClick = useCallback((node: FileNode) => {
    if (node.type === 'directory') {
      toggleFolder(node.path)
    } else {
      setSelectedPath(node.path)
    }
  }, [toggleFolder])

  // Handle double-click to select immediately
  const handleNodeDoubleClick = useCallback((node: FileNode) => {
    if (node.type === 'file') {
      onSelect(node.path)
      onClose()
    }
  }, [onSelect, onClose])

  // Render file tree recursively
  const renderTree = useCallback((node: FileNode, depth = 0): React.ReactNode => {
    const isExpanded = expandedFolders.has(node.path)
    const isSelected = selectedPath === node.path
    const isDirectory = node.type === 'directory'

    return (
      <div key={node.path}>
        <div
          className={`
            group flex items-center py-1.5 px-2 cursor-pointer rounded transition-colors
            ${isSelected ? 'bg-primary/20 text-primary' : 'hover:bg-muted/50'}
          `}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => handleNodeClick(node)}
          onDoubleClick={() => handleNodeDoubleClick(node)}
          title={node.path}
        >
          {/* Expand/collapse icon for directories */}
          <span className="w-4 h-4 flex items-center justify-center mr-1 text-muted-foreground">
            {isDirectory && (
              isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />
            )}
          </span>

          {/* File/folder icon */}
          <span className="mr-2">
            {isDirectory ? (
              isExpanded ? (
                <FolderOpen className="w-4 h-4 text-yellow-400" />
              ) : (
                <Folder className="w-4 h-4 text-yellow-400" />
              )
            ) : (
              getFileIcon(node.name)
            )}
          </span>

          {/* Name */}
          <span className={`text-sm truncate ${isDirectory ? 'font-medium' : ''}`}>
            {node.name}
          </span>
        </div>

        {/* Children */}
        {isDirectory && isExpanded && node.children && (
          <div>
            {node.children.map(child => renderTree(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }, [expandedFolders, selectedPath, handleNodeClick, handleNodeDoubleClick])

  // Handle confirm selection
  const handleConfirm = useCallback(() => {
    if (selectedPath) {
      onSelect(selectedPath)
      onClose()
    }
  }, [selectedPath, onSelect, onClose])

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'Enter' && selectedPath) {
        handleConfirm()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, selectedPath, handleConfirm, onClose])

  if (!isOpen) return null

  // Get display name for filter type
  const filterLabel = filterType
    ? `${filterType.charAt(0).toUpperCase()}${filterType.slice(1)}`
    : extensions.length > 0
      ? extensions.map(e => `.${e}`).join(', ')
      : 'All files'

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div>
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="text-xs text-muted-foreground">
              Showing: {filterLabel}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={navigateHome}
              className="p-1.5 hover:bg-muted rounded"
              title="Home"
            >
              <Home className="w-4 h-4" />
            </button>
            <button
              onClick={navigateUp}
              className="p-1.5 hover:bg-muted rounded text-lg font-bold"
              title="Up"
            >
              ↑
            </button>
            <button
              onClick={toggleExpandAll}
              className="p-1.5 hover:bg-muted rounded"
              title={allExpanded ? 'Collapse All' : 'Expand All'}
            >
              {allExpanded ? (
                <ChevronsDownUp className="w-4 h-4" />
              ) : (
                <ChevronsUpDown className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={() => fetchFileTree(currentPath, true)}
              className="p-1.5 hover:bg-muted rounded"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-muted rounded ml-2"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Current path and quick folder buttons */}
        <div className="px-4 py-2 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-mono text-muted-foreground truncate flex-1">
              {currentPath}
            </p>
            {/* Quick folder navigation buttons */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => fetchFileTree(filePickerDefaults.audio || '~/sfx', true)}
                className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                title={`Music: ${filePickerDefaults.audio || '~/sfx'}`}
              >
                <Music className="w-3 h-3 text-pink-400" />
              </button>
              <button
                onClick={() => fetchFileTree(filePickerDefaults.images || '~/Pictures', true)}
                className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                title={`Pictures: ${filePickerDefaults.images || '~/Pictures'}`}
              >
                <Image className="w-3 h-3 text-yellow-400" />
              </button>
              <button
                onClick={() => fetchFileTree(filePickerDefaults.videos || '~/Videos', true)}
                className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                title={`Videos: ${filePickerDefaults.videos || '~/Videos'}`}
              >
                <Video className="w-3 h-3 text-purple-400" />
              </button>
            </div>
          </div>
        </div>

        {/* File tree */}
        <div className="flex-1 overflow-auto p-2 min-h-[300px]">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          )}

          {error && (
            <div className="text-center text-red-400 py-4">
              {error}
            </div>
          )}

          {!loading && !error && filteredTree && renderTree(filteredTree)}

          {!loading && !error && !filteredTree && (
            <div className="text-center text-muted-foreground py-8">
              <FileCode className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No matching files found</p>
              <p className="text-xs mt-1">Try navigating to a different folder</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border bg-muted/30">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              {selectedPath ? (
                <p className="text-sm font-mono truncate text-primary">
                  {selectedPath.split('/').pop()}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Select a file or double-click to confirm
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!selectedPath}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Select
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
