# Download YouTube Audio for Terminal Music

Download audio from a YouTube video to play via the tabz_play_audio MCP tool.

## Prerequisites

1. **Check if yt-dlp is installed**
   ```bash
   which yt-dlp || ~/.local/bin/yt-dlp --version
   ```

   If not installed:
   ```bash
   # Install via pip (recommended)
   pip install --user yt-dlp

   # Or via pipx (isolated environment)
   pipx install yt-dlp
   ```

2. **Ensure the music folder exists**
   ```bash
   mkdir -p ~/Music/terminal-music
   ```

3. **Check ffmpeg is available** (required for audio extraction)
   ```bash
   which ffmpeg
   ```

   If not installed:
   ```bash
   # Ubuntu/Debian/WSL
   sudo apt install ffmpeg

   # macOS
   brew install ffmpeg
   ```

## Steps

1. **Get the current tab URL**
   ```bash
   mcp-cli call tabz/tabz_get_page_info '{}'
   ```

2. **Download audio** (choose one format)
   ```bash
   # Opus format - best quality, smaller file (recommended)
   ~/.local/bin/yt-dlp -f "bestaudio[ext=webm]" \
     -o "~/Music/terminal-music/%(title)s.%(ext)s" \
     "VIDEO_URL"

   # MP3 format - more compatible but larger
   ~/.local/bin/yt-dlp -x --audio-format mp3 --audio-quality 192K \
     -o "~/Music/terminal-music/%(title)s.%(ext)s" \
     "VIDEO_URL"

   # M4A format - good quality, Apple-friendly
   ~/.local/bin/yt-dlp -f "bestaudio[ext=m4a]" \
     -o "~/Music/terminal-music/%(title)s.%(ext)s" \
     "VIDEO_URL"
   ```

3. **Rename to a simpler filename** (optional)
   ```bash
   mv ~/Music/terminal-music/Long*.webm ~/Music/terminal-music/short-name.opus
   ```

4. **Play via MCP tool**
   ```bash
   mcp-cli call tabz/tabz_play_audio '{"url": "file:///home/USER/Music/terminal-music/short-name.opus"}'
   ```

   Or use a file:// URL with the full path.

## Notes

- Opus/WebM is preferred - smaller files, good quality
- MP3 works everywhere but files are larger
- Great for lo-fi beats, ambient music, focus playlists
- Audio plays through browser - respects system volume

## Good search terms for terminal music

- "lo-fi beats"
- "coding music"
- "ambient focus music"
- "synthwave mix"
- "nature sounds rain"
- "coffee shop ambience"
- "dark ambient"

## Download a playlist

```bash
# Download all audio from a YouTube playlist
~/.local/bin/yt-dlp -f "bestaudio[ext=webm]" \
  -o "~/Music/terminal-music/%(playlist)s/%(title)s.%(ext)s" \
  "PLAYLIST_URL"
```
