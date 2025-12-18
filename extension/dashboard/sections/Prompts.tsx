import React, { useEffect, useState } from 'react'
import {
  FileText,
  Play,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Plus,
  Trash2,
  Save,
  RotateCcw,
} from 'lucide-react'

const API_BASE = 'http://localhost:8129'

type FieldType = 'text' | 'dropdown' | 'checkbox'
type PromptTarget = 'spawn' | 'tmux-send' | 'clipboard'

interface PromptField {
  name: string
  type: FieldType
  default: string | boolean
  options?: string[]
}

interface PromptTemplate {
  id: string
  name: string
  description: string
  template: string
  fields: PromptField[]
  target: PromptTarget
}

const DEFAULT_PROMPTS: PromptTemplate[] = [
  {
    id: 'summarize-activity',
    name: 'Summarize Activity',
    description: 'Captures tmux panes and sends to an LLM for summarization',
    template: '{{model}} "Summarize the activity in tmux session {{session}}: $(tmux capture-pane -t {{session}} -p -S -100)"',
    fields: [
      { name: 'model', type: 'dropdown', default: 'claude', options: ['claude', 'haiku', 'sonnet', 'gemini'] },
      { name: 'session', type: 'text', default: 'tabzchrome' },
    ],
    target: 'spawn',
  },
  {
    id: 'quick-command',
    name: 'Quick Command',
    description: 'Run any command in a new detached terminal',
    template: '{{command}}',
    fields: [
      { name: 'command', type: 'text', default: 'htop' },
    ],
    target: 'spawn',
  },
  {
    id: 'generate-handoff',
    name: 'Generate Handoff',
    description: 'Runs the ctthandoff slash command to generate a handoff summary',
    template: '/ctthandoff{{#quiet}} --quiet{{/quiet}}',
    fields: [
      { name: 'quiet', type: 'checkbox', default: false },
    ],
    target: 'tmux-send',
  },
]

const TARGET_COLORS: Record<PromptTarget, string> = {
  spawn: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  'tmux-send': 'text-amber-400 bg-amber-400/10 border-amber-400/30',
  clipboard: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30',
}

const TARGET_LABELS: Record<PromptTarget, string> = {
  spawn: 'Spawn Terminal',
  'tmux-send': 'Send to Tmux',
  clipboard: 'Copy to Clipboard',
}

export default function Prompts() {
  const [prompts, setPrompts] = useState<PromptTemplate[]>(DEFAULT_PROMPTS)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [fieldValues, setFieldValues] = useState<Record<string, Record<string, string | boolean>>>({})
  const [copied, setCopied] = useState<string | null>(null)
  const [running, setRunning] = useState<string | null>(null)
  const [tmuxSession, setTmuxSession] = useState('')

  // Load saved prompts from Chrome storage
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['savedPrompts'], (result: { savedPrompts?: PromptTemplate[] }) => {
        if (result.savedPrompts && result.savedPrompts.length > 0) {
          setPrompts(result.savedPrompts)
        }
      })
    }

    // Initialize field values with defaults
    const defaults: Record<string, Record<string, string | boolean>> = {}
    DEFAULT_PROMPTS.forEach((prompt) => {
      defaults[prompt.id] = {}
      prompt.fields.forEach((field) => {
        defaults[prompt.id][field.name] = field.default
      })
    })
    setFieldValues(defaults)
  }, [])

  // Save prompts to Chrome storage
  const savePrompts = (newPrompts: PromptTemplate[]) => {
    setPrompts(newPrompts)
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ savedPrompts: newPrompts })
    }
  }

  const resetToDefaults = () => {
    savePrompts(DEFAULT_PROMPTS)
    const defaults: Record<string, Record<string, string | boolean>> = {}
    DEFAULT_PROMPTS.forEach((prompt) => {
      defaults[prompt.id] = {}
      prompt.fields.forEach((field) => {
        defaults[prompt.id][field.name] = field.default
      })
    })
    setFieldValues(defaults)
  }

  const updateFieldValue = (promptId: string, fieldName: string, value: string | boolean) => {
    setFieldValues((prev) => ({
      ...prev,
      [promptId]: {
        ...prev[promptId],
        [fieldName]: value,
      },
    }))
  }

  const resolveTemplate = (prompt: PromptTemplate): string => {
    let result = prompt.template
    const values = fieldValues[prompt.id] || {}

    prompt.fields.forEach((field) => {
      const value = values[field.name] ?? field.default

      if (field.type === 'checkbox') {
        // Handle conditional sections like {{#quiet}}...{{/quiet}}
        const conditionalRegex = new RegExp(`\\{\\{#${field.name}\\}\\}([^]*?)\\{\\{/${field.name}\\}\\}`, 'g')
        result = result.replace(conditionalRegex, value ? '$1' : '')
      } else {
        // Simple placeholder replacement
        result = result.replace(new RegExp(`\\{\\{${field.name}\\}\\}`, 'g'), String(value))
      }
    })

    return result.trim()
  }

  const runPrompt = async (prompt: PromptTemplate) => {
    const resolved = resolveTemplate(prompt)
    setRunning(prompt.id)

    try {
      if (prompt.target === 'clipboard') {
        await navigator.clipboard.writeText(resolved)
        setCopied(prompt.id)
        setTimeout(() => setCopied(null), 2000)
      } else if (prompt.target === 'spawn') {
        // Spawn a new terminal with the command
        await fetch(`${API_BASE}/api/spawn`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: prompt.name,
            command: resolved,
            workingDir: '~',
          }),
        })
      } else if (prompt.target === 'tmux-send') {
        // Send to tmux session
        const session = tmuxSession || 'tabzchrome'
        await fetch(`${API_BASE}/api/tmux/send-keys`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session,
            keys: resolved,
          }),
        })
      }
    } catch (err) {
      console.error('Failed to run prompt:', err)
    } finally {
      setRunning(null)
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold terminal-glow flex items-center gap-3">
            <FileText className="w-8 h-8" />
            Prompts
          </h1>
          <p className="text-muted-foreground mt-1">
            Saved prompt templates for quick actions
          </p>
        </div>
        <button
          onClick={resetToDefaults}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-sm"
        >
          <RotateCcw className="w-4 h-4" />
          Reset to Defaults
        </button>
      </div>

      {/* Tmux Session Selector (for tmux-send targets) */}
      <div className="mb-6 rounded-xl bg-card border border-border p-4">
        <label className="text-sm text-muted-foreground block mb-2">
          Default tmux session for "Send to Tmux" actions:
        </label>
        <input
          type="text"
          value={tmuxSession}
          onChange={(e) => setTmuxSession(e.target.value)}
          placeholder="tabzchrome"
          className="w-full max-w-xs px-3 py-2 bg-background border border-border rounded-lg focus:border-primary focus:outline-none font-mono text-sm"
        />
      </div>

      {/* Prompt Cards */}
      <div className="space-y-4">
        {prompts.map((prompt) => {
          const isExpanded = expandedId === prompt.id
          const values = fieldValues[prompt.id] || {}

          return (
            <div
              key={prompt.id}
              className="rounded-xl bg-card border border-border overflow-hidden"
            >
              {/* Card Header */}
              <button
                onClick={() => toggleExpand(prompt.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-start">
                    <span className="font-medium text-lg">{prompt.name}</span>
                    <span className="text-sm text-muted-foreground">{prompt.description}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-mono border ${TARGET_COLORS[prompt.target]}`}
                  >
                    {TARGET_LABELS[prompt.target]}
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              </button>

              {/* Expanded Form */}
              {isExpanded && (
                <div className="border-t border-border p-4 space-y-4">
                  {/* Fields */}
                  {prompt.fields.length > 0 && (
                    <div className="space-y-3">
                      {prompt.fields.map((field) => (
                        <div key={field.name} className="flex items-center gap-4">
                          <label className="w-32 text-sm text-muted-foreground capitalize">
                            {field.name}:
                          </label>
                          {field.type === 'dropdown' && field.options ? (
                            <select
                              value={String(values[field.name] ?? field.default)}
                              onChange={(e) => updateFieldValue(prompt.id, field.name, e.target.value)}
                              className="flex-1 max-w-xs px-3 py-2 rounded-lg bg-background border border-border focus:border-primary focus:outline-none"
                            >
                              {field.options.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          ) : field.type === 'checkbox' ? (
                            <input
                              type="checkbox"
                              checked={Boolean(values[field.name] ?? field.default)}
                              onChange={(e) => updateFieldValue(prompt.id, field.name, e.target.checked)}
                              className="w-5 h-5 rounded"
                            />
                          ) : (
                            <input
                              type="text"
                              value={String(values[field.name] ?? field.default)}
                              onChange={(e) => updateFieldValue(prompt.id, field.name, e.target.value)}
                              placeholder={String(field.default)}
                              className="flex-1 max-w-md px-3 py-2 rounded-lg bg-background border border-border focus:border-primary focus:outline-none font-mono text-sm"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Preview */}
                  <div className="p-4 rounded-lg bg-muted/50">
                    <span className="text-xs text-muted-foreground block mb-2">Preview:</span>
                    <code className="text-sm font-mono text-cyan-400 break-all">
                      {resolveTemplate(prompt)}
                    </code>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => runPrompt(prompt)}
                      disabled={running === prompt.id}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                      {running === prompt.id ? (
                        <>
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          Running...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          Run
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(resolveTemplate(prompt))
                        setCopied(prompt.id)
                        setTimeout(() => setCopied(null), 2000)
                      }}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                    >
                      {copied === prompt.id ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
