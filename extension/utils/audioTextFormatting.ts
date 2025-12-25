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
    .trim()
    .replace(/\s+/g, ' ') // Collapse multiple spaces from removed emojis
}
