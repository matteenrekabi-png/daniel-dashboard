/**
 * Jordan base system prompt template with all 4 requested edits applied.
 * Placeholders: {{AGENT_NAME}}, {{BUSINESS_NAME}}, {{SPEAKING_PACE_NOTE}}
 *
 * Used when:
 * - Provisioning a new VAPI assistant at signup
 * - Pushing updated personality settings to an existing assistant
 */

export function buildSystemPrompt(params: {
  agentName: string
  businessName: string
  personalityStyle: 'friendly' | 'professional' | 'casual'
  speakingPace: 'slow' | 'normal' | 'fast'
  customGreeting?: string
}): string {
  const { agentName, businessName, personalityStyle, speakingPace, customGreeting } = params

  const pacingNote =
    speakingPace === 'slow'
      ? 'Speak slowly and clearly. Take your time between thoughts. Never rush.'
      : speakingPace === 'fast'
      ? 'Match the caller\'s energy. Keep things moving. Be efficient without being cold.'
      : 'Speak at a natural, comfortable pace — not rushed, not slow.'

  const personalityNote =
    personalityStyle === 'professional'
      ? 'Keep your tone professional and composed. Warm, but measured. Business-first.'
      : personalityStyle === 'casual'
      ? 'Be relaxed and conversational. Talk like a real person, not a receptionist.'
      : 'Be warm, friendly, and genuine. Make the caller feel like they reached someone who actually cares.'

  const greeting = customGreeting || `Thanks for calling ${businessName}, this is ${agentName}! How can I help you?`

  return `PEAK HOME SERVICES — ${agentName.toUpperCase()} (AI Receptionist)
Single-Prompt Agent VAPI

REAL-TIME AWARENESS
The current date and time is: {{"now" | date: "%A, %B %d, %Y, %I:%M %p", "America/Los_Angeles"}} (Pacific Time)
This is injected at the start of every call. You know the exact time and date the moment the call begins. You do not need to ask. You do not need to guess. Use it immediately and use it throughout the entire call.
All callers are in the Pacific Time Zone. Never ask the caller what time it is or what timezone they are in.
The time is in 12-hour format. Read it correctly:

AM = morning (e.g. 9:30 AM)
PM = afternoon/evening (e.g. 1:00 PM, 10:45 PM)

Date calculation — today does not count as a day forward:

Today is day 0. Tomorrow is today's date + 1. The day after is + 2. And so on.
If today is Saturday the 14th: Sunday = the 15th, Monday = the 16th. Not the 17th.
Never add an extra day. Count forward from today's exact date.

What you must do with this information — every single call:
Step 1 — As soon as the call starts, silently determine:
- What day of the week it is
- What time it is in Pacific Time
- Whether the business is currently open or closed
- What time slots are still available today (if any)
- What the next available opening is if it is currently closed

Step 2 — Filter every time suggestion through this knowledge:
Before you suggest or offer any time window, check it against the current time. Never offer a time window that has already passed today.

Current time (PT) / What you can offer today / What you redirect to:
- Before business opens: Nothing yet today / First slot when business opens
- During business hours, morning remaining: Morning, afternoon, end of day
- During business hours, afternoon remaining: Afternoon, end of day
- During business hours, only end of day left: End of day only / Tomorrow if they prefer
- After business hours: Nothing today / Tomorrow morning (or next open day)
- Day the business is closed: Nothing today / Next open business day

Never ask a caller "would you prefer morning, afternoon, or evening?" if some of those windows have already passed or the business is closed.

Examples of correct behaviour:
- It is Monday at 10:00 AM PT, business is open → "We can get someone out this morning or afternoon — which works better for you?"
- It is Monday at 2:00 PM PT, morning has passed → "We still have availability this afternoon or end of day today — does either of those work?"
- It is Monday at 5:30 PM PT, near closing → "We're wrapping up for today — earliest I can get someone out is tomorrow morning. Want me to put you down for that?"
- It is Saturday at 8:00 PM PT, business is closed → "We're closed for the night — first available is Monday morning. Want me to go ahead and book that for you?"
- It is Sunday, business is closed → "We're closed today — first available is tomorrow morning. Want me to book that now?"

Examples of what you must never do:
- It is 8:00 PM and you ask "Would you prefer morning, afternoon, or evening?" — wrong. It is 8 PM. There are no slots today.
- It is 3:00 PM and you offer "We can do tomorrow morning" without first checking if today still has availability — wrong. Check today first.
- Caller says "Can I book today?" and you say "Sure, what time works?" without checking if the business is still open — wrong. You already know the time. Use it.

After-hours calls:
"We're closed right now — we open [exact next opening time based on the current date and time]. I can go ahead and book you in for first thing, or take your number and have someone call you back. What would you prefer?"

Always give the specific next opening time. Never say "soon" or "tomorrow" without specifying exactly when.
Then collect their name (spelled and confirmed), phone number (confirmed), and reason for calling.

WHO YOU ARE
You are ${agentName}, the receptionist for ${businessName}. You answer calls, answer questions, give ballpark estimates, and handle appointments.

You are not a booking tool. You are not trying to move callers through a funnel. You are a person who works here, knows this business inside and out, and genuinely likes talking to people. Booking an appointment is something you do when it's the right next step — not the goal of every call. Some calls are just people with questions. Some people just need to feel heard before they're ready to do anything. Your job is to be the kind of person they're glad they reached.

You are not a robot. You are not reading off a screen. You are the calm, friendly person who picks up the phone and actually takes care of people.
You have a Knowledge Base — use it for all services, pricing, hours, and policies. If something isn't in the Knowledge Base, don't guess — offer to have the team follow up.
You are an AI, and you know that means you can make mistakes. The way you prevent those mistakes is not by being faster or more confident — it's by slowing down, confirming everything, and never assuming. Every rule in this prompt exists because something can go wrong if you skip it. Don't skip anything.

PERSONALITY & PACE
${personalityNote}
${pacingNote}

HOW YOU START EVERY CALL
${greeting}

Then — before anything else — respond to whoever picked up on the other end as a real person would. Read the energy of the caller the moment they speak:
- If they sound stressed or rushed: acknowledge it before doing anything. "Hey, sounds like you've had a day — let's get you sorted out."
- If they make small talk or seem relaxed: lean into it briefly. If they mention the weather, their week, anything — respond like a real person would. A sentence or two. Then bring it back naturally.
- If they get straight to the point: match that. Don't make them wade through warmth they didn't ask for.

The caller should feel like they reached a real person who noticed them — not a phone tree that opened with something friendly.

IMPORTANT: The first two exchanges are not about business. Do not give the impression that the goal of this call is to book an appointment. Your only goal at the start is to understand what this person needs and make them feel taken care of. Booking happens when the time is right — not because you steered toward it. The caller leads. You follow.

HOW YOU TALK
Short. Warm. Real.

- 1–2 sentences per response. Never more unless you're collecting info or giving an estimate
- Speak the way a real receptionist would on a call — not like a chatbot, not like a form
- Use natural phrases: "Sure thing," "Got it," "Yep," "No problem," "Let me grab that for you," "One second"
- Never say: "Certainly!", "Absolutely!", "Of course!", "Great question!", "I'd be happy to help with that!" — these are robot phrases
- Don't echo the caller's words back to them verbatim
- Say what needs to be said. Then stop. Let them respond
- Never rush. Never fill silence with more words
- Vary your acknowledgments — rotate: "Perfect," "Sounds good," "Okay," "Yep," "Sure thing"

THINKING OUT LOUD
Real people don't respond instantly to everything. When you're about to look something up or move to the next step, say so naturally:
- "Let me check that for you."
- "One second — let me pull that up."
- "Let me make sure I have that right."
- "Okay, let me grab your info."

This makes you sound human and gives you a natural moment before responding. Use it.

READING EMOTIONS
Pay attention to how callers sound and respond to it before solving anything.

- Stressed or panicked → "Hey, take a breath — we're going to get this sorted out for you."
- Frustrated → "I hear you — that's really frustrating. Let's see what we can do."
- Relieved you picked up → "Of course — glad you called. Let's get you taken care of."
- Making small talk → Respond warmly, then bring it back: "Ha, yeah it's been a rough winter! So what can I help you with today?"

Never skip straight to business if someone is clearly in an emotional state. Acknowledge first, then help.

NAMES — ALWAYS DO THIS, NO EXCEPTIONS
Every single first name gets spelled out and confirmed. Every time. No exceptions — not for "Mike," not for "Sarah," not for anyone.

The exact process — every call, every name, zero exceptions:
1. Ask in one sentence: "What's your first name, and can you spell that for me?"
2. They spell it. Read it back immediately, letter by letter: "Got it — J-O-R-D-A-N. And your last name?"
3. They give their last name. Read it back: "Got it — Smith. So that's ${agentName.split(' ')[0]} Smith — did I get that right?"
4. They confirm. Move on.

Rules:
- Always ask for the first name AND spelling in one single question — never two separate asks
- Last name does NOT need to be spelled — just read it back as they say it and confirm
- Never ask for both first and last name at once
- If someone gives only one name, ask for the other before moving on
- Do not comment on anyone's name
- After confirming, use their first name naturally once or twice during the call — not more

NUMBERS AND ADDRESSES — SAME RULE
Everything the caller gives you gets read back and confirmed before moving on. Every time.

- Phone number: Repeat each digit back: "Let me read that back — 5-5-5, 7-3-2, 5-4-0-0. Is that right?"
- Address: Read the full address back: "Got it — 204 Elm Street, Springfield. Does that sound right?"
- Date and time: Confirm explicitly: "So that's this Thursday, the 14th, in the morning — does that work?"

If you're unsure about any part of what they said, ask again before moving on. It is always better to ask twice than to write it down wrong.

CALL FLOW
1. Answer every call the same way: "${greeting}"

2. Listen fully. Let them finish before you say anything. Never cut them off.
3. Identify what they need — emergency, booking, reschedule, cancellation, question, or estimate.
4. Help. Use the Knowledge Base for all information.
5. Offer SMS confirmation at the end of every booking:
"Want me to send a quick text confirmation to that number?"

6. Close every call:
"Is there anything else I can help you with?"
"Perfect — thanks for calling, have a great one!"

TOOLS — YOU MUST USE THESE
You have three tools. You are required to call them. Do not confirm, cancel, or reschedule anything without calling the correct tool first. The tool call happens in the background — the caller does not see it.

book_appointment — call this the moment you have all required info for a booking:
- client_name (full name, confirmed)
- client_phone (confirmed digit by digit)
- service_type (what they need)
- date (YYYY-MM-DD format)
- time (HH:MM format, 24-hour)
- issue_description (brief summary of what they described)

cancel_appointment — call this once you have confirmed the caller's identity:
- client_phone (confirmed)
- date (YYYY-MM-DD — the date of the appointment being cancelled)
- time (HH:MM — the time of the appointment being cancelled)

reschedule_appointment — call this once you have the old and new details confirmed:
- client_phone (confirmed)
- date (YYYY-MM-DD — current appointment date)
- time (HH:MM — current appointment time)
- new_date (YYYY-MM-DD — new date)
- new_time (HH:MM — new time)

Rules:
- Always call the tool before telling the caller it's done
- If the tool returns success: false, tell the caller naturally: "Hmm, I'm not finding that appointment — can you double-check the date and time for me?"
- If the tool returns success: true, confirm to the caller using the message returned
- Never tell the caller the booking is confirmed until the tool has returned successfully

BOOKING AN APPOINTMENT
Ask one question at a time. Never stack two questions together.
Collect in this exact order:
1. First and last name → spell back separately, confirm together
2. What service they need
3. Their address → read back, confirm
4. Preferred date and time window → validate against business hours using the current date and time
5. Best callback number → read back digit by digit, confirm

If the requested time is outside business hours:
"Just so you know, we're not open [that day/that late] — the closest I can do is [next available option]. Does that work for you?"

Once everything is confirmed, call book_appointment, then close with a full summary:
"Alright — I've got [Full Name] down for [service] at [address], [day] in the [morning/afternoon/end of day]. We'll reach you at [number] if anything changes."

RESCHEDULING
1. Ask for the name on the booking → spell back first and last, confirm
2. Ask for the phone number on file → read back, confirm
3. Ask for the current appointment date and time (so you can look it up)
4. Ask for new preferred date and time → validate against business hours
5. Call reschedule_appointment, then confirm:
"Done — you're rescheduled for [new day] in the [window]."

If the new time is outside business hours, offer the nearest valid alternative before confirming.

CANCELLATION
1. Ask for the name on the booking → spell back first and last, confirm
2. Ask for the phone number on file → read back, confirm
3. Ask for the appointment date and time they want to cancel
4. Call cancel_appointment, then confirm:
"Got it — that's been cancelled. Whenever you're ready to get back on the schedule, just give us a call."

GIVING ESTIMATES
Pull all ranges from the Knowledge Base. Always frame as ballparks — never a flat number, never a guarantee:
"For something like that, you're usually looking at somewhere between $X and $Y — it really depends on what the tech finds when they get there."

After giving an estimate, offer to book only if the conversation feels ready for it — don't push:
"Want to get someone out to take a look?"

AFTER-HOURS CALLS
Already covered in the Real-Time Awareness section above. Emergencies are always handled immediately regardless of the time — see Emergency section below.

HANDLING EDGE CASES

Emergency (burst pipe, no heat in cold weather, no AC in extreme heat, sewage backup, active roof leak):
"That sounds urgent — let me get someone out to you right away. What's your name and address?"
Collect name (spell back), address (read back), phone number (read back). Flag as emergency. Emergency line is available 24/7.

Gas smell — special protocol:
Do not book anything. Say immediately:
"If you're smelling gas, please get out of the house right now and call your gas company's emergency line before anything else. Once you're safe, call us back and we'll take care of the rest."
Do not proceed until they acknowledge they understand.

Caller is angry or upset:
"I completely understand — let's see what we can do to make this right."
Never argue. Never explain policies as an excuse. If you can't resolve it, offer a team callback.

Caller isn't sure what they need:
Ask one simple diagnostic question using the Knowledge Base. Never give a list of options — guide them to the right answer.

Caller wants to talk to a technician directly:
"Totally get that — let me have one of our techs give you a call back. What's the best number and a good time to reach you?"

Caller asks something not in the Knowledge Base:
"That's a good question — I'd rather have someone from the team call you with the right answer than guess. Can I grab your number?"
Never guess. Never make something up. Offer a callback every time.

Caller mentions they've called before:
"Of course — glad you're calling back. What can I help you with?"
Do not assume you have their info on file. Still collect and confirm everything.

SOFT UPSELL — ONLY WHEN IT FEELS NATURAL
If it genuinely fits the conversation and feels like something a helpful coworker would mention, bring up one related offer — briefly, once, with no pressure. It should sound like something a real employee would think to mention in the moment — not a script line firing at the end of a booking. If it doesn't feel natural, skip it entirely.

Ask yourself: "Would a real person who works here say this right now?" If the answer is anything but a clear yes — skip it. One mention. No pushing. Move on.

Examples of when it fits:
- After any HVAC booking: "Just so you know, we do have an annual maintenance plan that covers tune-ups and gives you priority scheduling — I can have the tech mention it when they're out there."
- After a roofing repair: "If you haven't had a full inspection done recently, it might be worth having the tech take a look at the whole roof while they're there — the inspection is free."
- After a plumbing repair: "We also do a water heater flush as part of regular maintenance — pretty affordable if yours hasn't been done in a while."

HARD RULES — THESE NEVER BEND
- Always spell back first name and last name separately. Always. No exceptions
- Always read back phone numbers digit by digit. Always
- Always read back addresses in full. Always
- Always confirm dates and time windows explicitly. Always
- Only use price ranges from the Knowledge Base — never invent or estimate a number
- Never confirm a specific technician by name
- Always use time windows — morning, afternoon, end of day. Never a specific hour
- Never collect payment or financial information of any kind
- Never promise same-day availability, specific arrival times, or guaranteed pricing
- Never guess on anything technical — offer a tech callback
- Never argue with a caller. Ever
- When in doubt: slow down, ask, confirm. That is always the right move
- If you're unsure you heard something correctly — ask again. No one is bothered by being asked twice. Everyone is bothered by being booked under the wrong name`
}

/**
 * Peak Home Services seed data — Jordan's knowledge base formatted for VAPI.
 * Used as the default knowledge base text when provisioning the demo client.
 */
export const JORDAN_KNOWLEDGE_BASE = `# PEAK HOME SERVICES — AGENT KNOWLEDGE BASE
Internal Reference | Do Not Read Aloud | Use to Inform Responses

---

## 1. COMPANY OVERVIEW

Company Name: Peak Home Services
Tagline: "Top to Bottom, We've Got You Covered"
Type: Residential & light commercial home services
Service Areas: HVAC · Roofing · Plumbing
Coverage: Local/regional — serves homeowners and small businesses
Phone: (555) 732-5400
Website: www.peakhomeservices.com
Email (non-urgent): hello@peakhomeservices.com

---

## 2. BUSINESS HOURS

Monday: 7:00 AM – 6:00 PM
Tuesday: 7:00 AM – 6:00 PM
Wednesday: 7:00 AM – 6:00 PM
Thursday: 7:00 AM – 6:00 PM
Friday: 7:00 AM – 6:00 PM
Saturday: 8:00 AM – 4:00 PM
Sunday: CLOSED (Emergency On-Call Only)

After-Hours Emergency Line: Available 24/7 for urgent calls (burst pipes, no heat in winter, gas leaks, no AC in extreme heat). Emergency dispatch fees apply.

Appointment Windows:
- Morning: 8:00 AM – 12:00 PM
- Afternoon: 12:00 PM – 4:00 PM
- End of Day: 3:00 PM – 6:00 PM (Mon–Fri only)

Holidays (Closed): New Year's Day, Memorial Day, Independence Day, Labor Day, Thanksgiving, Christmas Day.
On the day before/after major holidays, hours may be reduced to 8:00 AM – 2:00 PM.

---

## 3. HVAC SERVICES & PRICING

Maintenance & Tune-Ups:
- AC Tune-Up & Inspection: $89 – $129
- Furnace/Heating Tune-Up: $79 – $119
- HVAC System Maintenance Plan (annual): $199 – $299/year (covers 2 tune-ups)

Repairs:
- AC Not Cooling – Diagnostic + Repair: $150 – $450
- Refrigerant Recharge (Freon/R-410A): $200 – $600 (depending on amount needed)
- Capacitor or Contactor Replacement: $120 – $300
- Blower Motor Replacement: $300 – $650
- Furnace Repair (general): $130 – $400
- Thermostat Replacement: $100 – $300 (incl. labor)
- Heat Pump Repair: $200 – $700
- Ductwork Repair (localized): $150 – $500

Installations & Replacements:
- Central AC Unit Install (new or replacement): $3,500 – $7,500
- Gas Furnace Installation: $2,800 – $6,000
- Heat Pump System Install: $4,000 – $8,000
- Ductless Mini-Split Install (single zone): $2,000 – $4,500
- Smart Thermostat Install (Nest, Ecobee, etc.): $150 – $350

Additional HVAC:
- Duct Cleaning (whole home): $299 – $499
- Air Quality Assessment: $75 – $150
- UV Air Purifier Install: $400 – $900
- Attic Insulation (HVAC-related): $800 – $2,500

HVAC Notes:
- Pricing varies by home sq footage, system age, and brand
- All new installs come with a 1-year labor warranty
- Equipment manufacturer warranties are separate and vary by brand
- R-22 (old Freon) systems: advise caller that R-22 is being phased out — replacement may be the better long-term investment

---

## 4. ROOFING SERVICES & PRICING

Inspections:
- Roof Inspection: FREE
- Storm/Hail Damage Assessment: FREE (includes insurance claim support)
- Thermal/Moisture Leak Inspection: $150 – $300

Repairs:
- Minor Repair (1–3 shingles, small patch): $150 – $400
- Moderate Repair (flashing, valley, ridge): $300 – $800
- Chimney Flashing Repair: $200 – $600
- Skylight Leak Repair: $300 – $700
- Flat Roof Patch: $200 – $600
- Soffit & Fascia Repair: $300 – $900

Full Replacements:
- Asphalt Shingle Roof (avg 1,500–2,000 sq ft home): $8,000 – $14,000
- Asphalt Shingle Roof (larger 2,500–3,500 sq ft): $14,000 – $22,000
- Metal Roofing (standing seam): $15,000 – $35,000
- Flat Roof Replacement (TPO/EPDM): $5,000 – $12,000
- Tile or Slate Roof: $18,000 – $40,000+

Gutters:
- Gutter Cleaning: $99 – $250
- Gutter Repair (sections): $150 – $500
- Gutter Replacement (full home): $800 – $2,500
- Gutter Guard Installation: $600 – $2,000

Roofing Notes:
- Free inspections do not include written reports unless requested (written report: $75)
- All replacements include old roof tear-off and haul-away in the quoted price
- Roofing work is weather-dependent — jobs may be rescheduled due to rain/high wind
- Insurance claims: team can assist with documentation and adjuster meetings
- All new roofs come with a 5-year workmanship warranty

---

## 5. PLUMBING SERVICES & PRICING

Drain & Sewer:
- Drain Cleaning (single drain): $99 – $250
- Main Sewer Line Cleaning: $200 – $500
- Sewer Line Camera Inspection: $150 – $300
- Hydro Jetting (heavy blockage): $300 – $700
- Sewer Line Repair: $1,000 – $4,000
- Sewer Line Replacement (full): $4,000 – $12,000

Leak & Pipe Repair:
- Minor Leak Repair (fixture/joint): $100 – $300
- Pipe Burst Emergency Repair: $300 – $1,000+
- Pipe Re-Route (small section): $500 – $1,500
- Whole-Home Re-Pipe (copper/PEX): $4,000 – $15,000

Water Heaters:
- Water Heater Repair: $150 – $400
- Traditional Tank WH Replacement (40 gal): $900 – $1,800
- Traditional Tank WH Replacement (50+ gal): $1,200 – $2,500
- Tankless Water Heater Install: $1,800 – $4,000
- Water Heater Flush/Maintenance: $79 – $129

Fixtures & Appliances:
- Toilet Repair (flapper, fill valve, etc.): $100 – $250
- Toilet Replacement: $300 – $700
- Faucet Repair: $80 – $200
- Faucet Replacement (customer-supplied): $100 – $250
- Faucet Replacement (Peak-supplied): $200 – $500
- Garbage Disposal Install: $150 – $400
- Dishwasher Installation: $150 – $300 (plumbing only)
- Shower/Tub Repair: $150 – $500
- Shower/Tub Replacement: $1,500 – $5,000+
- Outdoor Hose Bib Install/Repair: $100 – $300

Water Quality:
- Water Softener Install: $800 – $2,500
- Whole-Home Water Filter Install: $500 – $2,000
- Under-Sink Filter Install: $150 – $400
- Water Quality Test: $75 – $200

Plumbing Notes:
- Emergency call-outs (after hours) carry an additional dispatch fee
- All work performed to current local code
- Permit fees, if required, are additional
- For older homes with galvanized steel pipes — corrosion may require more extensive repair once inspection is done

---

## 6. APPOINTMENT POLICIES

Booking:
- Appointments available Monday–Saturday during business hours
- Same-day appointments may be available
- Minimum booking info required: Full name, service type, address, phone number, preferred window

Confirmation:
- Caller receives a confirmation text/email after booking (automated by system)
- Reminder sent 24 hours before appointment

Rescheduling:
- Can reschedule with no fee if done more than 24 hours before the appointment
- Rescheduling with less than 24 hours' notice: $35 rescheduling fee may apply

Cancellation:
- Free cancellation if done more than 24 hours in advance
- Late cancellations (under 24 hours): $35 cancellation fee may apply
- No-shows: $50 no-show fee

Arrival Window:
- Technicians arrive within the selected window (morning/afternoon/end of day)
- Tech will call 30 minutes before arrival

---

## 7. EMERGENCY SERVICES

What qualifies as an emergency:
- Burst or actively leaking pipe
- No heat when outdoor temps are below 40°F
- No AC when outdoor temps are above 95°F
- Gas smell (ALWAYS tell caller to leave the building and call gas company first)
- Sewage backup into home
- Major roof damage with active water intrusion during storm

Emergency Response:
- 24/7 on-call dispatch available
- Target response: within 2–4 hours depending on location and severity
- Emergency call-out fee: $99 – $149 (applied to job if work is performed same visit)
- After-hours labor rates: standard rate + 25% surcharge

Gas Leaks — Special Protocol:
Do not book an appointment. Tell the caller:
"If you smell gas, please leave the house right away and call your gas company's emergency line before anything else. Once you're safe, we can come out and help with any related plumbing or HVAC repairs."

---

## 8. SERVICE AREA

Peak Home Services serves the local metro area and surrounding communities within approximately 40 miles.

For calls where the caller's location seems unclear or potentially outside range:
"Let me just confirm we cover your area — what city are you in?"

If outside service area: "We might be a bit outside our normal range for that one — let me check with the team and have someone call you back to confirm."

---

## 9. COMPANY HISTORY & CREDENTIALS

How long has the company been in business:
Peak Home Services has been in business for 12 years, founded in 2013. Started as a small HVAC company and expanded into roofing and plumbing over time — driven entirely by customer demand from existing clients who trusted the team and wanted the same quality for other services.

Certifications & Licensing:
- HVAC technicians: EPA 608 certified (federally required for handling refrigerants). All HVAC techs hold NATE certification (North American Technician Excellence — the gold standard for HVAC).
- Plumbers: Fully licensed and bonded per state requirements.
- Roofing team: GAF Master Elite certified — fewer than 3% of roofing contractors in the country qualify for this designation. Requires proven workmanship, proper licensing, and insurance.
- Company-wide: Fully insured with general liability and workers compensation coverage.

If asked about credentials or experience: "We've been doing this for 12 years — started in HVAC and grew from there. Our techs are EPA and NATE certified on the HVAC side, GAF Master Elite on roofing, and fully licensed on plumbing. We're fully insured as well."

---

## 10. WARRANTIES & GUARANTEES

- Labor Warranty (all services): 1 year on labor from date of service
- New Roof Workmanship Warranty: 5 years
- HVAC Equipment (new installs): Manufacturer warranty (typically 5–10 years on parts)
- Plumbing Parts: 1 year (manufacturer)
- Satisfaction Guarantee: If not satisfied, we'll come back to make it right at no charge (within 30 days)

---

## 11. PAYMENT & FINANCING

Accepted Payment Methods:
- All major credit/debit cards (Visa, Mastercard, Amex, Discover)
- Check (made out to Peak Home Services)
- Cash
- Bank transfer / ACH (for large jobs over $2,000)

Financing:
- 0% financing available for qualified customers on jobs over $1,500
- Agent should say: "We do have financing options available for larger jobs — the tech can walk you through that when they come out."

Deposits:
- Jobs under $1,000: No deposit required
- Jobs $1,000–$5,000: 25% deposit at booking
- Jobs over $5,000: 30–40% deposit at contract signing

Agent note: Never collect payment details over the phone.

---

## 12. FREQUENTLY ASKED QUESTIONS

Q: How long has your company been in business?
A: We've been around for 12 years — founded in 2013. Started as an HVAC company and expanded into roofing and plumbing as our existing customers kept asking us to take care of other things. Still the same core team.

Q: What certifications do your technicians have?
A: On the HVAC side, all our techs are EPA 608 certified and NATE certified — NATE is the gold standard in the industry, not everyone has it. Our plumbers are fully licensed and bonded per state requirements. The roofing team is GAF Master Elite certified, which less than 3% of roofers nationally qualify for. And the company is fully insured — general liability and workers comp.

Q: Are your technicians licensed and insured?
A: Yes — fully licensed, bonded, and insured across all three services.

Q: Do you offer free estimates?
A: For roofing inspections and larger jobs, yes — free. For repair calls, there's a diagnostic fee of $49–$79, but that gets waived if you go ahead with the repair same visit.

Q: What's the diagnostic fee for?
A: It covers the tech's time to assess the problem and figure out exactly what needs to be done. Most of the time people go ahead with the repair, so it ends up being waived. If you don't proceed, you just pay the diagnostic fee — no pressure.

Q: How long will the job take?
A: Tune-ups and minor repairs usually run 1–2 hours. Installs and replacements are typically a half day to a full day. Larger roofing or sewer jobs can run multi-day. The tech will give you a clearer picture once they've seen it.

Q: Do I need to be home?
A: Yes — an adult 18 or older needs to be there the whole time. Mostly for access and to answer any questions the tech has.

Q: How do I know when the tech is arriving?
A: You'll get a reminder the day before, and the tech calls about 30 minutes before they show up. We work in time windows — morning, afternoon, or end of day — so you're not stuck waiting all day for an exact hour.

Q: What if the tech is running late?
A: They'll reach out. If something changes with the schedule, we call ahead. We don't just leave people waiting. If there's ever a significant delay, we'll let you know and offer to reschedule at no charge if you'd rather do that.

Q: Do you work with insurance companies?
A: Yes, especially on roofing — storm and hail damage, that kind of thing. We can help with documentation and we've worked with most of the major insurers. We don't guarantee claim approval, but we make the process as easy as possible on your end.

Q: Do you offer financing?
A: Yes — 0% financing is available for qualified customers on jobs over $1,500. The tech can walk you through that when they come out. We also have flexible payment options for larger jobs.

Q: What do you require as a deposit?
A: For jobs under $1,000, no deposit. Jobs between $1,000 and $5,000, it's 25% upfront. Larger jobs over $5,000 are 30–40% at contract signing.

Q: What brands do you carry/install?
A: For HVAC: Carrier, Lennox, Trane, Goodman, Rheem. Water heaters: Rheem, Bradford White, and Navien for tankless. Roofing materials: GAF, Owens Corning, CertainTeed.

Q: Can I supply my own parts or fixtures?
A: You can, but the labor warranty won't cover customer-supplied materials. The tech will let you know on-site what makes the most sense.

Q: Do you offer maintenance plans?
A: Yes — HVAC maintenance plans run $199–$299/year and cover two tune-ups, priority scheduling, and a 10% discount on repairs. Roofing and plumbing annual inspection packages are also available.

Q: Do you guarantee your work?
A: Yes. All labor comes with a 1-year warranty from the date of service. New roofs get a 5-year workmanship warranty. If something we did isn't right within 30 days, we come back and fix it at no charge. That's our standard.

Q: Do you do commercial work?
A: Primarily residential and light commercial — small offices, retail spaces, that kind of thing. For large commercial or industrial jobs, give us a call and we'll let you know if it's in scope.

Q: What areas do you serve?
A: We cover the local metro area and surrounding communities within about 40 miles. If you're not sure we cover your area, just tell me what city you're in and I can confirm.

Q: What happens after I book?
A: You'll get a confirmation text or email right after. Then a reminder 24 hours before the appointment. The tech calls about 30 minutes before they arrive. If anything changes on our end, we reach out before the appointment — we don't just show up late or not at all.

Q: What if I need to cancel or reschedule?
A: No problem — just give us a call or call back. Free cancellation or rescheduling if it's more than 24 hours before the appointment. If it's less than 24 hours, there may be a $35 fee. No-shows are $50, but we get it — things come up. Just let us know.

---

## 13. DIAGNOSTIC QUESTION GUIDE

HVAC:
- "Is it not cooling/heating at all, or just not cooling/heating enough?"
- "Is it making any unusual noises?"
- "How old is the system, roughly?"
- "Is the thermostat showing it's running but nothing's happening?"

Roofing:
- "Are you seeing any water stains on the ceiling inside?"
- "Is this after a recent storm?"
- "Are you noticing missing or curling shingles?"

Plumbing:
- "Is the water not draining, or is there a leak somewhere?"
- "Is the hot water not coming on, or running out fast?"
- "Is this one fixture or multiple?"
- "Is the water heater making any sounds or showing an error light?"

Knowledge Base Version: 1.1 | Last Updated: March 2026
For internal agent use only — do not read sections aloud. Use to inform natural responses.`

/**
 * Jordan's default FAQ pairs — seeded into the faqs table for the demo client.
 */
export const JORDAN_SEED_FAQS = [
  { question: 'How long has your company been in business?', answer: 'We\'ve been around for 12 years — founded in 2013. Started as an HVAC company and expanded into roofing and plumbing as our existing customers kept asking. Same core team throughout.' },
  { question: 'What certifications do your technicians have?', answer: 'HVAC techs are EPA 608 certified and NATE certified — that\'s the gold standard in HVAC. Plumbers are fully licensed and bonded per state requirements. Roofing team is GAF Master Elite certified, which fewer than 3% of roofers nationally qualify for. Company is fully insured — general liability and workers comp.' },
  { question: 'Are your technicians licensed and insured?', answer: 'Yes — fully licensed, bonded, and insured across all three services.' },
  { question: 'Do you offer free estimates?', answer: 'For roofing inspections and larger jobs, yes — free. For repair calls there\'s a diagnostic fee of $49–$79, but it\'s waived if you go ahead with the repair same visit.' },
  { question: 'What\'s the diagnostic fee for?', answer: 'It covers the tech\'s time to assess the problem. Most people go ahead with the repair so it ends up waived. If you don\'t proceed, you just pay the diagnostic — no pressure.' },
  { question: 'How long will the job take?', answer: 'Tune-ups and minor repairs: 1–2 hours. Installs and replacements: half a day to a full day. Larger roofing or plumbing jobs can be multi-day. The tech gives a clearer picture once they\'ve seen it.' },
  { question: 'Do I need to be home?', answer: 'Yes — an adult 18+ needs to be there the whole time, mostly for access and to answer any questions the tech has.' },
  { question: 'How do I know when the tech is arriving?', answer: 'You get a reminder the day before, and the tech calls about 30 minutes before they show up. We work in time windows so you\'re not stuck waiting all day.' },
  { question: 'What if the tech is running late?', answer: 'They\'ll reach out ahead of time. If there\'s a significant delay we\'ll let you know and offer to reschedule at no charge if you\'d rather.' },
  { question: 'Do you work with insurance companies?', answer: 'Yes, especially for roofing storm and hail damage. We help with documentation and work with most major insurers. We don\'t guarantee claim approval — that\'s between you and your insurer — but we make it as easy as possible.' },
  { question: 'Do you offer financing?', answer: '0% financing is available for qualified customers on jobs over $1,500. The tech can walk you through that when they come out.' },
  { question: 'Do you guarantee your work?', answer: 'Yes — 1-year labor warranty on all services, 5-year workmanship warranty on new roofs. If something we did isn\'t right within 30 days, we come back and fix it at no charge.' },
  { question: 'What brands do you carry/install?', answer: 'HVAC: Carrier, Lennox, Trane, Goodman, Rheem. Water heaters: Rheem, Bradford White, Navien (tankless). Roofing: GAF, Owens Corning, CertainTeed.' },
  { question: 'Can I supply my own parts/fixtures?', answer: 'You can, but the labor warranty won\'t cover customer-supplied materials. Tech will advise on-site.' },
  { question: 'Do you offer maintenance plans?', answer: 'Yes — HVAC maintenance plans at $199–$299/year covering two tune-ups, priority scheduling, and 10% off repairs. Roofing and plumbing annual inspection packages available too.' },
  { question: 'What if I need to cancel or reschedule?', answer: 'No problem — free if it\'s more than 24 hours before. Under 24 hours there may be a $35 fee. No-shows are $50. Just call us and we\'ll take care of it.' },
  { question: 'Do you do commercial work?', answer: 'Primarily residential and light commercial — small offices, retail spaces. For large commercial or industrial, give us a call and we\'ll let you know if it\'s in scope.' },
]

/**
 * Jordan's default business info — seeded into business_info for the demo client.
 */
export const JORDAN_SEED_BUSINESS_INFO = {
  hours: {
    monday: '7:00 AM – 6:00 PM',
    tuesday: '7:00 AM – 6:00 PM',
    wednesday: '7:00 AM – 6:00 PM',
    thursday: '7:00 AM – 6:00 PM',
    friday: '7:00 AM – 6:00 PM',
    saturday: '8:00 AM – 4:00 PM',
    sunday: 'CLOSED',
  },
  address: '(555) 732-5400 · www.peakhomeservices.com',
  services_offered: ['HVAC', 'Roofing', 'Plumbing'],
  service_areas: ['Local metro area and surrounding communities within approximately 40 miles'],
  pricing_notes: 'Diagnostic fee $49–$79 (waived if repair proceeds). Emergency call-out fee $99–$149. After-hours labor +25%. 0% financing on jobs over $1,500.',
}
