// Utility functions for file viewers
import { FileType } from '../../utils/fileTypeUtils'
import { Code, Image as ImageIcon, FileText, FileJson, Video, Table } from 'lucide-react'

// Get icon color class based on file type (matches FileTree.tsx colors)
export const getIconColorClass = (fileType: FileType): string => {
  switch (fileType) {
    case 'image': return 'text-yellow-400'
    case 'video': return 'text-purple-400'
    case 'csv': return 'text-emerald-400'
    case 'markdown': return 'text-blue-400'
    case 'json': return 'text-orange-400'
    case 'code': return 'text-green-400'
    default: return ''
  }
}

// Get icon component based on file type
export const getFileIcon = (fileType: FileType) => {
  switch (fileType) {
    case 'image': return ImageIcon
    case 'video': return Video
    case 'csv': return Table
    case 'markdown': return FileText
    case 'json': return FileJson
    default: return Code
  }
}

// Format relative time (e.g., "2 hours ago", "yesterday")
export const formatRelativeTime = (isoDate: string): string => {
  const date = new Date(isoDate)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

// Simple CSV parser
export const parseCSV = (content: string): { headers: string[], rows: string[][] } => {
  const lines = content.trim().split('\n')
  if (lines.length === 0) return { headers: [], rows: [] }

  // Simple CSV parsing (handles basic cases, not full RFC 4180)
  const parseLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    result.push(current.trim())
    return result
  }

  const headers = parseLine(lines[0])
  const rows = lines.slice(1).map(parseLine)

  return { headers, rows }
}

// Parse YAML frontmatter from markdown content
// Returns { frontmatter, content } where frontmatter is parsed key-value pairs
export const parseFrontmatter = (content: string): { frontmatter: Record<string, string> | null; content: string } => {
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/
  const match = content.match(frontmatterRegex)

  if (!match) {
    return { frontmatter: null, content }
  }

  const frontmatterStr = match[1]
  const remainingContent = content.slice(match[0].length)

  // Simple YAML parsing for key: value pairs (handles multiline values on same line)
  const frontmatter: Record<string, string> = {}
  const lines = frontmatterStr.split('\n')

  for (const line of lines) {
    const colonIndex = line.indexOf(':')
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim()
      const value = line.slice(colonIndex + 1).trim()
      if (key && value) {
        frontmatter[key] = value
      }
    }
  }

  return { frontmatter, content: remainingContent }
}
