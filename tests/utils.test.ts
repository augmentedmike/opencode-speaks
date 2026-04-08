import { describe, it, expect } from "bun:test"
import { stripMarkdown, toKebabSlug, clipFilename } from "../src/utils"

// ── stripMarkdown ────────────────────────────────────────────────────────────

describe("stripMarkdown", () => {
  it("removes fenced code blocks", () => {
    const input = "Here is some code:\n```ts\nconst x = 1\n```\nDone."
    expect(stripMarkdown(input)).toBe("Here is some code:\n\nDone.")
  })

  it("removes inline code but keeps the text", () => {
    expect(stripMarkdown("Use `edge-tts` for speech.")).toBe("Use edge-tts for speech.")
  })

  it("removes markdown headers", () => {
    expect(stripMarkdown("## Installation\nRun the script.")).toBe("Installation\nRun the script.")
  })

  it("removes bold and italic", () => {
    expect(stripMarkdown("This is **bold** and *italic*.")).toBe("This is bold and italic.")
  })

  it("removes markdown links but keeps label", () => {
    expect(stripMarkdown("See [the docs](https://opencode.ai/docs/).")).toBe("See the docs.")
  })

  it("removes table rows", () => {
    const input = "| Col A | Col B |\n| --- | --- |\n| val | val |"
    expect(stripMarkdown(input)).not.toContain("|")
  })

  it("removes horizontal rules", () => {
    expect(stripMarkdown("Above\n---\nBelow")).not.toContain("---")
  })

  it("removes 4-space indented lines", () => {
    const input = "Prose here.\n    indented code\nMore prose."
    expect(stripMarkdown(input)).toBe("Prose here.\n\nMore prose.")
  })

  it("collapses excess blank lines", () => {
    const input = "Line one.\n\n\n\nLine two."
    expect(stripMarkdown(input)).toBe("Line one.\n\nLine two.")
  })

  it("returns empty string for code-only input", () => {
    expect(stripMarkdown("```\nsome code\n```")).toBe("")
  })

  it("preserves plain prose unchanged", () => {
    const prose = "Hey, I'm ready to help. What do you need?"
    expect(stripMarkdown(prose)).toBe(prose)
  })
})

// ── toKebabSlug ──────────────────────────────────────────────────────────────

describe("toKebabSlug", () => {
  it("takes first 5 words by default", () => {
    expect(toKebabSlug("one two three four five six seven")).toBe("one-two-three-four-five")
  })

  it("respects custom maxWords", () => {
    expect(toKebabSlug("one two three four five", 3)).toBe("one-two-three")
  })

  it("strips non-alphanumeric characters", () => {
    expect(toKebabSlug("Hey! I'm ready to help.")).toBe("hey-im-ready-to-help")
  })

  it("lowercases everything", () => {
    expect(toKebabSlug("VOICE ENABLED")).toBe("voice-enabled")
  })

  it("handles fewer words than maxWords", () => {
    expect(toKebabSlug("hi")).toBe("hi")
  })

  it("trims trailing dashes", () => {
    const result = toKebabSlug("a")
    expect(result).not.toMatch(/-$/)
  })

  it("caps result at 60 characters", () => {
    const long = Array(20).fill("word").join(" ")
    expect(toKebabSlug(long, 20).length).toBeLessThanOrEqual(60)
  })
})

// ── clipFilename ─────────────────────────────────────────────────────────────

describe("clipFilename", () => {
  it("produces {timestamp}-{slug}.mp3 format", () => {
    const filename = clipFilename("Voice enabled today", 1000000)
    expect(filename).toBe("1000000-voice-enabled-today.mp3")
  })

  it("uses first 5 words for slug", () => {
    const filename = clipFilename("one two three four five six seven", 1)
    expect(filename).toBe("1-one-two-three-four-five.mp3")
  })

  it("uses Date.now() when no timestamp provided", () => {
    const before = Date.now()
    const filename = clipFilename("test")
    const after = Date.now()
    const ts = parseInt(filename.split("-")[0])
    expect(ts).toBeGreaterThanOrEqual(before)
    expect(ts).toBeLessThanOrEqual(after)
  })

  it("always ends with .mp3", () => {
    expect(clipFilename("any text")).toMatch(/\.mp3$/)
  })
})
