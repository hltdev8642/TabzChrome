import React, { useState } from 'react'
import { SettingsProvider, useSettings } from './settings/SettingsContext'
import { ProfilesTab } from './settings/ProfilesTab'
import { ImportExportDialog } from './settings/ImportExportDialog'
import { ModalHeader, TokenHelpPanel, ModalFooter } from './settings/ModalUI'

// Re-export types for backward compatibility
export type {
  Profile,
  CategorySettings,
  AudioSettings,
  AudioEventSettings,
  AudioMode,
  ProfileAudioOverrides,
} from './settings/types'

export { CATEGORY_COLORS, DEFAULT_CATEGORY_COLOR } from './settings/types'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  editProfileId?: string | null
  /** Preview profile appearance changes on active terminals */
  onPreviewProfileAppearance?: (profileId: string, appearance: {
    themeName?: string
    backgroundGradient?: string
    panelColor?: string
    transparency?: number
    fontFamily?: string
    backgroundMedia?: string
    backgroundMediaType?: 'none' | 'image' | 'video'
    backgroundMediaOpacity?: number
  }) => void
  /** Clear preview overrides (on cancel) */
  onClearPreview?: (profileId: string) => void
}

/**
 * SettingsModal - Main settings interface for Tabz
 * Thin orchestrator that delegates to tab components via SettingsContext
 */
export function SettingsModal({ isOpen, onClose, editProfileId, onPreviewProfileAppearance, onClearPreview }: SettingsModalProps) {
  if (!isOpen) return null

  return (
    <SettingsProvider
      isOpen={isOpen}
      onClose={onClose}
      onPreviewProfileAppearance={onPreviewProfileAppearance}
      onClearPreview={onClearPreview}
    >
      <SettingsModalContent onClose={onClose} editProfileId={editProfileId} />
    </SettingsProvider>
  )
}

interface SettingsModalContentProps {
  onClose: () => void
  editProfileId?: string | null
}

function SettingsModalContent({ onClose, editProfileId }: SettingsModalContentProps) {
  const settings = useSettings()

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
      {/* Hidden file input for import */}
      <input
        ref={settings.fileInputRef}
        type="file"
        accept=".json"
        onChange={settings.handleFileSelect}
        className="hidden"
      />

      {/* Import Confirmation Dialog */}
      {settings.showImportDialog && (
        <ImportExportDialog
          pendingImportProfiles={settings.pendingImportProfiles}
          pendingImportCategorySettings={settings.pendingImportCategorySettings}
          importWarnings={settings.importWarnings}
          onConfirm={settings.handleImportConfirm}
          onCancel={settings.handleImportCancel}
        />
      )}

      <div className="bg-[#0f0f0f] border border-gray-800 rounded-lg max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <ModalHeader
          showTokenHelp={settings.showTokenHelp}
          onToggleTokenHelp={() => settings.setShowTokenHelp(!settings.showTokenHelp)}
          onClose={onClose}
        />

        {/* Security Token Help Panel */}
        {settings.showTokenHelp && (
          <TokenHelpPanel
            tokenCopied={settings.tokenCopied}
            onCopyToken={settings.handleCopyToken}
            onClose={() => settings.setShowTokenHelp(false)}
          />
        )}

        {/* Profiles Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <ProfilesTab
            profiles={settings.profiles}
            setProfiles={settings.setProfiles}
            defaultProfile={settings.defaultProfile}
            setDefaultProfile={settings.setDefaultProfile}
            categorySettings={settings.categorySettings}
            setCategorySettings={settings.setCategorySettings}
            audioSettings={settings.audioSettings}
            onExportProfiles={settings.handleExportProfiles}
            onImportClick={settings.handleImportClick}
            editProfileId={editProfileId}
          />
        </div>

        {/* Footer */}
        <ModalFooter
          onClose={onClose}
          onSave={settings.handleSaveProfiles}
        />
      </div>
    </div>
  )
}
