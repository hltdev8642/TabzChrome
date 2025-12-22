import { useState, useEffect } from 'react'

export interface FileViewerSettings {
  fontSize: number
  fontFamily: string
  maxDepth: number
}

const DEFAULT_SETTINGS: FileViewerSettings = {
  fontSize: 16,
  fontFamily: 'JetBrains Mono',
  maxDepth: 5,
}

export function useFileViewerSettings() {
  const [settings, setSettings] = useState<FileViewerSettings>(DEFAULT_SETTINGS)
  const [loaded, setLoaded] = useState(false)

  // Load settings from Chrome storage
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get([
        'fileViewerFontSize',
        'fileViewerFontFamily',
        'fileTreeMaxDepth'
      ], (result: {
        fileViewerFontSize?: number
        fileViewerFontFamily?: string
        fileTreeMaxDepth?: number
      }) => {
        setSettings({
          fontSize: result.fileViewerFontSize ?? DEFAULT_SETTINGS.fontSize,
          fontFamily: result.fileViewerFontFamily ?? DEFAULT_SETTINGS.fontFamily,
          maxDepth: result.fileTreeMaxDepth ?? DEFAULT_SETTINGS.maxDepth,
        })
        setLoaded(true)
      })

      // Listen for changes from Settings page
      const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
        if (changes.fileViewerFontSize) {
          setSettings(prev => ({ ...prev, fontSize: changes.fileViewerFontSize.newValue as number }))
        }
        if (changes.fileViewerFontFamily) {
          setSettings(prev => ({ ...prev, fontFamily: changes.fileViewerFontFamily.newValue as string }))
        }
        if (changes.fileTreeMaxDepth) {
          setSettings(prev => ({ ...prev, maxDepth: changes.fileTreeMaxDepth.newValue as number }))
        }
      }

      chrome.storage.local.onChanged.addListener(listener)
      return () => chrome.storage.local.onChanged.removeListener(listener)
    } else {
      setLoaded(true)
    }
  }, [])

  const setFontSize = (size: number) => {
    setSettings(prev => ({ ...prev, fontSize: size }))
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ fileViewerFontSize: size })
    }
  }

  const setFontFamily = (family: string) => {
    setSettings(prev => ({ ...prev, fontFamily: family }))
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ fileViewerFontFamily: family })
    }
  }

  return { settings, loaded, setFontSize, setFontFamily }
}
