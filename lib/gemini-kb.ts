/**
 * Gemini-powered knowledge base parser and builder.
 * Sections are fully dynamic — Gemini reads the business type and creates
 * whatever section labels make sense. No hardcoding.
 */

export interface KBSection {
  key: string     // snake_case, e.g. "hvac_pricing"
  label: string   // human-readable, e.g. "HVAC Pricing"
  content: string // full text content, copied verbatim from the KB
}

export interface KBSections {
  sections: KBSection[]
  faqs: { id: string; question: string; answer: string }[]
}

export const KB_MARKER = '# PEAK HOME SERVICES — AGENT KNOWLEDGE BASE'
const GEMINI_MODEL = 'gemini-2.5-flash'

// ─── Retry wrapper ───────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Parse KB content with Gemini. Retries up to 3× on 429 rate-limit errors. */
export async function parseKBWithGemini(content: string, attempt = 0): Promise<KBSections> {
  try {
    return await parseKBOnce(content)
  } catch (err) {
    const isRetryable = err instanceof Error && (err.message.includes('429') || err.message.includes('503'))
    if (isRetryable && attempt < 3) {
      await sleep(Math.pow(2, attempt) * 1500 + Math.random() * 500) // 1.5s, 3s, 6s
      return parseKBWithGemini(content, attempt + 1)
    }
    throw err
  }
}

// ─── Core parser ─────────────────────────────────────────────────────────────

async function parseKBOnce(content: string): Promise<KBSections> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')

  const prompt = `You are extracting and organizing a knowledge base from an AI receptionist's system prompt or document.

First identify the business type. Then create sections that match exactly what is in the document — no generic placeholders, only sections for content that actually exists.

Return a JSON object with exactly these keys:

"sections": Array of objects, each with:
  - "key": snake_case identifier (e.g. "business_info", "hvac_pricing", "service_menu", "policies")
  - "label": Human-readable name shown to the business owner (e.g. "Business Info", "HVAC Pricing", "Menu & Pricing", "Policies")
  - "content": The complete text for this section — copy every detail exactly as written. Preserve all prices, fees, times, percentages, names, and conditions. Do not summarize or condense anything.

"faqs": Array of objects with "question" and "answer" strings. Extract every Q&A pair verbatim. Do NOT put FAQs in the sections array.

Guidelines for creating sections:
- Always create a "Business Info" section: company name, contact info, hours, history, certifications, coverage area
- Create one pricing section per service category (e.g. "HVAC Pricing", "Roofing Pricing", "Menu & Pricing", "Service Rates")
- Create a section for scheduling/booking policies if present
- Create a section for payment, financing, deposits if present
- Create a section for warranties/guarantees if present
- Create a section for emergency or after-hours procedures if present
- Create any other section that has meaningful content in the source document
- Do NOT create sections for content that does not exist in the source

Rules:
- Copy prices, fees, times, and conditions word for word — never paraphrase
- Plain text only — no markdown symbols, no asterisks, no hashtags
- Separate subcategories within a section with a blank line for readability
- If a section would be empty, omit it entirely
- Return only valid JSON, no explanation, no code fences

Document to parse:
${content}`

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.0 },
      }),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini API error ${res.status}: ${err.slice(0, 300)}`)
  }

  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Gemini returned invalid JSON')
  }

  const rawSections = Array.isArray(parsed.sections) ? parsed.sections : []
  const sections: KBSection[] = rawSections
    .filter((s): s is Record<string, string> => s && typeof s === 'object')
    .map((s, i) => ({
      key: String(s.key || `section_${i}`),
      label: String(s.label || `Section ${i + 1}`),
      content: String(s.content || ''),
    }))
    .filter((s) => s.content.trim().length > 0)

  const rawFaqs = Array.isArray(parsed.faqs) ? parsed.faqs : []
  const faqs = rawFaqs
    .filter((f): f is Record<string, string> => f && typeof f === 'object')
    .map((f, i) => ({
      id: `faq-${i}`,
      question: String(f.question || ''),
      answer: String(f.answer || ''),
    }))
    .filter((f) => f.question.trim() && f.answer.trim())

  return { sections, faqs }
}

// ─── Build KB markdown from sections ─────────────────────────────────────────

export function buildKbFromSections(kb: KBSections): string {
  const lines: string[] = [
    KB_MARKER,
    'Internal Reference | Do Not Read Aloud | Use to Inform Responses',
    '',
    '---',
    '',
  ]

  for (const section of kb.sections) {
    if (!section.content.trim()) continue
    lines.push(`## ${section.label}`, '', section.content.trim(), '', '---', '')
  }

  if (kb.faqs.length > 0) {
    lines.push('## Frequently Asked Questions', '')
    for (const faq of kb.faqs) {
      if (faq.question.trim() && faq.answer.trim()) {
        lines.push(`Q: ${faq.question.trim()}`, `A: ${faq.answer.trim()}`, '')
      }
    }
    lines.push('---', '')
  }

  lines.push(
    `Knowledge Base last updated: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
    'For internal agent use only — do not read sections aloud. Use to inform natural responses.',
  )

  return lines.join('\n')
}
