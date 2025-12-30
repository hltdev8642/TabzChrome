/**
 * Audio template rendering utilities
 * Handles phrase templates with variable substitution for TTS announcements
 */

import { TEMPLATE_VARIABLES, DEFAULT_PHRASES } from '../components/settings/types'

export interface TemplateContext {
  title?: string      // User's preferred title (Sir, Captain, etc.)
  profile?: string
  tool?: string
  filename?: string
  count?: number
  percentage?: number
  question?: string   // For AskUserQuestion events
  options?: string    // Comma-separated list of options
}

/**
 * Render a template string with context values
 * @param template - Template string with {variable} placeholders
 * @param context - Values to substitute for variables
 * @returns Rendered string with variables replaced
 */
export function renderTemplate(template: string, context: TemplateContext): string {
  let result = template

  if (context.title) {
    result = result.replace(/\{title\}/g, context.title)
  }
  if (context.profile) {
    result = result.replace(/\{profile\}/g, context.profile)
  }
  if (context.tool) {
    result = result.replace(/\{tool\}/g, context.tool)
  }
  if (context.filename) {
    result = result.replace(/\{filename\}/g, context.filename)
  }
  if (context.count !== undefined) {
    result = result.replace(/\{count\}/g, String(context.count))
  }
  if (context.percentage !== undefined) {
    result = result.replace(/\{percentage\}/g, String(context.percentage))
  }
  if (context.question) {
    result = result.replace(/\{question\}/g, context.question)
  }
  if (context.options) {
    result = result.replace(/\{options\}/g, context.options)
  }

  // Remove any unreplaced variables (clean output)
  result = result.replace(/\{[^}]+\}/g, '')

  // Clean up extra spaces from removed variables
  result = result.replace(/\s+/g, ' ').trim()

  return result
}

/**
 * Get available template variables for an event type
 * @param eventType - The audio event type
 * @returns Array of variable placeholders (e.g., ['{profile}', '{tool}'])
 */
export function getAvailableVariables(eventType: string): string[] {
  return TEMPLATE_VARIABLES[eventType] || ['{profile}']
}

/**
 * Get the default phrase template for an event type
 * @param eventType - The audio event type
 * @param variant - Optional variant (e.g., 'toolsWithDetails', 'subagentsComplete')
 * @returns Default phrase template
 */
export function getDefaultPhrase(eventType: string, variant?: string): string {
  if (variant && DEFAULT_PHRASES[variant]) {
    return DEFAULT_PHRASES[variant]
  }
  return DEFAULT_PHRASES[eventType] || '{profile}'
}

/**
 * Render a preview with sample values for the UI
 * @param template - Template string to preview
 * @param eventType - Event type (used to determine which sample values to use)
 * @returns Rendered preview string
 */
export function renderPreview(template: string, eventType: string, userTitle?: string): string {
  const sampleContext: TemplateContext = {
    title: userTitle || 'Sir',
    profile: 'Claude',
    tool: 'Reading',
    filename: 'example.ts',
    count: 2,
    percentage: 50,
    question: 'Which approach should we use?',
    options: 'Option A, Option B, or Other',
  }

  return renderTemplate(template, sampleContext)
}
