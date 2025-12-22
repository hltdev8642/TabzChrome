import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { getFileTypeAndLanguage, FileType } from '../utils/fileTypeUtils'

const API_BASE = "http://localhost:8129"

// Types
interface FileNode {
  name: string
  path: string
  type: "file" | "directory"
  size?: number
  modified?: string
  children?: FileNode[]
}

interface OpenFile {
  id: string
  path: string
  name: string
  content: string | null
  fileType: FileType
  mediaDataUri?: string
  loading: boolean
  error?: string
}

interface FilesContextType {
  // File tree state
  fileTree: FileNode | null
  setFileTree: (tree: FileNode | null) => void
  fileTreePath: string | null  // Track which path the tree was loaded for
  setFileTreePath: (path: string | null) => void

  // Open files state
  openFiles: OpenFile[]
  setOpenFiles: React.Dispatch<React.SetStateAction<OpenFile[]>>
  activeFileId: string | null
  setActiveFileId: (id: string | null) => void

  // Actions
  openFile: (path: string) => Promise<void>
  closeFile: (id: string) => void
}

const FilesContext = createContext<FilesContextType | null>(null)

export function FilesProvider({ children }: { children: ReactNode }) {
  // File tree cache - persist path to localStorage for reload persistence
  const [fileTree, setFileTree] = useState<FileNode | null>(null)
  const [fileTreePath, setFileTreePathState] = useState<string | null>(() => {
    return localStorage.getItem('tabz-files-tree-path')
  })

  // Wrapper to also save to localStorage
  const setFileTreePath = (path: string | null) => {
    setFileTreePathState(path)
    if (path) {
      localStorage.setItem('tabz-files-tree-path', path)
    } else {
      localStorage.removeItem('tabz-files-tree-path')
    }
  }

  // Open files state
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([])
  const [activeFileId, setActiveFileId] = useState<string | null>(null)

  const openFile = useCallback(async (path: string) => {
    // Check if already open
    const existing = openFiles.find(f => f.path === path)
    if (existing) {
      setActiveFileId(existing.id)
      return
    }

    const id = `file-${Date.now()}`
    const name = path.split('/').pop() || path
    const { type: fileType } = getFileTypeAndLanguage(path)

    // Add file in loading state
    const newFile: OpenFile = { id, path, name, content: null, fileType, loading: true }
    setOpenFiles(prev => [...prev, newFile])
    setActiveFileId(id)

    try {
      if (fileType === 'image') {
        const res = await fetch(`${API_BASE}/api/files/image?path=${encodeURIComponent(path)}`)
        const data = await res.json()
        if (data.dataUri) {
          setOpenFiles(prev => prev.map(f => f.id === id ? { ...f, mediaDataUri: data.dataUri, loading: false } : f))
        } else {
          throw new Error('No image data')
        }
      } else if (fileType === 'video') {
        const res = await fetch(`${API_BASE}/api/files/video?path=${encodeURIComponent(path)}`)
        const data = await res.json()
        if (data.error) {
          throw new Error(data.error)
        }
        if (data.dataUri) {
          setOpenFiles(prev => prev.map(f => f.id === id ? { ...f, mediaDataUri: data.dataUri, loading: false } : f))
        } else {
          throw new Error('No video data')
        }
      } else {
        const res = await fetch(`${API_BASE}/api/files/content?path=${encodeURIComponent(path)}`)
        const data = await res.json()
        setOpenFiles(prev => prev.map(f => f.id === id ? { ...f, content: data.content, loading: false } : f))
      }
    } catch (err: any) {
      setOpenFiles(prev => prev.map(f => f.id === id ? { ...f, error: err.message, loading: false } : f))
    }
  }, [openFiles])

  const closeFile = useCallback((id: string) => {
    setOpenFiles(prev => {
      const remaining = prev.filter(f => f.id !== id)
      // Update active file if we closed the active one
      if (activeFileId === id) {
        setActiveFileId(remaining.length > 0 ? remaining[remaining.length - 1].id : null)
      }
      return remaining
    })
  }, [activeFileId])

  return (
    <FilesContext.Provider value={{
      fileTree,
      setFileTree,
      fileTreePath,
      setFileTreePath,
      openFiles,
      setOpenFiles,
      activeFileId,
      setActiveFileId,
      openFile,
      closeFile,
    }}>
      {children}
    </FilesContext.Provider>
  )
}

export function useFilesContext() {
  const context = useContext(FilesContext)
  if (!context) {
    throw new Error('useFilesContext must be used within a FilesProvider')
  }
  return context
}
