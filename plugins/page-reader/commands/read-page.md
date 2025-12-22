---
description: Capture current page, summarize key points, and read aloud via TTS
---

**Arguments:** `$ARGUMENTS`
- If empty: Summarize entire page with key points
- If contains text: Focus summary on that topic/question
- If "quiet": Skip audio, just display summary

## Step 1: Get Page Content

First, get the current page info and extract readable text content.

Use the tabz MCP tools:

```bash
# Get page title and URL
mcp-cli call tabz/tabz_get_page_info '{}'
```

Then extract the main text content:

```bash
# Extract readable text from page (excludes scripts, styles, navigation)
mcp-cli call tabz/tabz_execute_script '{"script": "(() => { const clone = document.body.cloneNode(true); clone.querySelectorAll(\"script, style, nav, header, footer, aside, [role=navigation], [role=banner], [aria-hidden=true]\").forEach(el => el.remove()); return clone.innerText.substring(0, 15000); })()"}'
```

## Step 2: Summarize the Content

Based on the extracted text, create a concise summary with:

1. **What this page is about** (1 sentence)
2. **Key points** (3-5 bullet points of the most important information)
3. **Notable details** (any specific numbers, dates, names, or facts worth remembering)

If `$ARGUMENTS` contains a specific topic/question, focus the summary on answering that.

Keep the summary concise - aim for what someone could absorb in 30-60 seconds of listening.

## Step 3: Display Summary

Show the summary in a readable format:

```
## Page Summary: [Title]
URL: [url]

### Overview
[1 sentence description]

### Key Points
- [Point 1]
- [Point 2]
- [Point 3]

### Notable Details
- [Specific facts, numbers, dates worth remembering]
```

## Step 4: Audio Playback

**Check `$ARGUMENTS` first:**
- If contains "quiet" -> Skip audio, just display "Summary complete (audio skipped)"
- Otherwise -> Read the summary aloud

Convert the summary to natural spoken text (no markdown, no bullets - conversational):

```bash
cat <<'AUDIO_TEXT_EOF' | jq -Rs '{text: ., voice: "en-US-AriaNeural", rate: "+10%", pitch: "+0Hz", volume: 0.85, priority: "high"}' | curl -s -X POST http://localhost:8129/api/audio/speak -H "Content-Type: application/json" -d @- > /dev/null 2>&1 &
[INSERT SPOKEN VERSION OF SUMMARY HERE]
This page is about [topic]. The key points are: [point 1], [point 2], and [point 3].
Notable details include [specific facts].
AUDIO_TEXT_EOF
```

**Audio text guidelines:**
- Convert bullets to flowing sentences with "First...", "Second...", "Also..."
- Keep it under 60 seconds of speech (roughly 150-180 words)
- Use natural transitions: "The main takeaway is...", "Worth noting that..."
- End with the most actionable or memorable point

After triggering playback: "Reading page summary aloud..."

## Error Handling

If page content extraction fails:
- Check if there's an active browser tab
- The page might be restricted (chrome:// pages, PDFs, etc.)
- Suggest: "Try navigating to a regular web page first"

If the page has very little text content:
- Note this in the summary
- Still provide what information is available
