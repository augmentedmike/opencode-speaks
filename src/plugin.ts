import { tool, type Plugin } from "@opencode-ai/plugin"
import { stripMarkdown, clipFilename, parseVoices, filterVoices, formatVoiceList } from "./utils.js"

const DEFAULT_VOICE = "en-IE-EmilyNeural"
const VOLUME = 2.5
const FLAG = "/tmp/.opencode-voice-enabled"
const SAVE_DIR_FILE = "/tmp/.opencode-voice-dir"
const VOICE_FILE = "/tmp/.opencode-voice-name"
const EDGE_TTS = "/Users/michaeloneal/.local/bin/edge-tts"

// ── State helpers ─────────────────────────────────────────────────────────────

async function isEnabled($: any): Promise<boolean> {
  const r = await $`test -f ${FLAG}`.nothrow()
  return r.exitCode === 0
}

async function readFile(path: string): Promise<string | null> {
  try {
    const f = Bun.file(path)
    if (!(await f.exists())) return null
    return (await f.text()).trim() || null
  } catch {
    return null
  }
}

async function getVoice(): Promise<string> {
  return (await readFile(VOICE_FILE)) ?? DEFAULT_VOICE
}

async function getSaveDir(): Promise<string | null> {
  return readFile(SAVE_DIR_FILE)
}

// ── TTS ───────────────────────────────────────────────────────────────────────

async function speak(text: string, $: any, voiceOverride?: string) {
  const cleaned = stripMarkdown(text)
  if (!cleaned) return

  const voice = voiceOverride ?? (await getVoice())
  const saveDir = await getSaveDir()
  const filename = clipFilename(cleaned)

  let outPath: string
  let keepFile: boolean

  if (saveDir) {
    await $`mkdir -p ${saveDir}`.quiet()
    outPath = `${saveDir}/${filename}`
    keepFile = true
  } else {
    outPath = `/tmp/${filename}`
    keepFile = false
  }

  try {
    await $`${EDGE_TTS} --voice ${voice} --text ${cleaned} --write-media ${outPath}`.quiet()
    await $`afplay -v ${VOLUME} ${outPath}`.quiet()
  } finally {
    if (!keepFile) {
      await $`rm -f ${outPath}`.nothrow()
    }
  }
}

async function listVoices($: any): Promise<ReturnType<typeof parseVoices>> {
  const raw = await $`${EDGE_TTS} --list-voices`.quiet().text()
  return parseVoices(raw)
}

// ── Plugin ────────────────────────────────────────────────────────────────────

export const server: Plugin = async ({ client, $ }) => {
  return {
    tool: {
      enable_voice: tool({
        description:
          "Enable automatic voice output — responses will be spoken aloud using Edge TTS (Emily, Irish). " +
          "Optionally provide a save_dir path to archive every clip as a timestamped MP3.",
        args: {
          save_dir: tool.schema
            .string()
            .optional()
            .describe("Optional directory to save audio clips, e.g. ~/Desktop/gradius-c/tts-clips"),
        },
        async execute({ save_dir }) {
          await $`touch ${FLAG}`.quiet()
          if (save_dir) {
            const expanded = save_dir.replace(/^~/, process.env.HOME ?? "~")
            await Bun.write(SAVE_DIR_FILE, expanded)
          } else {
            await $`rm -f ${SAVE_DIR_FILE}`.nothrow()
          }
          await speak("Voice enabled.", $)
          return save_dir ? `Voice enabled. Clips will be saved to ${save_dir}.` : "Voice enabled."
        },
      }),

      disable_voice: tool({
        description: "Disable automatic voice output",
        args: {},
        async execute() {
          await $`rm -f ${FLAG} ${SAVE_DIR_FILE}`.nothrow()
          return "Voice disabled."
        },
      }),

      voice_list: tool({
        description:
          "List available Edge TTS voices. Use a filter keyword to narrow results (e.g. 'en-', 'Irish', 'Female', 'en-GB'). " +
          "Returns numbered list — use voice_select to pick one.",
        args: {
          filter: tool.schema
            .string()
            .optional()
            .describe("Keyword to filter voices by name or gender (e.g. 'en-', 'Female', 'Irish')"),
        },
        async execute({ filter }) {
          const voices = await listVoices($)
          const matched = filter ? filterVoices(voices, filter) : voices
          const current = await getVoice()
          const list = formatVoiceList(matched)
          const suffix = `\n\nCurrent voice: ${current}`
          if (!filter && matched.length > 50) {
            return (
              `${matched.length} voices available. Showing first 50 — use a filter to narrow results.\n\n` +
              formatVoiceList(matched.slice(0, 50)) +
              suffix
            )
          }
          return list + suffix
        },
      }),

      voice_preview: tool({
        description: "Preview an Edge TTS voice by speaking a sample phrase. Use the voice name or #number from voice_list.",
        args: {
          voice: tool.schema
            .string()
            .describe("Voice name (e.g. en-GB-SoniaNeural) or #number from voice_list"),
          text: tool.schema
            .string()
            .optional()
            .describe("Sample text to speak (defaults to a standard preview phrase)"),
        },
        async execute({ voice, text }) {
          let resolvedVoice = voice

          if (voice.startsWith("#")) {
            const idx = parseInt(voice.slice(1), 10)
            const voices = await listVoices($)
            const match = voices.find((v) => v.index === idx)
            if (!match) return `No voice at index ${idx}. Run voice_list to see available voices.`
            resolvedVoice = match.name
          }

          const sample = text ?? `Hi, I'm ${resolvedVoice.split("-").pop()?.replace("Neural", "") ?? "your assistant"}, speaking with the ${resolvedVoice} voice.`
          await speak(sample, $, resolvedVoice)
          return `Previewed: ${resolvedVoice}`
        },
      }),

      voice_select: tool({
        description: "Set the active TTS voice. Use the voice name or #number from voice_list. Plays a confirmation phrase in the new voice.",
        args: {
          voice: tool.schema
            .string()
            .describe("Voice name (e.g. en-GB-SoniaNeural) or #number from voice_list"),
        },
        async execute({ voice }) {
          let resolvedVoice = voice

          if (voice.startsWith("#")) {
            const idx = parseInt(voice.slice(1), 10)
            const voices = await listVoices($)
            const match = voices.find((v) => v.index === idx)
            if (!match) return `No voice at index ${idx}. Run voice_list to see available voices.`
            resolvedVoice = match.name
          }

          await Bun.write(VOICE_FILE, resolvedVoice)
          await speak("Voice selected.", $, resolvedVoice)
          return `Voice set to ${resolvedVoice}.`
        },
      }),
    },

    event: async ({ event }) => {
      if (event.type !== "session.idle") return
      if (!(await isEnabled($))) return

      const sessionID = (event as any).properties?.sessionID
      if (!sessionID) return

      const res = await client.session.messages({ path: { id: sessionID } })
      const messages = (res.data as any[]) ?? []

      for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i]
        if (msg.info?.role !== "assistant") continue

        const parts: string[] = []
        for (const part of msg.parts ?? []) {
          if (part.type === "text" && part.text?.trim()) {
            parts.push(part.text)
          }
        }

        const text = parts.join("\n\n")
        if (text) await speak(text, $)
        return
      }
    },
  }
}
