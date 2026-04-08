import { tool, type Plugin } from "@opencode-ai/plugin"
import { stripMarkdown, clipFilename } from "./utils.js"

const VOICE = "en-IE-EmilyNeural"
const VOLUME = 2.5
const FLAG = "/tmp/.opencode-voice-enabled"
const SAVE_DIR_FILE = "/tmp/.opencode-voice-dir"
const EDGE_TTS = "/Users/michaeloneal/.local/bin/edge-tts"

async function isEnabled($: any): Promise<boolean> {
  const r = await $`test -f ${FLAG}`.nothrow()
  return r.exitCode === 0
}

async function getSaveDir(): Promise<string | null> {
  try {
    const f = Bun.file(SAVE_DIR_FILE)
    if (!(await f.exists())) return null
    return (await f.text()).trim() || null
  } catch {
    return null
  }
}

async function speak(text: string, $: any) {
  const cleaned = stripMarkdown(text)
  if (!cleaned) return

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
    await $`${EDGE_TTS} --voice ${VOICE} --text ${cleaned} --write-media ${outPath}`.quiet()
    await $`afplay -v ${VOLUME} ${outPath}`.quiet()
  } finally {
    if (!keepFile) {
      await $`rm -f ${outPath}`.nothrow()
    }
  }
}

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
