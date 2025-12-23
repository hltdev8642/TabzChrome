import React, { useState, useMemo, useCallback } from 'react'
import { Copy, Send, Terminal, ChevronDown, AtSign, Star, Pin, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react'
import { parsePrompty, getPromptForSending, parseContentToSegments, getFieldProgress } from '../../utils/promptyUtils'
import { InlineField } from './InlineField'
import { sendMessage } from '../../../shared/messaging'

interface TerminalInfo {
  id: string
  name: string
  sessionName?: string
  isClaudeSession?: boolean
}

interface PromptyViewerProps {
  content: string
  path: string
  name: string
  fontSize: number
  fontFamily: string
  pinned: boolean
  isFavorite: boolean
  onToggleFavorite: () => void
  onPin: () => void
  onOpenInEditor: () => void
}

export function PromptyViewer({
  content,
  path,
  name,
  fontSize,
  fontFamily,
  pinned,
  isFavorite,
  onToggleFavorite,
  onPin,
  onOpenInEditor,
}: PromptyViewerProps) {
  const [variableValues, setVariableValues] = useState<Record<string, string>>({})
  const [showSendDropdown, setShowSendDropdown] = useState(false)
  const [terminals, setTerminals] = useState<TerminalInfo[]>([])
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle')
  const [activeFieldIndex, setActiveFieldIndex] = useState<number | null>(null)

  // Parse the prompty file
  const parsed = useMemo(() => parsePrompty(content), [content])

  // Parse content into segments for inline rendering
  const segments = useMemo(() => parseContentToSegments(parsed.content), [parsed.content])

  // Get ordered list of field names (for tab navigation)
  const fieldOrder = useMemo(() => {
    return segments
      .filter(s => s.type === 'field')
      .map(s => s.content)
  }, [segments])

  // Progress tracking
  const progress = useMemo(
    () => getFieldProgress(parsed.variables, variableValues),
    [parsed.variables, variableValues]
  )

  const handleFieldChange = useCallback((fieldId: string, value: string) => {
    setVariableValues(prev => ({ ...prev, [fieldId]: value }))
  }, [])

  // Tab navigation between fields
  const handleNavigate = useCallback((currentFieldId: string, direction: 'next' | 'prev') => {
    const currentIndex = fieldOrder.indexOf(currentFieldId)
    let nextIndex: number

    if (direction === 'next') {
      if (currentIndex >= fieldOrder.length - 1) {
        // Last field, clear active
        setActiveFieldIndex(null)
        return
      }
      nextIndex = currentIndex + 1
    } else {
      if (currentIndex <= 0) {
        setActiveFieldIndex(null)
        return
      }
      nextIndex = currentIndex - 1
    }

    setActiveFieldIndex(nextIndex)
    // Clear after a moment to allow the field to activate
    setTimeout(() => setActiveFieldIndex(null), 100)
  }, [fieldOrder])

  const copyContent = async () => {
    const processed = getPromptForSending(content, variableValues)
    await navigator.clipboard.writeText(processed)
    setCopyStatus('copied')
    setTimeout(() => setCopyStatus('idle'), 2000)
  }

  const copyPath = async () => {
    await navigator.clipboard.writeText(`@${path}`)
  }

  const fetchTerminals = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:8129/api/agents')
      if (!response.ok) return
      const data = await response.json()
      const terminalList: TerminalInfo[] = (data.data || []).map((t: any) => ({
        id: t.id,
        name: t.name || t.id,
        sessionName: t.sessionName,
        isClaudeSession: t.name?.toLowerCase().includes('claude') || t.id?.includes('claude')
      }))
      setTerminals(terminalList)
    } catch (err) {
      console.error('Failed to fetch terminals:', err)
    }
  }, [])

  const sendToTerminal = useCallback(async (terminal: TerminalInfo, sendEnter: boolean = false) => {
    const processed = getPromptForSending(content, variableValues)

    setSendStatus('sending')
    try {
      if (terminal.sessionName) {
        await sendMessage({
          type: 'TMUX_SESSION_SEND',
          sessionName: terminal.sessionName,
          text: processed,
          sendEnter
        })
      } else {
        await sendMessage({
          type: 'TERMINAL_INPUT',
          terminalId: terminal.id,
          data: processed
        })
      }
      setSendStatus('sent')
      setShowSendDropdown(false)
      setTimeout(() => setSendStatus('idle'), 2000)
    } catch (err) {
      console.error('Failed to send to terminal:', err)
      setSendStatus('idle')
    }
  }, [content, variableValues])

  // Track which field index we're at while rendering
  let fieldIndex = 0

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 border-b border-border bg-card/50 flex-wrap">
        <button
          onClick={copyContent}
          className={`flex items-center gap-1 px-2 py-1 text-sm hover:bg-muted rounded ${copyStatus === 'copied' ? 'text-green-400' : ''}`}
          title="Copy prompt (with variables filled)"
        >
          <Copy className="w-4 h-4" /> {copyStatus === 'copied' ? 'Copied!' : 'Copy'}
        </button>
        <button onClick={copyPath} className="flex items-center gap-1 px-2 py-1 text-sm hover:bg-muted rounded" title="Copy @path to clipboard">
          <AtSign className="w-4 h-4" /> Path
        </button>
        <button
          onClick={onToggleFavorite}
          className={`flex items-center gap-1 px-2 py-1 text-sm hover:bg-muted rounded ${isFavorite ? 'text-yellow-400' : ''}`}
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Star className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
        </button>
        {!pinned && (
          <button
            onClick={onPin}
            className="flex items-center gap-1 px-2 py-1 text-sm hover:bg-muted rounded text-primary"
            title="Pin this file (keep tab open)"
          >
            <Pin className="w-4 h-4" /> Pin
          </button>
        )}
        <button onClick={onOpenInEditor} className="flex items-center gap-1 px-2 py-1 text-sm hover:bg-muted rounded">
          <ExternalLink className="w-4 h-4" /> Edit
        </button>

        {/* Send to Terminal dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              if (!showSendDropdown) fetchTerminals()
              setShowSendDropdown(!showSendDropdown)
            }}
            className={`flex items-center gap-1 px-2 py-1 text-sm hover:bg-muted rounded ${
              sendStatus === 'sent' ? 'text-green-400' : ''
            }`}
            title="Send prompt to terminal"
          >
            <Send className="w-4 h-4" />
            {sendStatus === 'sent' ? 'Sent!' : 'Send'}
            <ChevronDown className="w-3 h-3" />
          </button>
          {showSendDropdown && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-card border border-border rounded-lg shadow-xl z-50 py-1">
              {terminals.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">No terminals found</div>
              ) : (
                <>
                  <div className="px-3 py-1 text-xs text-muted-foreground border-b border-border mb-1">
                    Send to terminal
                  </div>
                  {terminals.map(t => (
                    <div key={t.id} className="px-2">
                      <button
                        onClick={() => sendToTerminal(t, false)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-muted rounded text-left"
                      >
                        <Terminal className={`w-4 h-4 ${t.isClaudeSession ? 'text-orange-400' : ''}`} />
                        <span className="truncate flex-1">{t.name}</span>
                        {t.isClaudeSession && <span className="text-xs text-orange-400">🤖</span>}
                      </button>
                      {t.isClaudeSession && (
                        <button
                          onClick={() => sendToTerminal(t, true)}
                          className="w-full flex items-center gap-2 px-2 py-1 text-xs hover:bg-muted rounded text-left text-muted-foreground ml-6"
                          title="Send and press Enter to submit"
                        >
                          <Send className="w-3 h-3" /> Send + Enter (submit)
                        </button>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* Progress indicator */}
        {progress.total > 0 && (
          <div className="flex items-center gap-1.5 ml-auto text-xs text-muted-foreground">
            {progress.filled === progress.total ? (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            ) : (
              <AlertCircle className="w-4 h-4 text-pink-400/60" />
            )}
            <span>
              {progress.filled}/{progress.total} filled
            </span>
          </div>
        )}
      </div>

      {/* Frontmatter header */}
      {(parsed.frontmatter.name || parsed.frontmatter.description) && (
        <div className="px-4 py-3 border-b border-border bg-pink-500/5">
          {parsed.frontmatter.name && (
            <h2 className="text-lg font-semibold text-pink-400">{parsed.frontmatter.name}</h2>
          )}
          {parsed.frontmatter.description && (
            <p className="text-sm text-muted-foreground mt-1">{parsed.frontmatter.description}</p>
          )}
        </div>
      )}

      {/* Prompt content with inline fields */}
      <div
        className="flex-1 overflow-auto p-4"
        style={{
          fontSize: `${fontSize}px`,
          fontFamily: `${fontFamily}, monospace`,
          lineHeight: '1.6',
        }}
      >
        <div className="whitespace-pre-wrap">
          {segments.map((segment, index) => {
            if (segment.type === 'text') {
              return (
                <span key={`text-${index}`}>
                  {segment.content}
                </span>
              )
            }

            // Field segment
            const currentFieldIndex = fieldIndex
            fieldIndex++

            return (
              <InlineField
                key={`field-${segment.content}-${index}`}
                fieldId={segment.content}
                hint={segment.hint}
                value={variableValues[segment.content] || ''}
                onChange={handleFieldChange}
                onNavigate={(direction) => handleNavigate(segment.content, direction)}
                isActive={activeFieldIndex === currentFieldIndex}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
