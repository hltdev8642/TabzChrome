/**
 * Terminal Background Gradients
 * Separate from text color themes for mix-and-match customization
 *
 * Architecture:
 * - Panel Color: Base solid color (shown when transparency = 0)
 * - Gradient: CSS gradient overlay (shown when transparency > 0)
 * - Transparency: 0-100% controls gradient visibility
 *
 * Each gradient has a dark version (default) and a lightGradient (softer, muted - not white)
 */

export interface BackgroundGradient {
  name: string
  gradient: string       // CSS gradient or solid color (dark mode)
  lightGradient: string  // Lighter variant (not white - just softer version)
  preview: string[]      // Colors for preview dots
  description?: string
}

export const backgroundGradients: Record<string, BackgroundGradient> = {
  // === Neutral/Black ===
  'dark-neutral': {
    name: 'Dark Neutral',
    gradient: 'linear-gradient(135deg, #0a0a0f 0%, #1a1b26 100%)',
    lightGradient: 'linear-gradient(135deg, #3a3a4f 0%, #4a4b56 100%)',
    preview: ['#0a0a0f', '#1a1b26'],
    description: 'Subtle dark gradient, works with any text theme',
  },

  'pure-black': {
    name: 'Pure Black',
    gradient: '#000000',
    lightGradient: '#2a2a2a',
    preview: ['#000000'],
    description: 'Solid black for maximum contrast',
  },

  'carbon': {
    name: 'Carbon',
    gradient: 'linear-gradient(135deg, #000000 0%, #111111 50%, #1a1a1a 100%)',
    lightGradient: 'linear-gradient(135deg, #2a2a2a 0%, #3b3b3b 50%, #4a4a4a 100%)',
    preview: ['#000000', '#111111', '#1a1a1a'],
    description: 'Sleek carbon fiber gradient with subtle depth',
  },

  // === Purple ===
  'dracula-purple': {
    name: 'Dracula Purple',
    gradient: 'linear-gradient(135deg, #1a1b26 0%, #282a36 50%, #1a1b26 100%)',
    lightGradient: 'linear-gradient(135deg, #4a4b56 0%, #585a66 50%, #4a4b56 100%)',
    preview: ['#1a1b26', '#282a36'],
    description: 'Dracula theme inspired gradient',
  },

  'deep-purple': {
    name: 'Deep Purple',
    gradient: 'linear-gradient(135deg, #14141e 0%, #1e1428 100%)',
    lightGradient: 'linear-gradient(135deg, #44444e 0%, #4e4458 100%)',
    preview: ['#14141e', '#1e1428'],
    description: 'Rich purple gradient',
  },

  // === Blue ===
  'ocean-depths': {
    name: 'Ocean Depths',
    gradient: 'linear-gradient(135deg, #001a33 0%, #003d5c 50%, #001f3d 100%)',
    lightGradient: 'linear-gradient(135deg, #304a63 0%, #406d8c 50%, #304f6d 100%)',
    preview: ['#001a33', '#003d5c', '#001f3d'],
    description: 'Deep blue ocean gradient',
  },

  'midnight-blue': {
    name: 'Midnight Blue',
    gradient: 'linear-gradient(135deg, #0a0d1a 0%, #14213d 50%, #0a0f1f 100%)',
    lightGradient: 'linear-gradient(135deg, #3a3d4a 0%, #44516d 50%, #3a3f4f 100%)',
    preview: ['#0a0d1a', '#14213d', '#0a0f1f'],
    description: 'Navy blue midnight gradient',
  },

  // === Green ===
  'matrix-depths': {
    name: 'Matrix Depths',
    gradient: 'linear-gradient(135deg, #001a00 0%, #000d00 50%, #000500 100%)',
    lightGradient: 'linear-gradient(135deg, #304a30 0%, #303d30 50%, #303530 100%)',
    preview: ['#001a00', '#000d00', '#000500'],
    description: 'Deep green gradient for matrix/terminal aesthetics',
  },

  'terminal-green': {
    name: 'Terminal Green',
    gradient: 'linear-gradient(135deg, #000f00 0%, #001a00 50%, #000a00 100%)',
    lightGradient: 'linear-gradient(135deg, #303f30 0%, #304a30 50%, #303a30 100%)',
    preview: ['#000f00', '#001a00', '#000a00'],
    description: 'Classic terminal green background',
  },

  'forest-night': {
    name: 'Forest Night',
    gradient: 'linear-gradient(135deg, #0d1f0d 0%, #1a331a 50%, #0a1a0a 100%)',
    lightGradient: 'linear-gradient(135deg, #3d4f3d 0%, #4a634a 50%, #3a4a3a 100%)',
    preview: ['#0d1f0d', '#1a331a', '#0a1a0a'],
    description: 'Dark green forest gradient',
  },

  // === Warm/Amber ===
  'amber-warmth': {
    name: 'Amber Warmth',
    gradient: 'linear-gradient(135deg, #2d1810 0%, #1a1308 50%, #0a0603 100%)',
    lightGradient: 'linear-gradient(135deg, #5d4840 0%, #4a4338 50%, #3a3633 100%)',
    preview: ['#2d1810', '#1a1308', '#0a0603'],
    description: 'Warm amber gradient, pairs with amber/retro themes',
  },

  'monokai-brown': {
    name: 'Monokai Brown',
    gradient: 'linear-gradient(135deg, #1a1612 0%, #272822 50%, #1a1612 100%)',
    lightGradient: 'linear-gradient(135deg, #4a4642 0%, #575852 50%, #4a4642 100%)',
    preview: ['#1a1612', '#272822'],
    description: 'Monokai theme inspired gradient',
  },

  // === Neon/Cyberpunk ===
  'cyberpunk-neon': {
    name: 'Cyberpunk Neon',
    gradient: 'linear-gradient(135deg, #14001e 0%, #2d0033 50%, #1a0026 100%)',
    lightGradient: 'linear-gradient(135deg, #44304e 0%, #5d3063 50%, #4a3056 100%)',
    preview: ['#14001e', '#2d0033', '#1a0026'],
    description: 'Purple-pink gradient for cyberpunk vibes',
  },

  'vaporwave-dream': {
    name: 'Vaporwave Dream',
    gradient: 'linear-gradient(135deg, #1a0033 0%, #330066 30%, #4d0066 70%, #1a0033 100%)',
    lightGradient: 'linear-gradient(135deg, #4a3063 0%, #633096 30%, #7d3096 70%, #4a3063 100%)',
    preview: ['#1a0033', '#330066', '#4d0066'],
    description: 'Purple gradient with vaporwave aesthetic',
  },

  // === Sunset/Warm ===
  'sunset-fade': {
    name: 'Sunset Fade',
    gradient: 'linear-gradient(135deg, #1a0a0f 0%, #330d1a 30%, #4d1a2b 60%, #1a0a0f 100%)',
    lightGradient: 'linear-gradient(135deg, #4a3a3f 0%, #633d4a 30%, #7d4a5b 60%, #4a3a3f 100%)',
    preview: ['#1a0a0f', '#330d1a', '#4d1a2b'],
    description: 'Deep red-purple sunset gradient',
  },

  'synthwave-sunset': {
    name: 'Synthwave Sunset',
    gradient: 'linear-gradient(135deg, #190a14 0%, #2d1429 30%, #4d1a3d 60%, #2d1429 100%)',
    lightGradient: 'linear-gradient(135deg, #493a44 0%, #5d4459 30%, #7d4a6d 60%, #5d4459 100%)',
    preview: ['#190a14', '#2d1429', '#4d1a3d'],
    description: 'Synthwave sunset gradient',
  },

  // === Special Effects ===
  'aurora-borealis': {
    name: 'Aurora Borealis',
    gradient: 'linear-gradient(135deg, #001420 0%, #002d3d 30%, #004d5c 60%, #002d3d 100%)',
    lightGradient: 'linear-gradient(135deg, #304450 0%, #405d6d 30%, #507d8c 60%, #405d6d 100%)',
    preview: ['#001420', '#002d3d', '#004d5c'],
    description: 'Northern lights inspired gradient',
  },

  'neon-city': {
    name: 'Neon City',
    gradient: 'radial-gradient(ellipse at top, #1a0033 0%, #0a0a1f 50%, #000000 100%)',
    lightGradient: 'radial-gradient(ellipse at top, #4a3063 0%, #3a3a4f 50%, #2a2a2a 100%)',
    preview: ['#1a0033', '#0a0a1f', '#000000'],
    description: 'Radial gradient for neon city vibes',
  },

  // === Theme-Matched ===
  'github-dark': {
    name: 'GitHub Dark',
    gradient: 'linear-gradient(135deg, #0d1117 0%, #161b22 50%, #0d1117 100%)',
    lightGradient: 'linear-gradient(135deg, #3d4147 0%, #464b52 50%, #3d4147 100%)',
    preview: ['#0d1117', '#161b22'],
    description: 'GitHub dark theme gradient',
  },

  'solarized-dark': {
    name: 'Solarized Dark',
    gradient: 'linear-gradient(135deg, #002b36 0%, #073642 50%, #002b36 100%)',
    lightGradient: 'linear-gradient(135deg, #305b66 0%, #376672 50%, #305b66 100%)',
    preview: ['#002b36', '#073642'],
    description: 'Solarized dark theme gradient',
  },

  // === Utility ===
  'transparent': {
    name: 'Transparent',
    gradient: 'transparent',
    lightGradient: 'transparent',
    preview: ['rgba(128,128,128,0.2)'],
    description: 'Fully transparent, shows panel color only',
  },
}

// Gradient names for UI dropdowns
export const gradientNames = Object.keys(backgroundGradients)

// Get gradient by key with fallback
export function getGradient(key?: string): BackgroundGradient {
  if (!key) return backgroundGradients['dark-neutral']
  return backgroundGradients[key] || backgroundGradients['dark-neutral']
}

// Get CSS value for background gradient (supports light/dark mode)
export function getGradientCSS(key?: string, isDark = true): string {
  const bg = getGradient(key)
  return isDark ? bg.gradient : bg.lightGradient
}

// Panel color presets for quick selection
export const PANEL_COLORS = [
  { name: 'Black', value: '#000000' },
  { name: 'Near Black', value: '#0a0a0f' },
  { name: 'Charcoal', value: '#1a1a1a' },
  { name: 'Dark Gray', value: '#2d2d2d' },
  { name: 'Gray', value: '#4a4a4a' },
  // Accent colors
  { name: 'Navy', value: '#0a0d1a' },
  { name: 'Forest', value: '#0a1a0a' },
  { name: 'Wine', value: '#1a0a0f' },
  { name: 'Purple', value: '#14001e' },
] as const

export const DEFAULT_PANEL_COLOR = '#000000'
export const DEFAULT_TRANSPARENCY = 100  // Full gradient by default
