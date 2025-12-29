import React from 'react'
import { X, Terminal as TerminalIcon, Key, Copy, Check } from 'lucide-react'

export function ModalHeader({ showTokenHelp, onToggleTokenHelp, onClose }: {
  showTokenHelp: boolean
  onToggleTokenHelp: () => void
  onClose: () => void
}) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
      <h2 className="text-xl font-semibold text-white flex items-center gap-2">
        <TerminalIcon className="h-5 w-5 text-[#00ff88]" />
        Profiles
      </h2>
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleTokenHelp}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
            showTokenHelp
              ? 'bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/30'
              : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700'
          }`}
          title="Get security token for external launchers"
        >
          <Key className="h-3.5 w-3.5" />
          API Token
        </button>
        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white">
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}

export function TokenHelpPanel({ tokenCopied, onCopyToken, onClose }: {
  tokenCopied: boolean
  onCopyToken: () => void
  onClose: () => void
}) {
  return (
    <div className="px-6 py-4 bg-[#0a0a0a] border-b border-gray-800">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-[#00ff88]/10 text-[#00ff88]">
          <Key className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-white mb-1">Security Token</h3>
          <p className="text-xs text-gray-400 mb-3">
            Copy this token to authorize external launchers to spawn terminals.
          </p>
          <button
            onClick={onCopyToken}
            className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-all ${
              tokenCopied
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-[#00ff88] hover:bg-[#00c8ff] text-black'
            }`}
          >
            {tokenCopied ? <><Check className="h-4 w-4" />Copied!</> : <><Copy className="h-4 w-4" />Copy Token</>}
          </button>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded text-gray-500 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export function ModalFooter({ onClose, onSave }: {
  onClose: () => void
  onSave: () => void
}) {
  return (
    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-800">
      <button onClick={onClose} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded text-sm">
        Cancel
      </button>
      <button
        onClick={onSave}
        className="px-4 py-2 rounded text-sm font-medium transition-colors bg-[#00ff88] hover:bg-[#00c8ff] text-black"
      >
        Save
      </button>
    </div>
  )
}
