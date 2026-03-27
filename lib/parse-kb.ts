/**
 * Deterministic knowledge base parser.
 * Reads the structured KB section from the VAPI system prompt.
 * No AI call needed — the KB is formatted with known markers.
 */

export interface FAQ {
  id: string
  question: string
  answer: string
  sort_order: number
}

export interface BusinessInfo {
  hours: Record<string, string> | null
  address: string | null
  services_offered: string[] | null
  service_areas: string[] | null
  pricing_notes: string | null
}

export interface ParsedKB {
  businessInfo: BusinessInfo
  faqs: FAQ[]
}

const KB_MARKER = '# PEAK HOME SERVICES — AGENT KNOWLEDGE BASE'

function extractSection(text: string, heading: RegExp): string {
  const match = text.match(heading)
  if (!match) return ''
  const start = match.index! + match[0].length
  const rest = text.slice(start)
  // Next section starts with ## or end of string
  const nextSection = rest.search(/\n##\s/)
  return nextSection >= 0 ? rest.slice(0, nextSection).trim() : rest.trim()
}

export function parseKnowledgeBase(systemPrompt: string): ParsedKB {
  // Find the KB section
  const markerIdx = systemPrompt.indexOf(KB_MARKER)
  const kb = markerIdx >= 0 ? systemPrompt.slice(markerIdx) : systemPrompt

  // ── Hours ──
  const hoursSection = extractSection(kb, /##\s+\d*\.?\s*BUSINESS HOURS/i)
  const hours: Record<string, string> = {}
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  for (const day of days) {
    const match = hoursSection.match(new RegExp(`${day}:?\\s*(.+)`, 'i'))
    if (match) hours[day] = match[1].trim()
  }

  // ── Address / contact ──
  let address: string | null = null
  const overviewSection = extractSection(kb, /##\s+\d*\.?\s*COMPANY OVERVIEW/i)
  if (overviewSection) {
    const phoneMatch = overviewSection.match(/Phone:\s*(.+)/i)
    const websiteMatch = overviewSection.match(/Website:\s*(.+)/i)
    const parts = [phoneMatch?.[1]?.trim(), websiteMatch?.[1]?.trim()].filter(Boolean)
    if (parts.length) address = parts.join(' · ')
  }
  // Fallback: look for Address / Contact line anywhere in KB
  if (!address) {
    const addrMatch = kb.match(/Address\s*\/?\s*Contact:\s*(.+)/i)
    if (addrMatch) address = addrMatch[1].trim()
  }

  // ── Services offered ──
  let services_offered: string[] | null = null
  const serviceMatch = kb.match(/Service\s+Areas?:\s*HVAC[^)\n]*/i) ||
    kb.match(/Services?\s+Offered?:\s*(.+)/i) ||
    kb.match(/Service\s+Areas?:\s*([^\n]+)/i)
  if (serviceMatch) {
    const raw = serviceMatch[1] || serviceMatch[0]
    // Extract HVAC, Roofing, Plumbing style list
    const items = raw.match(/\b(HVAC|Roofing|Plumbing|Heating|Cooling|Electrical|Landscaping)\b/gi)
    if (items?.length) services_offered = [...new Set(items)]
  }
  if (!services_offered) {
    // Try from overview "Type: Residential..." + "Service Areas: HVAC · Roofing · Plumbing"
    const typeMatch = kb.match(/Service Areas:\s*(.+?)(?:\n|$)/i)
    if (typeMatch) {
      services_offered = typeMatch[1].split(/[·,]+/).map((s) => s.trim()).filter(Boolean)
    }
  }

  // ── Service areas / coverage ──
  let service_areas: string[] | null = null
  const coverageMatch = kb.match(/Coverage:\s*(.+)/i)
  if (coverageMatch) service_areas = [coverageMatch[1].trim()]
  else {
    const areaMatch = kb.match(/Service Area[^:]*:\s*\n?((?:(?!\n##)[^\n]+\n?)+)/i)
    if (areaMatch) {
      const raw = areaMatch[1].trim()
      service_areas = raw.split(/[,\n]/).map((s) => s.replace(/^[-•]\s*/, '').trim()).filter(Boolean).slice(0, 5)
    }
  }

  // ── Pricing notes ──
  let pricing_notes: string | null = null
  const pricingSection = extractSection(kb, /##\s+\d*\.?\s*(PRICING|PAYMENT|FEES)/i)
  if (pricingSection) {
    // Build a concise summary from key lines
    const lines: string[] = []
    const diagMatch = kb.match(/Diagnostic fee[^\n]+/i)
    if (diagMatch) lines.push(diagMatch[0].trim())
    const emergMatch = kb.match(/Emergency call[^\n]+/i)
    if (emergMatch) lines.push(emergMatch[0].trim())
    const financeMatch = kb.match(/0%\s*financing[^\n]+/i)
    if (financeMatch) lines.push(financeMatch[0].trim())
    const afterMatch = kb.match(/After.hours labor[^\n]+/i)
    if (afterMatch) lines.push(afterMatch[0].trim())
    pricing_notes = lines.length ? lines.join('. ') : pricingSection.slice(0, 300)
  }

  // ── FAQs ──
  const faqs: FAQ[] = []
  const faqSection = extractSection(kb, /##\s+\d*\.?\s*FREQUENTLY ASKED QUESTIONS/i)
  if (faqSection) {
    // Match Q: ... A: ... pairs
    const pairs = faqSection.matchAll(/Q:\s*(.+?)\nA:\s*([\s\S]+?)(?=\nQ:|\n##|$)/g)
    let i = 0
    for (const match of pairs) {
      const question = match[1].trim()
      const answer = match[2].trim()
      if (question && answer) {
        faqs.push({ id: `parsed-${i}`, question, answer, sort_order: i })
        i++
      }
    }
  }

  return {
    businessInfo: {
      hours: Object.keys(hours).length > 0 ? hours : null,
      address,
      services_offered,
      service_areas,
      pricing_notes,
    },
    faqs,
  }
}
