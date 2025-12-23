/**
 * Utilities for parsing and processing .prompty files
 *
 * Format:
 * ---
 * name: Prompt Name
 * description: What this prompt does
 * ---
 * Prompt content with {{variables}}
 */

export interface PromptyFrontmatter {
  name?: string
  description?: string
  [key: string]: string | undefined
}

export interface ParsedPrompty {
  frontmatter: PromptyFrontmatter
  content: string
  variables: string[]
}

export interface ContentSegment {
  type: 'text' | 'field'
  content: string  // For text: the text content. For field: the variable name
  hint?: string    // For field: optional hint after colon (e.g., {{var:hint}})
}

/**
 * Parse a prompty file into frontmatter, content, and detected variables
 */
export function parsePrompty(raw: string): ParsedPrompty {
  const frontmatter: PromptyFrontmatter = {}
  let content = raw

  // Extract YAML frontmatter between --- delimiters
  const frontmatterMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)
  if (frontmatterMatch) {
    const yamlContent = frontmatterMatch[1]
    content = frontmatterMatch[2]

    // Simple YAML parsing (key: value pairs)
    yamlContent.split('\n').forEach(line => {
      const match = line.match(/^(\w+):\s*(.*)$/)
      if (match) {
        frontmatter[match[1]] = match[2].trim()
      }
    })
  }

  // Detect {{variables}} in content
  const variableMatches = content.match(/\{\{(\w+)\}\}/g) || []
  const variables = [...new Set(variableMatches.map(v => v.replace(/\{\{|\}\}/g, '')))]

  return { frontmatter, content, variables }
}

/**
 * Substitute variables in prompt content
 */
export function substituteVariables(content: string, values: Record<string, string>): string {
  let result = content
  for (const [key, value] of Object.entries(values)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
  }
  return result
}

/**
 * Check if a file is a prompty file
 */
export function isPromptyFile(path: string): boolean {
  return /\.prompty$/i.test(path)
}

/**
 * Get content ready for sending (strip frontmatter, substitute variables)
 */
export function getPromptForSending(raw: string, variables: Record<string, string>): string {
  const { content } = parsePrompty(raw)
  return substituteVariables(content, variables)
}

/**
 * Parse content into segments of text and fields for inline rendering
 * Supports both {{variable}} and {{variable:hint}} syntax
 */
export function parseContentToSegments(content: string): ContentSegment[] {
  const segments: ContentSegment[] = []
  const fieldRegex = /\{\{([^:}]+)(?::([^}]+))?\}\}/g
  let lastIndex = 0
  let match

  while ((match = fieldRegex.exec(content)) !== null) {
    // Add text before this field
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: content.slice(lastIndex, match.index),
      })
    }

    // Add the field
    segments.push({
      type: 'field',
      content: match[1].trim(),  // Variable name
      hint: match[2]?.trim(),    // Optional hint
    })

    lastIndex = fieldRegex.lastIndex
  }

  // Add remaining text after last field
  if (lastIndex < content.length) {
    segments.push({
      type: 'text',
      content: content.slice(lastIndex),
    })
  }

  return segments
}

/**
 * Get progress on filling variables
 */
export function getFieldProgress(
  variables: string[],
  values: Record<string, string>
): { filled: number; total: number; percentage: number } {
  const total = variables.length
  const filled = variables.filter(v => values[v]?.trim()).length
  const percentage = total > 0 ? Math.round((filled / total) * 100) : 100
  return { filled, total, percentage }
}
