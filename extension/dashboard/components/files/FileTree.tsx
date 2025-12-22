import React, { useState, useEffect, useCallback, useRef, useMemo } from "react"
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  RefreshCw,
  Search,
  FileText,
  Image,
  FileJson,
  FileCode,
  Home,
  Minimize2,
} from "lucide-react"

interface FileNode {
  name: string
  path: string
  type: "file" | "directory"
  size?: number
  modified?: string
  children?: FileNode[]
}

interface FileTreeProps {
  onFileSelect?: (path: string) => void
  basePath?: string
  showHidden?: boolean
  maxDepth?: number
}

const API_BASE = "http://localhost:8129"

export function FileTree({ onFileSelect, basePath = "~", showHidden: showHiddenProp = false, maxDepth = 5 }: FileTreeProps) {
  const [fileTree, setFileTree] = useState<FileNode | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPath, setCurrentPath] = useState(basePath)
  const [showHidden, setShowHidden] = useState(showHiddenProp)

  // Sync currentPath when basePath prop changes
  useEffect(() => {
    setCurrentPath(basePath)
  }, [basePath])

  // Fetch file tree
  const fetchFileTree = useCallback(async (path?: string) => {
    setLoading(true)
    setError(null)
    const targetPath = path || currentPath

    try {
      const response = await fetch(
        `${API_BASE}/api/files/tree?${new URLSearchParams({
          path: targetPath,
          depth: maxDepth.toString(),
          showHidden: showHidden.toString(),
        })}`
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to load file tree")
      }

      const data = await response.json()
      setFileTree(data)

      // Expand root folder
      if (data) {
        setExpandedFolders(new Set([data.path]))
      }
    } catch (err: any) {
      setError(err.message || "Failed to load files")
    } finally {
      setLoading(false)
    }
  }, [currentPath, showHidden, maxDepth])

  useEffect(() => {
    fetchFileTree()
  }, [fetchFileTree])

  // Get file icon based on extension
  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase()
    const codeExts = ["js", "jsx", "ts", "tsx", "py", "java", "cpp", "c", "h", "css", "scss", "html", "vue", "rs", "go"]
    const docExts = ["md", "txt", "doc", "docx", "pdf", "rtf"]
    const imageExts = ["png", "jpg", "jpeg", "gif", "svg", "ico", "webp"]
    const jsonExts = ["json", "jsonc", "json5"]

    if (codeExts.includes(ext || "")) return <FileCode className="w-4 h-4 text-green-400" />
    if (docExts.includes(ext || "")) return <FileText className="w-4 h-4 text-blue-400" />
    if (imageExts.includes(ext || "")) return <Image className="w-4 h-4 text-yellow-400" />
    if (jsonExts.includes(ext || "")) return <FileJson className="w-4 h-4 text-orange-400" />
    return <File className="w-4 h-4" />
  }

  // Filter nodes based on search
  const filterNodes = useCallback((node: FileNode): FileNode | null => {
    if (!searchQuery) return node

    const matches = node.name.toLowerCase().includes(searchQuery.toLowerCase())

    if (node.type === "file") {
      return matches ? node : null
    }

    const filteredChildren = node.children?.map(filterNodes).filter(Boolean) as FileNode[] | undefined

    if (matches || (filteredChildren && filteredChildren.length > 0)) {
      return { ...node, children: filteredChildren }
    }

    return null
  }, [searchQuery])

  const filteredTree = useMemo(() => {
    if (!fileTree) return null
    return filterNodes(fileTree)
  }, [fileTree, filterNodes])

  // Toggle folder expansion
  const toggleFolder = useCallback((path: string) => {
    setExpandedFolders((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(path)) {
        newSet.delete(path)
      } else {
        newSet.add(path)
      }
      return newSet
    })
  }, [])

  // Handle node click
  const handleNodeClick = useCallback((node: FileNode) => {
    if (node.type === "directory") {
      toggleFolder(node.path)
      setSelectedPath(node.path)
    } else {
      setSelectedPath(node.path)
      onFileSelect?.(node.path)
    }
  }, [onFileSelect, toggleFolder])

  // Navigate up
  const navigateUp = useCallback(() => {
    const parentPath = currentPath.split("/").slice(0, -1).join("/") || "/"
    setCurrentPath(parentPath)
    fetchFileTree(parentPath)
  }, [currentPath, fetchFileTree])

  // Navigate home
  const navigateHome = useCallback(() => {
    setCurrentPath(basePath)
    fetchFileTree(basePath)
  }, [basePath, fetchFileTree])

  // Collapse all
  const collapseAll = useCallback(() => {
    if (fileTree) {
      setExpandedFolders(new Set([fileTree.path]))
    }
  }, [fileTree])

  // Render file tree recursively
  const renderFileTree = useCallback((node: FileNode, depth = 0): React.ReactNode => {
    const isExpanded = expandedFolders.has(node.path)
    const isSelected = selectedPath === node.path
    const isDirectory = node.type === "directory"

    return (
      <div key={node.path}>
        <div
          className={`flex items-center py-1 px-2 cursor-pointer hover:bg-muted/50 rounded ${
            isSelected ? "bg-primary/20 text-primary" : ""
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => handleNodeClick(node)}
          title={node.path}
        >
          <span className="w-4 h-4 flex items-center justify-center mr-1 text-muted-foreground">
            {isDirectory && (isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />)}
          </span>
          <span className="mr-2">
            {isDirectory ? (
              isExpanded ? <FolderOpen className="w-4 h-4 text-yellow-400" /> : <Folder className="w-4 h-4 text-yellow-400" />
            ) : (
              getFileIcon(node.name)
            )}
          </span>
          <span className={`text-sm truncate ${isDirectory ? "font-medium" : ""}`}>{node.name}</span>
        </div>
        {isDirectory && isExpanded && node.children && (
          <div>{node.children.map((child) => renderFileTree(child, depth + 1))}</div>
        )}
      </div>
    )
  }, [expandedFolders, selectedPath, handleNodeClick])

  return (
    <div className="flex flex-col h-full bg-card rounded-lg border border-border">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <h3 className="font-semibold text-sm">Files</h3>
        <div className="flex gap-1">
          <button onClick={navigateHome} className="p-1.5 hover:bg-muted rounded" title="Home">
            <Home className="w-4 h-4" />
          </button>
          <button onClick={navigateUp} className="p-1.5 hover:bg-muted rounded text-lg font-bold" title="Up">
            ↑
          </button>
          <button onClick={() => fetchFileTree()} className="p-1.5 hover:bg-muted rounded" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowHidden(!showHidden)}
            className={`p-1.5 hover:bg-muted rounded ${showHidden ? "text-yellow-400" : ""}`}
            title={showHidden ? "Hide hidden" : "Show hidden"}
          >
            {showHidden ? "👁️" : "🙈"}
          </button>
          <button onClick={collapseAll} className="p-1.5 hover:bg-muted rounded" title="Collapse all">
            <Minimize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Path */}
      <div className="px-3 py-2 text-xs text-muted-foreground border-b border-border truncate">
        {currentPath}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <Search className="w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search files..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent text-sm outline-none"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery("")} className="text-muted-foreground hover:text-foreground">
            ×
          </button>
        )}
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-auto p-2">
        {loading && <div className="text-center text-muted-foreground py-4">Loading...</div>}
        {error && <div className="text-center text-red-400 py-4">{error}</div>}
        {!loading && !error && filteredTree && renderFileTree(filteredTree)}
      </div>
    </div>
  )
}
