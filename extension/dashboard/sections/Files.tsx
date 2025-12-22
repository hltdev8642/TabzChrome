import React, { useState, useRef, useEffect } from 'react'
import { FileTree } from '../components/files/FileTree'
import { X, Copy, ExternalLink, Code, Image as ImageIcon, ChevronDown, Folder, Trash2 } from 'lucide-react'
import { useWorkingDirectory } from '../../hooks/useWorkingDirectory'

interface OpenFile {
  id: string
  path: string
  name: string
  content: string | null
  isImage: boolean
  imageDataUri?: string
  loading: boolean
  error?: string
}

const API_BASE = "http://localhost:8129"

export default function FilesSection() {
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([])
  const [activeFileId, setActiveFileId] = useState<string | null>(null)
  const [showDirDropdown, setShowDirDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Share working directory with rest of dashboard
  const { globalWorkingDir, setGlobalWorkingDir, recentDirs, setRecentDirs } = useWorkingDirectory()

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDirDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const activeFile = openFiles.find(f => f.id === activeFileId)

  const handleFileSelect = async (path: string) => {
    // Check if already open
    const existing = openFiles.find(f => f.path === path)
    if (existing) {
      setActiveFileId(existing.id)
      return
    }

    const id = `file-${Date.now()}`
    const name = path.split('/').pop() || path
    const isImage = /\.(png|jpg|jpeg|gif|svg|ico|webp)$/i.test(name)

    // Add file in loading state
    const newFile: OpenFile = { id, path, name, content: null, isImage, loading: true }
    setOpenFiles(prev => [...prev, newFile])
    setActiveFileId(id)

    try {
      if (isImage) {
        const res = await fetch(`${API_BASE}/api/files/image?path=${encodeURIComponent(path)}`)
        const data = await res.json()
        if (data.dataUri) {
          setOpenFiles(prev => prev.map(f => f.id === id ? { ...f, imageDataUri: data.dataUri, loading: false } : f))
        } else {
          throw new Error('No image data')
        }
      } else {
        const res = await fetch(`${API_BASE}/api/files/content?path=${encodeURIComponent(path)}`)
        const data = await res.json()
        setOpenFiles(prev => prev.map(f => f.id === id ? { ...f, content: data.content, loading: false } : f))
      }
    } catch (err: any) {
      setOpenFiles(prev => prev.map(f => f.id === id ? { ...f, error: err.message, loading: false } : f))
    }
  }

  const closeFile = (id: string) => {
    setOpenFiles(prev => prev.filter(f => f.id !== id))
    if (activeFileId === id) {
      const remaining = openFiles.filter(f => f.id !== id)
      setActiveFileId(remaining.length > 0 ? remaining[remaining.length - 1].id : null)
    }
  }

  const copyContent = async () => {
    if (activeFile?.content) {
      await navigator.clipboard.writeText(activeFile.content)
    }
  }

  const openInEditor = async () => {
    if (!activeFile) return
    const dir = activeFile.path.split('/').slice(0, -1).join('/')

    // Use Chrome messaging to spawn terminal with editor
    chrome.runtime?.sendMessage({
      type: 'SPAWN_TERMINAL',
      name: `Edit: ${activeFile.name}`,
      command: `nano "${activeFile.path}"`,
      workingDir: dir,
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with Working Directory Selector */}
      <div className="flex items-center gap-4 px-4 py-3 border-b border-border bg-card/50">
        <span className="text-sm text-muted-foreground">Working Directory:</span>
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDirDropdown(!showDirDropdown)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background border border-border hover:border-primary/50 transition-colors font-mono text-sm"
          >
            <Folder className="w-4 h-4 text-yellow-400" />
            <span className="max-w-[300px] truncate">{globalWorkingDir}</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showDirDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showDirDropdown && (
            <div className="absolute top-full left-0 mt-1 w-80 bg-card border border-border rounded-lg shadow-xl z-50">
              <div className="p-2 border-b border-border">
                <input
                  type="text"
                  placeholder="Enter path..."
                  className="w-full px-3 py-2 bg-background border border-border rounded text-sm font-mono"
                  defaultValue={globalWorkingDir}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setGlobalWorkingDir((e.target as HTMLInputElement).value)
                      setShowDirDropdown(false)
                    }
                  }}
                />
              </div>
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
                        className="flex-1 text-left font-mono text-sm truncate"
                        onClick={() => {
                          setGlobalWorkingDir(dir)
                          setShowDirDropdown(false)
                        }}
                      >
                        {dir}
                      </button>
                      <button
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-background rounded transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation()
                          setRecentDirs((prev) => prev.filter((d) => d !== dir))
                          if (globalWorkingDir === dir) {
                            setGlobalWorkingDir('~')
                          }
                        }}
                      >
                        <Trash2 className="w-3 h-3 text-muted-foreground hover:text-red-400" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 min-h-0">
        {/* File Tree - Left Side */}
        <div className="w-72 border-r border-border flex-shrink-0 overflow-hidden">
          <FileTree onFileSelect={handleFileSelect} basePath={globalWorkingDir} />
        </div>

        {/* File Viewer - Right Side */}
        <div className="flex-1 flex flex-col min-w-0">
        {/* Tab Bar */}
        {openFiles.length > 0 && (
          <div className="flex items-center border-b border-border bg-card/50 overflow-x-auto">
            {openFiles.map(file => (
              <div
                key={file.id}
                className={`flex items-center gap-2 px-3 py-2 border-r border-border cursor-pointer hover:bg-muted/50 ${
                  activeFileId === file.id ? 'bg-muted text-foreground' : 'text-muted-foreground'
                }`}
                onClick={() => setActiveFileId(file.id)}
              >
                {file.isImage ? <ImageIcon className="w-4 h-4" /> : <Code className="w-4 h-4" />}
                <span className="text-sm truncate max-w-32">{file.name}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); closeFile(file.id) }}
                  className="hover:bg-muted rounded p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          {!activeFile ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Select a file to view
            </div>
          ) : activeFile.loading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Loading...
            </div>
          ) : activeFile.error ? (
            <div className="flex items-center justify-center h-full text-red-400">
              {activeFile.error}
            </div>
          ) : activeFile.isImage ? (
            <div className="flex items-center justify-center h-full p-4">
              <img src={activeFile.imageDataUri} alt={activeFile.name} className="max-w-full max-h-full object-contain" />
            </div>
          ) : (
            <div className="h-full flex flex-col">
              {/* Toolbar */}
              <div className="flex items-center gap-2 p-2 border-b border-border bg-card/50">
                <button onClick={copyContent} className="flex items-center gap-1 px-2 py-1 text-sm hover:bg-muted rounded">
                  <Copy className="w-4 h-4" /> Copy
                </button>
                <button onClick={openInEditor} className="flex items-center gap-1 px-2 py-1 text-sm hover:bg-muted rounded">
                  <ExternalLink className="w-4 h-4" /> Open in Editor
                </button>
                <span className="ml-auto text-xs text-muted-foreground">{activeFile.path}</span>
              </div>
              {/* Code Content */}
              <pre className="flex-1 overflow-auto p-4 text-sm font-mono bg-background/50">
                <code>{activeFile.content}</code>
              </pre>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  )
}
