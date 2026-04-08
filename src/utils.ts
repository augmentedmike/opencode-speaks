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
