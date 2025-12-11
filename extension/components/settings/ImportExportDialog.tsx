import React from 'react'
import { Profile, CategorySettings } from './types'

interface ImportExportDialogProps {
  pendingImportProfiles: Profile[]
  pendingImportCategorySettings?: CategorySettings
  importWarnings: string[]
  onConfirm: (mode: 'merge' | 'replace') => void
  onCancel: () => void
}

export function ImportExportDialog({
  pendingImportProfiles,
  pendingImportCategorySettings,
  importWarnings,
  onConfirm,
  onCancel,
}: ImportExportDialogProps) {
  const categoryCount = pendingImportCategorySettings ? Object.keys(pendingImportCategorySettings).length : 0

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60]">
      <div className="bg-[#1a1a1a] border border-gray-700 rounded-lg max-w-md w-full p-6 shadow-2xl">
        <h3 className="text-lg font-semibold text-white mb-4">Import Profiles</h3>
        <p className="text-sm text-gray-400 mb-2">
          Found {pendingImportProfiles.length} profile{pendingImportProfiles.length !== 1 ? 's' : ''} to import
          {categoryCount > 0
            ? ` with ${categoryCount} category setting${categoryCount !== 1 ? 's' : ''}`
            : ''}.
        </p>
        {importWarnings.length > 0 && (
          <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="text-xs text-yellow-400 font-medium mb-1">Warnings:</p>
            {importWarnings.map((warning, i) => (
              <p key={i} className="text-xs text-yellow-300">{warning}</p>
            ))}
          </div>
        )}
        <p className="text-sm text-gray-400 mb-4">
          How would you like to handle existing profiles?
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => onConfirm('merge')}
            className="w-full px-4 py-2 bg-[#00ff88] hover:bg-[#00c8ff] text-black rounded text-sm font-medium transition-colors"
          >
            Merge (add new, keep existing)
          </button>
          <button
            onClick={() => onConfirm('replace')}
            className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm transition-colors"
          >
            Replace all
          </button>
          <button
            onClick={onCancel}
            className="w-full px-4 py-2 bg-transparent hover:bg-white/5 text-gray-400 rounded text-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
