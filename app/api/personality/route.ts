import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getClientByUserId } from '@/lib/get-client'
import { vapiRequest } from '@/lib/vapi'
import { logActivity } from '@/lib/log-activity'

type PersonalityStyle = 'friendly' | 'professional' | 'casual'
type SpeakingPace = 'slow' | 'normal' | 'fast'

const PERSONALITY_NOTES: Record<PersonalityStyle, string> = {
  friendly:     'Be warm, friendly, and genuine. Make the caller feel like they reached someone who actually cares.',
  professional: 'Keep your tone professional and composed. Warm, but measured. Business-first.',
  casual:       'Be relaxed and conversational. Talk like a real person, not a receptionist.',
}

const PACE_NOTES: Record<SpeakingPace, string> = {
  slow:   'Speak slowly and clearly. Take your time between thoughts. Never rush.',
  normal: 'Speak at a natural, comfortable pace — not rushed, not slow.',
  fast:   "Match the caller's energy. Keep things moving. Be efficient without being cold.",
}

export async function POST(request: Request) {
  try {
    const { agentName, personalityStyle, speakingPace, firstMessage } = await request.json()

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const client = await getClientByUserId(user.id)
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

    const admin = createAdminClient()

    // Save to DB
    await admin.from('agent_personality').upsert({
      client_id: client.id,
      agent_name: agentName,
      personality_style: personalityStyle,
      speaking_pace: speakingPace,
      custom_greeting: firstMessage || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'client_id' })

    // Push to VAPI — replace actual prompt content based on real prompt structure
    if (client.vapi_assistant_id) {
      const assistant = await vapiRequest(`/assistant/${client.vapi_assistant_id}`, 'GET')
      const currentModel = assistant.model ?? {}
      let prompt: string = currentModel.messages?.[0]?.content ?? ''

      if (!prompt) {
        return NextResponse.json({ error: 'Could not read current assistant prompt' }, { status: 500 })
      }

      const name = agentName?.trim()

      // ── Agent name ──────────────────────────────────────────────────────────
      if (name) {
        // Title line: "PEAK HOME SERVICES — JORDAN (AI Receptionist)"
        prompt = prompt.replace(
          /^(PEAK HOME SERVICES\s*—\s*).+?(\s*\(AI Receptionist\))/m,
          `$1${name.toUpperCase()}$2`
        )
        // WHO YOU ARE: "You are Jordan, the receptionist for"
        prompt = prompt.replace(
          /You are [^,]+, the receptionist for/,
          `You are ${name}, the receptionist for`
        )
        // NAMES section example: "So that's Jordan Smith — did I get that right?"
        prompt = prompt.replace(
          /So that's \S+ Smith/,
          `So that's ${name.split(' ')[0]} Smith`
        )
      }

      // ── Personality & pace ──────────────────────────────────────────────────
      // Replace the two lines under "PERSONALITY & PACE" up to the next blank line
      const personalityNote = PERSONALITY_NOTES[personalityStyle as PersonalityStyle] ?? PERSONALITY_NOTES.friendly
      const paceNote = PACE_NOTES[speakingPace as SpeakingPace] ?? PACE_NOTES.normal
      prompt = prompt.replace(
        /(PERSONALITY & PACE\n)[\s\S]*?(\n\nHOW YOU START)/,
        `$1${personalityNote}\n${paceNote}$2`
      )

      const patch: Record<string, unknown> = {
        model: { ...currentModel, messages: [{ role: 'system', content: prompt }] },
      }

      // ── First message ───────────────────────────────────────────────────────
      if (firstMessage?.trim()) {
        patch.firstMessage = firstMessage.trim()
      } else if (name) {
        // Auto-update first message to use new agent name
        const currentFirst: string = assistant.firstMessage ?? ''
        patch.firstMessage = currentFirst.replace(/this is [^!?.]+/i, `this is ${name}`)
      }

      await vapiRequest(`/assistant/${client.vapi_assistant_id}`, 'PATCH', patch)

      // Bust sections cache so the behavior sections panel reloads from the updated prompt
      await admin.from('agent_personality').update({ sections_cache: null, prompt_hash: null })
        .eq('client_id', client.id)
    }

    const changes: string[] = []
    if (personalityStyle) changes.push(`Personality: ${personalityStyle}`)
    if (speakingPace) changes.push(`Pace: ${speakingPace}`)
    if (firstMessage?.trim()) changes.push('Opening greeting updated')

    await logActivity({
      action: changes.length === 1 && firstMessage?.trim() && !personalityStyle
        ? 'Updated opening greeting'
        : 'Updated agent personality',
      clientId: client.id,
      clientName: client.business_name,
      details: changes.join(' · ') || null,
      changeType: 'personality',
    })

    // Fetch the updated assistant to return the new prompt + firstMessage to the client
    let updatedPrompt = ''
    let updatedFirstMessage = ''
    if (client.vapi_assistant_id) {
      try {
        const updated = await vapiRequest(`/assistant/${client.vapi_assistant_id}`, 'GET')
        updatedPrompt = updated.model?.messages?.[0]?.content ?? ''
        updatedFirstMessage = updated.firstMessage ?? ''
      } catch { /* non-fatal */ }
    }

    return NextResponse.json({ success: true, prompt: updatedPrompt, firstMessage: updatedFirstMessage })
  } catch (err) {
    console.error('Personality save error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Save failed' },
      { status: 500 }
    )
  }
}
