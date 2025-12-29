import React, { useState } from 'react'
import { getGradientCSS, getPanelColor } from '../../styles/terminal-backgrounds'
import { getThemeColors, type ThemeColors } from '../../styles/themes'

interface TerminalPreviewProps {
  themeName: string
  backgroundGradient?: string
  panelColor?: string
  transparency?: number
  backgroundMedia?: string
  backgroundMediaType?: 'none' | 'image' | 'video'
  backgroundMediaOpacity?: number
  fontSize?: number
  fontFamily?: string
  isDark?: boolean
}

// Helper to get media URL (matches Terminal.tsx pattern)
const getMediaUrl = (path: string | undefined): string | null => {
  if (!path) return null
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('file://')) {
    return path
  }
  return `http://localhost:8129/api/media?path=${encodeURIComponent(path)}`
}

/**
 * TerminalPreview - Static terminal preview component for profile editing
 *
 * Displays a preview of terminal appearance with all 4 visual layers:
 * 1. Panel Color (base solid background)
 * 2. Background Media (video/image with opacity)
 * 3. Gradient Overlay (with transparency control)
 * 4. Demo Content (styled pre with theme colors)
 *
 * Uses the same layer structure as the real Terminal component.
 */
export function TerminalPreview({
  themeName,
  backgroundGradient,
  panelColor = '#000000',
  transparency = 100,
  backgroundMedia,
  backgroundMediaType = 'none',
  backgroundMediaOpacity = 50,
  fontSize = 14,
  fontFamily = 'monospace',
  isDark = true,
}: TerminalPreviewProps) {
  const [mediaError, setMediaError] = useState(false)

  // Get theme colors for demo content
  const colors = getThemeColors(themeName, isDark)

  // Compute gradient CSS
  const effectiveGradientCSS = backgroundGradient
    ? getGradientCSS(backgroundGradient, isDark)
    : getGradientCSS('dark-neutral', isDark)

  // Get panel color for current mode
  const effectivePanelColor = getPanelColor(panelColor, isDark)

  // Gradient opacity (0 = solid panel color, 100 = full gradient)
  const gradientOpacity = transparency / 100

  // Media handling
  const mediaUrl = getMediaUrl(backgroundMedia)
  const mediaOpacity = backgroundMediaOpacity / 100
  const showMedia = backgroundMediaType !== 'none' && mediaUrl && !mediaError

  return (
    <div
      className="relative w-full h-48 rounded-lg overflow-hidden border border-border"
      style={{ backgroundColor: effectivePanelColor }}
    >
      {/* Layer 2: Background media (video or image) */}
      {showMedia && backgroundMediaType === 'video' && (
        <video
          key={mediaUrl}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{ opacity: mediaOpacity, zIndex: 0 }}
          src={mediaUrl}
          autoPlay
          loop
          muted
          playsInline
          onError={() => setMediaError(true)}
        />
      )}
      {showMedia && backgroundMediaType === 'image' && (
        <img
          key={mediaUrl}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{ opacity: mediaOpacity, zIndex: 0 }}
          src={mediaUrl}
          alt=""
          onError={() => setMediaError(true)}
        />
      )}

      {/* Layer 3: Gradient overlay with transparency */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: effectiveGradientCSS,
          opacity: gradientOpacity,
          zIndex: 1,
        }}
      />

      {/* Layer 4: Demo content */}
      <div
        className="absolute inset-0 p-3 overflow-hidden"
        style={{ zIndex: 2 }}
      >
        <DemoContent
          colors={colors}
          fontSize={fontSize}
          fontFamily={fontFamily}
        />
      </div>
    </div>
  )
}

interface DemoContentProps {
  colors: ThemeColors
  fontSize: number
  fontFamily: string
}

/**
 * DemoContent - Shows Claude Code style output in the preview
 *
 * Displays:
 * - Prompt with path
 * - Claude response with colors
 * - Tool usage
 * - Success message
 */
function DemoContent({ colors, fontSize, fontFamily }: DemoContentProps) {
  // Scale font size down for preview (preview is smaller than real terminal)
  const previewFontSize = Math.max(10, Math.floor(fontSize * 0.85))

  return (
    <pre
      style={{
        fontFamily,
        fontSize: `${previewFontSize}px`,
        lineHeight: 1.4,
        color: colors.foreground,
        margin: 0,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      {/* Prompt line */}
      <span style={{ color: colors.cyan }}>~/projects</span>
      <span style={{ color: colors.foreground }}> </span>
      <span style={{ color: colors.brightBlack }}>(main)</span>
      <span style={{ color: colors.foreground }}>{'\n'}</span>

      {/* Command */}
      <span style={{ color: colors.green }}>$</span>
      <span style={{ color: colors.foreground }}> claude "fix the bug"</span>
      {'\n\n'}

      {/* Claude header */}
      <span style={{ color: colors.cyan }}>{'─'.repeat(30)}</span>
      {'\n'}

      {/* Tool usage */}
      <span style={{ color: colors.magenta }}>Read</span>
      <span style={{ color: colors.foreground }}> </span>
      <span style={{ color: colors.blue }}>src/components/App.tsx</span>
      {'\n'}

      {/* Status */}
      <span style={{ color: colors.brightBlack }}>Analyzing code...</span>
      {'\n\n'}

      {/* Result */}
      <span style={{ color: colors.green }}>{'>'}</span>
      <span style={{ color: colors.foreground }}> Fixed null check on line 42</span>
      {'\n'}

      {/* Color palette preview */}
      <span style={{ color: colors.brightBlack, fontSize: `${previewFontSize - 2}px` }}>
        {'\n'}Colors:{' '}
      </span>
      <span style={{ color: colors.red }}>{'●'}</span>
      <span style={{ color: colors.green }}>{'●'}</span>
      <span style={{ color: colors.yellow }}>{'●'}</span>
      <span style={{ color: colors.blue }}>{'●'}</span>
      <span style={{ color: colors.magenta }}>{'●'}</span>
      <span style={{ color: colors.cyan }}>{'●'}</span>
    </pre>
  )
}

export default TerminalPreview
