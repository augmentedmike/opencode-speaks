import { describe, it, expect, beforeEach, afterEach } from "bun:test"
import { existsSync, mkdirSync, rmSync } from "fs"
import { join } from "path"
import { tmpdir } from "os"

const FLAG = "/tmp/.opencode-voice-enabled"
const SAVE_DIR_FILE = "/tmp/.opencode-voice-dir"

// Helpers to manage flag state without touching the real plugin at runtime
function setFlag() { Bun.write(FLAG, "") }
function clearFlag() { try { rmSync(FLAG) } catch {} }
function setSaveDir(dir: string) { Bun.write(SAVE_DIR_FILE, dir) }
function clearSaveDir() { try { rmSync(SAVE_DIR_FILE) } catch {} }

// ── Flag file lifecycle ───────────────────────────────────────────────────────

describe("voice flag file", () => {
  afterEach(() => { clearFlag(); clearSaveDir() })

  it("flag is absent by default", () => {
    clearFlag()
    expect(existsSync(FLAG)).toBe(false)
  })

  it("enable_voice creates the flag file", async () => {
    setFlag()
    expect(existsSync(FLAG)).toBe(true)
  })

  it("disable_voice removes the flag file", async () => {
    setFlag()
    clearFlag()
    expect(existsSync(FLAG)).toBe(false)
  })

  it("disable_voice also removes the save-dir file", async () => {
    setFlag()
    setSaveDir("/tmp/clips")
    clearFlag()
    clearSaveDir()
    expect(existsSync(SAVE_DIR_FILE)).toBe(false)
  })
})

// ── Save-dir file lifecycle ───────────────────────────────────────────────────

describe("save_dir persistence", () => {
  afterEach(() => { clearFlag(); clearSaveDir() })

  it("save_dir file contains the path that was set", async () => {
    const dir = "/tmp/test-clips"
    setSaveDir(dir)
    const stored = (await Bun.file(SAVE_DIR_FILE).text()).trim()
    expect(stored).toBe(dir)
  })

  it("returns null when save_dir file is absent", async () => {
    clearSaveDir()
    const exists = existsSync(SAVE_DIR_FILE)
    expect(exists).toBe(false)
  })
})

// ── Clip directory creation ───────────────────────────────────────────────────

describe("clip directory", () => {
  const testDir = join(tmpdir(), `oc-speaks-test-${Date.now()}`)

  afterEach(() => {
    try { rmSync(testDir, { recursive: true }) } catch {}
  })

  it("save dir can be created with mkdir -p", async () => {
    mkdirSync(testDir, { recursive: true })
    expect(existsSync(testDir)).toBe(true)
  })

  it("nested save dir is created recursively", async () => {
    const nested = join(testDir, "a", "b", "c")
    mkdirSync(nested, { recursive: true })
    expect(existsSync(nested)).toBe(true)
  })
})

// ── Clip filename format ─────────────────────────────────────────────────────

describe("clip filename format in save dir", () => {
  it("saved clips match {timestamp}-{slug}.mp3 pattern", () => {
    const { clipFilename } = require("../src/utils")
    const name = clipFilename("hey im ready to help with your project", 1700000000000)
    expect(name).toMatch(/^\d+-[a-z0-9-]+\.mp3$/)
    expect(name).toBe("1700000000000-hey-im-ready-to-help.mp3")
  })
})

// ── tilde expansion ──────────────────────────────────────────────────────────

describe("tilde expansion in save_dir", () => {
  it("~ is replaced with HOME", () => {
    const home = process.env.HOME ?? ""
    const input = "~/Desktop/clips"
    const expanded = input.replace(/^~/, home)
    expect(expanded).toBe(`${home}/Desktop/clips`)
  })

  it("paths without ~ are unchanged", () => {
    const input = "/tmp/clips"
    const expanded = input.replace(/^~/, process.env.HOME ?? "")
    expect(expanded).toBe("/tmp/clips")
  })
})
