import React, { useState, useRef, useEffect } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { FileTree } from '../components/files/FileTree'
import { X, Copy, ExternalLink, Code, Image as ImageIcon, ChevronDown, Folder, Trash2, FileText, Settings, ZoomIn, ZoomOut, Maximize, Download } from 'lucide-react'
import { useWorkingDirectory } from '../../hooks/useWorkingDirectory'
import { useFileViewerSettings } from '../hooks/useFileViewerSettings'
import { getFileTypeAndLanguage } from '../utils/fileTypeUtils'

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
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false)
  const [imageZoom, setImageZoom] = useState<'fit' | number>('fit')
  const [imageDimensions, setImageDimensions] = useState<{width: number, height: number} | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const settingsRef = useRef<HTMLDivElement>(null)

  // Share working directory with rest of dashboard
  const { globalWorkingDir, setGlobalWorkingDir, recentDirs, setRecentDirs } = useWorkingDirectory()

  // File viewer settings (font size, family, max depth)
  const { settings: viewerSettings, setFontSize, setFontFamily } = useFileViewerSettings()

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDirDropdown(false)
      }
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettingsDropdown(false)
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

    // Use Chrome messaging to spawn terminal with editor (respects $EDITOR, falls back to nano)
    chrome.runtime?.sendMessage({
      type: 'SPAWN_TERMINAL',
      name: `Edit: ${activeFile.name}`,
      command: `\${EDITOR:-nano} "${activeFile.path}"`,
      workingDir: dir,
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with Working Directory Selector and Settings */}
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

        {/* Settings Dropdown */}
        <div className="relative ml-auto" ref={settingsRef}>
          <button
            onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background border border-border hover:border-primary/50 transition-colors text-sm"
            title="Font settings"
          >
            <Settings className="w-4 h-4" />
            <span className="text-muted-foreground">{viewerSettings.fontSize}px</span>
          </button>

          {showSettingsDropdown && (
            <div className="absolute top-full right-0 mt-1 w-64 bg-card border border-border rounded-lg shadow-xl z-50 p-4 space-y-4">
              {/* Font Size */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Font Size</label>
                  <span className="text-sm text-muted-foreground">{viewerSettings.fontSize}px</span>
                </div>
                <input
                  type="range"
                  min="12"
                  max="24"
                  step="1"
                  value={viewerSettings.fontSize}
                  onChange={(e) => setFontSize(parseInt(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>

              {/* Font Family */}
              <div>
                <label className="text-sm font-medium block mb-2">Font</label>
                <select
                  value={viewerSettings.fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-sm"
                  style={{ fontFamily: viewerSettings.fontFamily }}
                >
                  <option value="JetBrains Mono">JetBrains Mono</option>
                  <option value="Fira Code">Fira Code</option>
                  <option value="Cascadia Code">Cascadia Code</option>
                  <option value="monospace">System Monospace</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 min-h-0">
        {/* File Tree - Left Side */}
        <div className="w-72 border-r border-border flex-shrink-0 overflow-hidden">
          <FileTree onFileSelect={handleFileSelect} basePath={globalWorkingDir} maxDepth={viewerSettings.maxDepth} />
        </div>

        {/* File Viewer - Right Side */}
        <div className="flex-1 flex flex-col min-w-0">
        {/* Tab Bar */}
        {openFiles.length > 0 && (
          <div className="flex items-center border-b border-border bg-card/50 overflow-x-auto">
            {openFiles.map(file => {
              const fileType = getFileTypeAndLanguage(file.path).type
              const FileIcon = file.isImage ? ImageIcon : fileType === 'markdown' ? FileText : Code
              return (
              <div
                key={file.id}
                className={`flex items-center gap-2 px-3 py-2 border-r border-border cursor-pointer hover:bg-muted/50 ${
                  activeFileId === file.id ? 'bg-muted text-foreground' : 'text-muted-foreground'
                }`}
                onClick={() => setActiveFileId(file.id)}
              >
                <FileIcon className="w-4 h-4" />
                <span className="text-sm truncate max-w-32">{file.name}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); closeFile(file.id) }}
                  className="hover:bg-muted rounded p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )})}
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
            <div className="h-full flex flex-col">
              {/* Image Toolbar */}
              <div className="flex items-center gap-2 p-2 border-b border-border bg-card/50">
                <div className="flex items-center gap-1 border-r border-border pr-2">
                  <button
                    onClick={() => setImageZoom('fit')}
                    className={`flex items-center gap-1 px-2 py-1 text-sm rounded ${imageZoom === 'fit' ? 'bg-primary/20 text-primary' : 'hover:bg-muted'}`}
                    title="Fit to view"
                  >
                    <Maximize className="w-4 h-4" /> Fit
                  </button>
                  <button
                    onClick={() => setImageZoom(100)}
                    className={`flex items-center gap-1 px-2 py-1 text-sm rounded ${imageZoom === 100 ? 'bg-primary/20 text-primary' : 'hover:bg-muted'}`}
                    title="Actual size"
                  >
                    100%
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setImageZoom(prev => Math.max(25, (typeof prev === 'number' ? prev : 100) - 25))}
                    className="p-1.5 hover:bg-muted rounded"
                    title="Zoom out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-muted-foreground w-12 text-center">
                    {imageZoom === 'fit' ? 'Fit' : `${imageZoom}%`}
                  </span>
                  <button
                    onClick={() => setImageZoom(prev => Math.min(400, (typeof prev === 'number' ? prev : 100) + 25))}
                    className="p-1.5 hover:bg-muted rounded"
                    title="Zoom in"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>
                <a
                  href={activeFile.imageDataUri}
                  download={activeFile.name}
                  className="flex items-center gap-1 px-2 py-1 text-sm hover:bg-muted rounded ml-2"
                  title="Download image"
                >
                  <Download className="w-4 h-4" /> Download
                </a>
                <span className="ml-auto text-xs text-muted-foreground">
                  {imageDimensions && `${imageDimensions.width} × ${imageDimensions.height}`}
                  {activeFile.path && <span className="ml-2">{activeFile.path}</span>}
                </span>
              </div>
              {/* Image Display */}
              <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-[#1a1a1a]">
                <img
                  src={activeFile.imageDataUri}
                  alt={activeFile.name}
                  onLoad={(e) => {
                    const img = e.target as HTMLImageElement
                    setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight })
                  }}
                  style={imageZoom === 'fit' ? {
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain'
                  } : {
                    width: `${(imageDimensions?.width || 100) * (imageZoom / 100)}px`,
                    height: 'auto'
                  }}
                />
              </div>
            </div>
          ) : (() => {
            const { type, language } = getFileTypeAndLanguage(activeFile.path)
            const isMarkdown = type === 'markdown'

            return (
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
              {/* Content */}
              <div className="flex-1 overflow-auto">
                {isMarkdown ? (
                  <div
                    className="file-viewer-markdown"
                    style={{
                      fontSize: `${viewerSettings.fontSize}px`,
                      fontFamily: `${viewerSettings.fontFamily}, monospace`,
                    }}
                  >
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code({ className, children, ...props }: any) {
                          const match = /language-(\w+)/.exec(className || '')
                          const codeString = String(children).replace(/\n$/, '')

                          // Inline code
                          if (!match && !className) {
                            return <code className={className} {...props}>{children}</code>
                          }

                          // Code block with syntax highlighting
                          return (
                            <SyntaxHighlighter
                              language={match?.[1] || 'text'}
                              style={vscDarkPlus}
                              customStyle={{
                                margin: 0,
                                padding: '1rem',
                                background: 'rgba(0, 0, 0, 0.4)',
                                borderRadius: '8px',
                                fontSize: `${viewerSettings.fontSize}px`,
                                fontFamily: `${viewerSettings.fontFamily}, monospace`,
                              }}
                              codeTagProps={{
                                style: {
                                  fontSize: `${viewerSettings.fontSize}px`,
                                  fontFamily: `${viewerSettings.fontFamily}, monospace`,
                                }
                              }}
                            >
                              {codeString}
                            </SyntaxHighlighter>
                          )
                        }
                      }}
                    >
                      {activeFile.content || ''}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <SyntaxHighlighter
                    language={language || 'text'}
                    style={vscDarkPlus}
                    showLineNumbers
                    wrapLines
                    lineNumberStyle={{
                      minWidth: '3em',
                      paddingRight: '1em',
                      color: 'rgba(255,255,255,0.3)',
                      userSelect: 'none',
                      fontSize: `${viewerSettings.fontSize}px`,
                    }}
                    customStyle={{
                      margin: 0,
                      padding: '1rem',
                      background: 'transparent',
                      fontSize: `${viewerSettings.fontSize}px`,
                      fontFamily: `${viewerSettings.fontFamily}, monospace`,
                    }}
                    codeTagProps={{
                      style: {
                        fontSize: `${viewerSettings.fontSize}px`,
                        fontFamily: `${viewerSettings.fontFamily}, monospace`,
                      }
                    }}
                  >
                    {activeFile.content || ''}
                  </SyntaxHighlighter>
                )}
              </div>
            </div>
            )
          })()}
        </div>
      </div>
      </div>
    </div>
  )
}
