/**
 * Strip markdown formatting, fenced code blocks, and indented code from text.
 * Only prose remains — suitable for TTS.
 */
export function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^ {4}.+$/gm, "")
    .replace(/^\t.+$/gm, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\|.*\|/g, "")
    .replace(/^[-*_]{3,}$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

/**
 * Convert the first `maxWords` words of `text` into a kebab-case slug.
 * Non-alphanumeric characters are stripped. Result is at most 60 chars.
 */
export function toKebabSlug(text: string, maxWords = 5): string {
  const words = text
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, maxWords)
  return words.join("-").toLowerCase().slice(0, 60).replace(/-$/, "")
}

/**
 * Generate a clip filename: `{timestamp}-{slug}.mp3`
 */
export function clipFilename(text: string, timestamp = Date.now()): string {
  return `${timestamp}-${toKebabSlug(text)}.mp3`
}

// ── Voice list ───────────────────────────────────────────────────────────────

export interface Voice {
  index: number
  name: string
  gender: string
}

/**
 * Parse the columnar output of `edge-tts --list-voices`.
 * Skips the header/separator lines.
 */
export function parseVoices(raw: string): Voice[] {
  const voices: Voice[] = []
  let index = 1
  for (const line of raw.split("\n")) {
    // skip header and separator rows
    if (!line.trim() || line.startsWith("-") || line.startsWith("Name")) continue
    const cols = line.trim().split(/\s{2,}/)
    if (cols.length < 2) continue
    voices.push({ index: index++, name: cols[0].trim(), gender: cols[1].trim() })
  }
  return voices
}

/**
 * Filter voices by a case-insensitive keyword matched against name or gender.
 */
export function filterVoices(voices: Voice[], keyword: string): Voice[] {
  const kw = keyword.toLowerCase()
  return voices.filter(
    (v) => v.name.toLowerCase().includes(kw) || v.gender.toLowerCase().includes(kw)
  )
}

/**
 * Format a voice list for display.
 */
export function formatVoiceList(voices: Voice[]): string {
  if (voices.length === 0) return "No voices matched."
  return voices.map((v) => `${v.index}. ${v.name} (${v.gender})`).join("\n")
}
