/**
 * Parses an AI voice agent system prompt into editable behavioral sections.
 * Used by the personality editor so business owners can tweak their agent's
 * instructions in a structured, KB-style interface.
 */

export interface PromptSection {
  key: string        // snake_case identifier
  label: string      // human-friendly label shown to the business owner
  header: string     // exact original header line in the prompt (used for reconstruction)
  content: string    // full verbatim content of the section
  sensitive: boolean // true = warn before editing (affects booking flow, hard rules, etc.)
}

export interface ParsedPromptSections {
  sections: PromptSection[]
}

const GEMINI_MODEL = 'gemini-2.5-flash'

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

export async function parsePromptSections(prompt: string, attempt = 0): Promise<ParsedPromptSections> {
  try {
    return await _parseOnce(prompt)
  } catch (err) {
    const is429 = err instanceof Error && err.message.includes('429')
    if (is429 && attempt < 3) {
      await sleep(Math.pow(2, attempt) * 1500 + Math.random() * 500)
      return parsePromptSections(prompt, attempt + 1)
    }
    throw err
  }
}

async function _parseOnce(prompt: string): Promise<ParsedPromptSections> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')

  const query = `You are analyzing an AI voice agent's system prompt. Extract the behavioral instruction sections into organized, labeled blocks for a non-technical business owner to read and edit.

Identify each section by its ALL-CAPS header line. For each section that would be meaningful for a business owner to customize, return:

{
  "sections": [
    {
      "key": "snake_case_id",
      "label": "Friendly plain-English name",
      "header": "EXACT ORIGINAL HEADER LINE AS IT APPEARS",
      "content": "Full verbatim content of that section — copy every word exactly",
      "sensitive": true or false
    }
  ]
}

Rules:
- SKIP entirely: REAL-TIME AWARENESS, TOOLS, TOOL RULES, any time/date math section, webhook URLs, API parameters, tool definitions
- sensitive=true for: HARD RULES, booking/appointment flow, name collection procedures, number/address collection, rescheduling, cancellation
- sensitive=false for: agent identity, communication style, rapport building, diagnostic questions, estimates, emergency tone, upsell, after-hours
- Copy content VERBATIM — never paraphrase or summarize, preserve every detail
- Label examples: "WHO YOU ARE" → "Agent Identity", "HOW YOU TALK" → "Communication Style", "READING THE ROOM" → "Reading the Caller", "BUILD RAPPORT" → "Building Rapport", "DIAGNOSTIC QUESTIONS" → "Diagnostic Questions", "GIVING ESTIMATES" → "Pricing Estimates", "EMERGENCIES" → "Emergency Calls", "AFTER-HOURS" → "After-Hours Calls", "SOFT UPSELL" → "Soft Upsell"
- Only include sections a business owner would actually benefit from editing
- Return only valid JSON, no explanation, no code fences

System prompt to analyze:
${prompt}`

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: query }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.0 },
      }),
    }
  )

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Gemini API error ${res.status}: ${errText.slice(0, 300)}`)
  }

  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Gemini returned invalid JSON')
  }

  const raw = Array.isArray(parsed.sections) ? parsed.sections : []
  const sections: PromptSection[] = raw
    .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object')
    .map((s, i) => ({
      key: String(s.key || `section_${i}`),
      label: String(s.label || `Section ${i + 1}`),
      header: String(s.header || ''),
      content: String(s.content || ''),
      sensitive: Boolean(s.sensitive),
    }))
    .filter(s => s.content.trim() && s.header.trim())

  return { sections }
}

/**
 * Apply edited sections back into the original prompt.
 * Line-by-line scan: finds each header by exact match and replaces everything
 * between it and the next all-caps header with the edited content.
 */
export function applyPromptEdits(original: string, edits: PromptSection[]): string {
  const editMap = new Map(edits.map(e => [e.header.trim(), e.content.trim()]))
  const lines = original.split('\n')
  const result: string[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    if (editMap.has(trimmed)) {
      result.push(line) // keep the header
      i++

      // Skip the original content for this section
      while (i < lines.length && !_isPromptHeader(lines[i])) {
        i++
      }

      // Insert the edited content
      result.push(editMap.get(trimmed)!)
      result.push('') // blank line after each section
    } else {
      result.push(line)
      i++
    }
  }

  return result.join('\n')
}

function _isPromptHeader(line: string): boolean {
  const t = line.trim()
  if (t.length < 4 || t.length > 80) return false
  if (/[a-z]/.test(t)) return false           // no lowercase
  if (!/[A-Z]{2}/.test(t)) return false        // at least 2 consecutive uppercase
  return true
}
