/**
 * Strip emojis from text for cleaner TTS announcements.
 * Matches most emoji ranges: emoticons, symbols, pictographs, transport, flags, etc.
 */
export function stripEmojis(text: string): string {
  return text
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Symbols, pictographs, emoticons
    .replace(/[\u{2600}-\u{26FF}]/gu, '')   // Misc symbols
    .replace(/[\u{2700}-\u{27BF}]/gu, '')   // Dingbats
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')   // Variation selectors
    .replace(/[\u{1F000}-\u{1F02F}]/gu, '') // Mahjong, dominos
    .replace(/[\u{1F0A0}-\u{1F0FF}]/gu, '') // Playing cards
    // Remove non-ASCII characters that might trigger foreign language detection
    // Keep basic punctuation and spaces
    .replace(/[^\x20-\x7E]/g, '')
    // Clean up git/code patterns that don't speak well
    .replace(/[a-f0-9]{7,40}/gi, 'hash')    // Git hashes
    .replace(/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}/gi, 'ID') // UUIDs
    .replace(/--[a-z-]+/g, '')               // CLI flags like --no-verify
    .replace(/\s*&&\s*/g, ' then ')          // && becomes "then"
    .replace(/\s*\|\s*/g, ' ')               // pipes
    .replace(/[<>|&;`$(){}[\]\\]/g, ' ')     // Shell metacharacters
    .trim()
    .replace(/\s+/g, ' ') // Collapse multiple spaces
}
