import React, { useEffect, useState } from 'react'
import { Terminal, Trash2, RefreshCw, Ghost, AlertTriangle, CheckCircle, RotateCcw } from 'lucide-react'
import { getTerminals, getOrphanedSessions, killSession, killSessions, reattachSessions } from '../hooks/useDashboard'

interface TerminalSession {
  id: string
  name: string
  createdAt: string
  state?: string
  workingDir?: string
}

interface OrphanedSession {
  name: string
  created: string
  windows: number
}

export default function TerminalsSection() {
  const [terminals, setTerminals] = useState<TerminalSession[]>([])
  const [orphaned, setOrphaned] = useState<OrphanedSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedOrphans, setSelectedOrphans] = useState<Set<string>>(new Set())
  const [selectedTerminals, setSelectedTerminals] = useState<Set<string>>(new Set())

  const fetchData = async () => {
    try {
      setLoading(true)
      const [terminalsRes, orphanedRes] = await Promise.all([
        getTerminals(),
        getOrphanedSessions(),
      ])

      setTerminals(terminalsRes.data || [])
      setOrphaned(orphanedRes.data?.sessions || [])
      setError(null)
    } catch (err) {
      setError('Failed to connect to backend')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const killOrphaned = async (sessionName: string) => {
    try {
      await killSession(sessionName)
      setOrphaned((prev) => prev.filter((s) => s.name !== sessionName))
      setSelectedOrphans((prev) => {
        const next = new Set(prev)
        next.delete(sessionName)
        return next
      })
    } catch (err) {
      console.error('Failed to kill session:', err)
    }
  }

  const killSelectedOrphans = async () => {
    for (const name of selectedOrphans) {
      await killOrphaned(name)
    }
  }

  const toggleOrphanSelect = (name: string) => {
    setSelectedOrphans((prev) => {
      const next = new Set(prev)
      if (next.has(name)) {
        next.delete(name)
      } else {
        next.add(name)
      }
      return next
    })
  }

  const selectAllOrphans = () => {
    if (selectedOrphans.size === orphaned.length) {
      setSelectedOrphans(new Set())
    } else {
      setSelectedOrphans(new Set(orphaned.map((s) => s.name)))
    }
  }

  // Reattach orphaned sessions
  const reattachOrphaned = async (sessionName: string) => {
    try {
      await reattachSessions([sessionName])
      await fetchData()
    } catch (err) {
      console.error('Failed to reattach session:', err)
    }
  }

  const reattachSelectedOrphans = async () => {
    try {
      await reattachSessions(Array.from(selectedOrphans))
      setSelectedOrphans(new Set())
      await fetchData()
    } catch (err) {
      console.error('Failed to reattach sessions:', err)
    }
  }

  // Active terminal management
  const killTerminal = async (id: string) => {
    try {
      await killSession(id)
      setTerminals((prev) => prev.filter((t) => t.id !== id))
      setSelectedTerminals((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    } catch (err) {
      console.error('Failed to kill terminal:', err)
    }
  }

  const killSelectedTerminals = async () => {
    const toKill = Array.from(selectedTerminals)
    try {
      await killSessions(toKill)
      setTerminals((prev) => prev.filter((t) => !selectedTerminals.has(t.id)))
      setSelectedTerminals(new Set())
    } catch (err) {
      console.error('Failed to kill terminals:', err)
    }
  }

  const toggleTerminalSelect = (id: string) => {
    setSelectedTerminals((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const selectAllTerminals = () => {
    if (selectedTerminals.size === terminals.length) {
      setSelectedTerminals(new Set())
    } else {
      setSelectedTerminals(new Set(terminals.map((t) => t.id)))
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold terminal-glow">Terminals</h1>
          <p className="text-muted-foreground mt-1">
            {terminals.length} active, {orphaned.length} orphaned
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive">
          {error}
        </div>
      )}

      {/* Orphaned Sessions Warning */}
      {orphaned.length > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-amber-400">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-semibold">Orphaned Sessions</span>
              <span className="text-sm text-amber-400/70">({orphaned.length})</span>
            </div>
            {selectedOrphans.size > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={reattachSelectedOrphans}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 text-sm font-medium"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reattach ({selectedOrphans.size})
                </button>
                <button
                  onClick={killSelectedOrphans}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-destructive/20 text-destructive hover:bg-destructive/30 text-sm font-medium"
                >
                  <Trash2 className="w-4 h-4" />
                  Kill ({selectedOrphans.size})
                </button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={selectedOrphans.size === orphaned.length && orphaned.length > 0}
                onChange={selectAllOrphans}
                className="w-4 h-4 rounded"
              />
              <span className="flex-1">Session Name</span>
              <span className="w-24">Windows</span>
              <span className="w-32">Created</span>
              <span className="w-32"></span>
            </div>

            {orphaned.map((session) => (
              <div
                key={session.name}
                className="flex items-center gap-3 px-3 py-2 rounded-lg bg-card border border-border"
              >
                <input
                  type="checkbox"
                  checked={selectedOrphans.has(session.name)}
                  onChange={() => toggleOrphanSelect(session.name)}
                  className="w-4 h-4 rounded"
                />
                <div className="flex items-center gap-2 flex-1">
                  <Ghost className="w-4 h-4 text-amber-400" />
                  <span className="font-mono text-sm">{session.name}</span>
                </div>
                <span className="w-24 text-sm text-muted-foreground">{session.windows} windows</span>
                <span className="w-32 text-sm text-muted-foreground">{session.created}</span>
                <div className="w-32 flex items-center gap-1">
                  <button
                    onClick={() => reattachOrphaned(session.name)}
                    className="flex items-center gap-1 px-2 py-1 rounded text-sm text-primary hover:bg-primary/20"
                    title="Reattach to sidebar"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reattach
                  </button>
                  <button
                    onClick={() => killOrphaned(session.name)}
                    className="flex items-center gap-1 px-2 py-1 rounded text-sm text-destructive hover:bg-destructive/20"
                    title="Kill session"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Terminals */}
      <div className="rounded-xl bg-card border border-border">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Active Terminals</h2>
          </div>
          {selectedTerminals.size > 0 && (
            <button
              onClick={killSelectedTerminals}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-destructive/20 text-destructive hover:bg-destructive/30 text-sm font-medium"
            >
              <Trash2 className="w-4 h-4" />
              Kill Selected ({selectedTerminals.size})
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : terminals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <CheckCircle className="w-12 h-12 mb-4 text-emerald-400" />
            <p>No active terminals</p>
          </div>
        ) : (
          <div>
            {/* Header row */}
            <div className="flex items-center gap-4 px-4 py-2 text-sm text-muted-foreground border-b border-border">
              <input
                type="checkbox"
                checked={selectedTerminals.size === terminals.length && terminals.length > 0}
                onChange={selectAllTerminals}
                className="w-4 h-4 rounded"
              />
              <span className="flex-1">Terminal</span>
              <span className="w-32 text-right">Created</span>
              <span className="w-16"></span>
            </div>

            {/* Terminal rows */}
            <div className="divide-y divide-border">
              {terminals.map((terminal) => (
                <div
                  key={terminal.id}
                  className={`flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors ${
                    selectedTerminals.has(terminal.id) ? 'bg-primary/5' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedTerminals.has(terminal.id)}
                    onChange={() => toggleTerminalSelect(terminal.id)}
                    className="w-4 h-4 rounded"
                  />
                  <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{terminal.name}</div>
                    <div className="text-sm text-muted-foreground font-mono truncate">
                      {terminal.id}
                    </div>
                  </div>
                  <div className="w-32 text-sm text-muted-foreground text-right">
                    {new Date(terminal.createdAt).toLocaleTimeString()}
                  </div>
                  <div className="w-16 flex justify-end">
                    <button
                      onClick={() => killTerminal(terminal.id)}
                      className="p-1.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                      title="Kill terminal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
