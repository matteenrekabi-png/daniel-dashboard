export interface DaySchedule {
  open: string    // 24h "HH:MM"
  close: string   // 24h "HH:MM"
  closed: boolean
}

export interface BusinessHoursData {
  monday: DaySchedule
  tuesday: DaySchedule
  wednesday: DaySchedule
  thursday: DaySchedule
  friday: DaySchedule
  saturday: DaySchedule
  sunday: DaySchedule
  holidays: string[]
}

export const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
export type DayKey = typeof DAYS[number]

export const DAY_LABELS: Record<DayKey, string> = {
  monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
  thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday',
}

export const DEFAULT_HOURS: BusinessHoursData = {
  monday:    { open: '07:00', close: '18:00', closed: false },
  tuesday:   { open: '07:00', close: '18:00', closed: false },
  wednesday: { open: '07:00', close: '18:00', closed: false },
  thursday:  { open: '07:00', close: '18:00', closed: false },
  friday:    { open: '07:00', close: '18:00', closed: false },
  saturday:  { open: '08:00', close: '16:00', closed: false },
  sunday:    { open: '09:00', close: '17:00', closed: true },
  holidays:  ["New Year's Day", "Memorial Day", "Independence Day", "Labor Day", "Thanksgiving", "Christmas Day"],
}

// "07:00" → "7:00 AM", "18:00" → "6:00 PM"
export function formatTo12h(time24: string): string {
  const [hStr, mStr] = time24.split(':')
  let h = parseInt(hStr, 10)
  const m = parseInt(mStr, 10)
  const period = h >= 12 ? 'PM' : 'AM'
  if (h === 0) h = 12
  else if (h > 12) h -= 12
  return `${h}:${m.toString().padStart(2, '0')} ${period}`
}

// "7:00", "AM" → "07:00"  |  "6:00", "PM" → "18:00"
function to24h(time: string, period: string): string {
  const parts = time.split(':')
  let h = parseInt(parts[0], 10)
  const m = parts[1] ? parseInt(parts[1], 10) : 0
  const pm = period.trim().toUpperCase() === 'PM'
  if (pm && h !== 12) h += 12
  if (!pm && h === 12) h = 0
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

// Deterministic parser — reads KB section content, no AI needed
export function parseHoursFromKBSection(content: string): BusinessHoursData {
  const result: Partial<Record<DayKey, DaySchedule>> = {}
  const lines = content.split('\n')
  let inHolidays = false
  const holidays: string[] = []

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue

    if (/^holidays?(\s|:|\()/i.test(line)) {
      inHolidays = true
      continue
    }

    if (inHolidays) {
      // Handle comma-separated holidays on one line and individual entries
      const items = line.split(',')
      for (const item of items) {
        const entry = item
          .replace(/^[-•*]\s*/, '')
          .replace(/\(.*?\)/g, '')  // strip parentheticals like "(office closed)"
          .replace(/\.$/, '')        // strip trailing period
          .trim()
        // Skip descriptive sentences (reduced hours, emergency info, etc.)
        if (entry && entry.length > 2 && !/\b(reduced|emergency|active|available|line|before|after|hours|dispatch)\b/i.test(entry)) {
          holidays.push(entry)
        }
      }
      continue
    }

    // Match "Monday: ..." or "Monday - ..."
    const dayMatch = line.match(/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)[\s:–\-]+(.+)$/i)
    if (!dayMatch) continue

    const day = dayMatch[1].toLowerCase() as DayKey
    const rest = dayMatch[2].trim()

    if (/^closed\b/i.test(rest)) {
      result[day] = { open: '09:00', close: '17:00', closed: true }
      continue
    }

    // Match "7:00 AM - 6:00 PM" or "7am - 6pm"
    const range = rest.match(/(\d{1,2}(?::\d{2})?)\s*(am|pm)\s*[-–to]+\s*(\d{1,2}(?::\d{2})?)\s*(am|pm)/i)
    if (range) {
      const openTime = range[1].includes(':') ? range[1] : `${range[1]}:00`
      const closeTime = range[3].includes(':') ? range[3] : `${range[3]}:00`
      result[day] = { open: to24h(openTime, range[2]), close: to24h(closeTime, range[4]), closed: false }
    }
  }

  return {
    ...DEFAULT_HOURS,
    ...result,
    holidays: holidays.length > 0 ? holidays : DEFAULT_HOURS.holidays,
  }
}

// Converts structured data back to plain text for the KB file
export function hoursToKBContent(data: BusinessHoursData): string {
  const lines: string[] = []

  for (const day of DAYS) {
    const d = data[day]
    const label = DAY_LABELS[day]
    lines.push(d.closed ? `${label}: Closed` : `${label}: ${formatTo12h(d.open)} - ${formatTo12h(d.close)}`)
  }

  if (data.holidays.length > 0) {
    lines.push('')
    lines.push('Holidays (Closed):')
    data.holidays.forEach(h => lines.push(h))
  }

  return lines.join('\n')
}
