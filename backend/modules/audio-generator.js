/**
 * Audio generation module for TTS using edge-tts with caching.
 * Shared between /api/audio/generate and /api/audio/speak endpoints.
 */

const { execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const execFileAsync = promisify(execFile);

// Audio cache directory
const AUDIO_CACHE_DIR = '/tmp/claude-audio-cache';

// Voice options for random selection (matches TTS_VOICES in extension settings)
const VOICE_OPTIONS = [
  // US Voices
  'en-US-AndrewMultilingualNeural',
  'en-US-EmmaMultilingualNeural',
  'en-US-BrianMultilingualNeural',
  'en-US-AriaNeural',
  'en-US-GuyNeural',
  'en-US-JennyNeural',
  'en-US-ChristopherNeural',
  'en-US-AvaNeural',
  // UK Voices
  'en-GB-SoniaNeural',
  'en-GB-RyanNeural',
  // AU Voices
  'en-AU-NatashaNeural',
  'en-AU-WilliamMultilingualNeural',
];

/**
 * Strip markdown formatting for cleaner TTS (backticks cause major slowdowns)
 */
function stripMarkdown(text) {
  return text
    .replace(/```[\s\S]*?```/g, ' code block ')  // Remove code blocks
    .replace(/`[^`]+`/g, '')                      // Remove inline code
    .replace(/#{1,6}\s*/g, '')                    // Remove headers
    .replace(/\*\*([^*]+)\*\*/g, '$1')            // Bold to plain
    .replace(/\*([^*]+)\*/g, '$1')                // Italic to plain
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')      // Links to just text
    .replace(/^\s*[-*+]\s+/gm, '')                // Remove list markers
    .replace(/^\s*\d+\.\s+/gm, '')                // Remove numbered list markers
    .replace(/\n{3,}/g, '\n\n')                   // Collapse multiple newlines
    .trim();
}

/**
 * Validate voice parameter (alphanumeric, hyphens, underscores only)
 */
function validateVoice(voice) {
  return /^[a-zA-Z0-9_-]+$/.test(voice);
}

/**
 * Validate rate parameter (format: +N% or -N% where N is 0-100)
 */
function validateRate(rate) {
  return /^[+-]?\d{1,3}%$/.test(rate);
}

/**
 * Validate pitch parameter (format: +NHz or -NHz where N is 0-100)
 */
function validatePitch(pitch) {
  return /^[+-]?\d{1,3}Hz$/.test(pitch);
}

/**
 * Resolve voice name - handles 'random' selection
 */
function resolveVoice(requestedVoice) {
  if (requestedVoice === 'random') {
    return VOICE_OPTIONS[Math.floor(Math.random() * VOICE_OPTIONS.length)];
  }
  return requestedVoice;
}

/**
 * Ensure audio cache directory exists
 */
function ensureCacheDir() {
  if (!fs.existsSync(AUDIO_CACHE_DIR)) {
    fs.mkdirSync(AUDIO_CACHE_DIR, { recursive: true });
  }
}

/**
 * Generate cache key from voice + rate + pitch + text
 */
function getCacheKey(voice, rate, pitch, text) {
  return crypto.createHash('md5').update(`${voice}:${rate}:${pitch}:${text}`).digest('hex');
}

/**
 * Get cached audio file path
 */
function getCacheFilePath(cacheKey) {
  return path.join(AUDIO_CACHE_DIR, `${cacheKey}.mp3`);
}

/**
 * Get audio URL for a cache key
 */
function getAudioUrl(cacheKey) {
  return `http://localhost:8129/audio/${cacheKey}.mp3`;
}

/**
 * Check if audio is cached and valid (exists with content)
 * Returns { cached: true, url } if valid cache exists
 * Returns { cached: false } if not cached or invalid
 */
function checkCache(cacheKey) {
  const cacheFile = getCacheFilePath(cacheKey);
  try {
    const stats = fs.statSync(cacheFile);
    if (stats.size > 0) {
      return { cached: true, url: getAudioUrl(cacheKey) };
    }
    // Empty file - delete it
    fs.unlinkSync(cacheFile);
    return { cached: false };
  } catch {
    return { cached: false };
  }
}

/**
 * Generate audio using edge-tts
 * @param {Object} options
 * @param {string} options.text - Text to convert to speech
 * @param {string} options.voice - Voice name
 * @param {string} options.rate - Speech rate (e.g., '+0%')
 * @param {string} options.pitch - Speech pitch (e.g., '+0Hz')
 * @param {number} [options.baseTimeoutMs=30000] - Base timeout in ms
 * @param {number} [options.timeoutPerKb=5000] - Additional timeout per 1000 chars
 * @param {number} [options.maxTimeoutMs=180000] - Maximum timeout in ms
 * @returns {Promise<{success: boolean, url?: string, cached?: boolean, error?: string}>}
 */
async function generateAudio({
  text,
  voice,
  rate = '+0%',
  pitch = '+0Hz',
  baseTimeoutMs = 30000,
  timeoutPerKb = 5000,
  maxTimeoutMs = 180000,
}) {
  // Strip markdown for faster TTS processing
  let cleanText = stripMarkdown(text);

  // Truncate very long text - Microsoft TTS has ~3000 char limit per request
  const MAX_TEXT_LENGTH = 3000;
  if (cleanText.length > MAX_TEXT_LENGTH) {
    const truncateAt = cleanText.lastIndexOf('.', MAX_TEXT_LENGTH);
    cleanText = cleanText.slice(0, truncateAt > MAX_TEXT_LENGTH / 2 ? truncateAt + 1 : MAX_TEXT_LENGTH);
    console.log(`[Audio] Text truncated to ${cleanText.length} chars`);
  }

  // Resolve random voice
  const resolvedVoice = resolveVoice(voice);

  // Validate parameters
  if (!validateVoice(resolvedVoice)) {
    return { success: false, error: 'Invalid voice parameter' };
  }
  if (!validateRate(rate)) {
    return { success: false, error: 'Invalid rate parameter' };
  }
  if (!validatePitch(pitch)) {
    return { success: false, error: 'Invalid pitch parameter' };
  }

  ensureCacheDir();

  const cacheKey = getCacheKey(resolvedVoice, rate, pitch, cleanText);
  const cacheFile = getCacheFilePath(cacheKey);

  // Check cache
  const cacheResult = checkCache(cacheKey);
  if (cacheResult.cached) {
    return { success: true, url: cacheResult.url, cached: true };
  }

  // Generate with edge-tts
  let tempTextFile = null;
  try {
    const args = ['-v', resolvedVoice];
    if (rate && rate !== '+0%') {
      // Use --rate=value format to avoid negative values being parsed as flags
      args.push(`--rate=${rate}`);
    }
    if (pitch && pitch !== '+0Hz') {
      // Use --pitch=value format for consistency
      args.push(`--pitch=${pitch}`);
    }

    // Always use file input - special characters break -t flag
    tempTextFile = path.join(AUDIO_CACHE_DIR, `${cacheKey}.txt`);
    fs.writeFileSync(tempTextFile, cleanText, 'utf8');
    args.push('-f', tempTextFile);
    args.push('--write-media', cacheFile);

    // Scale timeout with text length
    const timeoutMs = Math.min(maxTimeoutMs, baseTimeoutMs + Math.floor(cleanText.length / 1000) * timeoutPerKb);
    await execFileAsync('edge-tts', args, { timeout: timeoutMs });

    // Verify file was created with content
    const stats = fs.statSync(cacheFile);
    if (stats.size > 0) {
      return { success: true, url: getAudioUrl(cacheKey), cached: false };
    } else {
      fs.unlinkSync(cacheFile);
      return { success: false, error: 'Audio generation produced empty file' };
    }
  } catch (err) {
    // Only log non-network errors
    if (!err.message?.includes('ETIMEDOUT') && !err.message?.includes('ENETUNREACH')) {
      console.error('[Audio] edge-tts error:', err.message);
      if (err.stderr) {
        console.error('[Audio] edge-tts stderr:', err.stderr);
      }
    }
    return { success: false, error: 'TTS generation failed' };
  } finally {
    // Clean up temp text file
    if (tempTextFile && fs.existsSync(tempTextFile)) {
      fs.unlinkSync(tempTextFile);
    }
  }
}

module.exports = {
  stripMarkdown,
  validateVoice,
  validateRate,
  validatePitch,
  resolveVoice,
  ensureCacheDir,
  getCacheKey,
  getCacheFilePath,
  getAudioUrl,
  checkCache,
  generateAudio,
  VOICE_OPTIONS,
  AUDIO_CACHE_DIR,
};
