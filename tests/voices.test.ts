import { describe, it, expect } from "bun:test"
import { parseVoices, filterVoices, formatVoiceList } from "../src/utils"

const SAMPLE_OUTPUT = `Name                               Gender    ContentCategories      VoicePersonalities
---------------------------------  --------  ---------------------  --------------------------------------
en-IE-EmilyNeural                  Female    General                Friendly, Positive
en-IE-ConnorNeural                 Male      General                Friendly, Positive
en-GB-SoniaNeural                  Female    General                Friendly, Positive
en-GB-RyanNeural                   Male      General                Friendly, Positive
en-US-AriaNeural                   Female    General                Friendly, Positive
de-DE-KatjaNeural                  Female    General                Friendly, Positive`

describe("parseVoices", () => {
  it("skips header and separator lines", () => {
    const voices = parseVoices(SAMPLE_OUTPUT)
    expect(voices.every((v) => !v.name.startsWith("-") && v.name !== "Name")).toBe(true)
  })

  it("parses correct count", () => {
    expect(parseVoices(SAMPLE_OUTPUT)).toHaveLength(6)
  })

  it("assigns sequential 1-based indexes", () => {
    const voices = parseVoices(SAMPLE_OUTPUT)
    expect(voices[0].index).toBe(1)
    expect(voices[5].index).toBe(6)
  })

  it("parses name correctly", () => {
    const voices = parseVoices(SAMPLE_OUTPUT)
    expect(voices[0].name).toBe("en-IE-EmilyNeural")
  })

  it("parses gender correctly", () => {
    const voices = parseVoices(SAMPLE_OUTPUT)
    expect(voices[0].gender).toBe("Female")
    expect(voices[1].gender).toBe("Male")
  })

  it("handles empty string", () => {
    expect(parseVoices("")).toHaveLength(0)
  })
})

describe("filterVoices", () => {
  const voices = parseVoices(SAMPLE_OUTPUT)

  it("filters by locale prefix", () => {
    const result = filterVoices(voices, "en-IE")
    expect(result).toHaveLength(2)
    expect(result.every((v) => v.name.startsWith("en-IE"))).toBe(true)
  })

  it("filters by gender", () => {
    const result = filterVoices(voices, "female")
    expect(result.every((v) => v.gender === "Female")).toBe(true)
  })

  it("is case-insensitive", () => {
    expect(filterVoices(voices, "EN-IE")).toHaveLength(2)
    expect(filterVoices(voices, "FEMALE")).toHaveLength(filterVoices(voices, "female").length)
  })

  it("returns empty array when no match", () => {
    expect(filterVoices(voices, "zh-CN")).toHaveLength(0)
  })

  it("matches partial name", () => {
    const result = filterVoices(voices, "Emily")
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe("en-IE-EmilyNeural")
  })
})

describe("formatVoiceList", () => {
  const voices = parseVoices(SAMPLE_OUTPUT)

  it("returns no-match message for empty list", () => {
    expect(formatVoiceList([])).toBe("No voices matched.")
  })

  it("formats each voice as '{index}. {name} ({gender})'", () => {
    const lines = formatVoiceList(voices).split("\n")
    expect(lines[0]).toBe("1. en-IE-EmilyNeural (Female)")
    expect(lines[1]).toBe("2. en-IE-ConnorNeural (Male)")
  })

  it("one line per voice", () => {
    expect(formatVoiceList(voices).split("\n")).toHaveLength(voices.length)
  })
})

describe("voice_select index resolution", () => {
  const voices = parseVoices(SAMPLE_OUTPUT)

  it("finds voice by index", () => {
    const match = voices.find((v) => v.index === 3)
    expect(match?.name).toBe("en-GB-SoniaNeural")
  })

  it("returns undefined for out-of-range index", () => {
    expect(voices.find((v) => v.index === 999)).toBeUndefined()
  })
})
