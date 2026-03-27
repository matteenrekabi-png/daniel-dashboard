import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { vapiRequest } from '@/lib/vapi'

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
    const { agentName, personalityStyle, speakingPace, customGreeting } = await request.json()

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: client } = await supabase
      .from('clients')
      .select('id, vapi_assistant_id')
      .single()
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

    // Save to DB
    await supabase.from('agent_personality').upsert({
      client_id: client.id,
      agent_name: agentName,
      personality_style: personalityStyle,
      speaking_pace: speakingPace,
      custom_greeting: customGreeting || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'client_id' })

    // Push to VAPI — surgical marker replacement only, never rebuild the whole prompt
    if (client.vapi_assistant_id) {
      const assistant = await vapiRequest(`/assistant/${client.vapi_assistant_id}`, 'GET')
      const currentModel = assistant.model ?? {}
      let prompt: string = currentModel.messages?.[0]?.content ?? ''

      if (!prompt) {
        return NextResponse.json({ error: 'Could not read current assistant prompt' }, { status: 500 })
      }

      // Replace [PERSONALITY_NOTE] line
      prompt = prompt.replace(
        /\[PERSONALITY_NOTE\] .*/,
        `[PERSONALITY_NOTE] ${PERSONALITY_NOTES[personalityStyle as PersonalityStyle] ?? PERSONALITY_NOTES.friendly}`
      )

      // Replace [SPEAKING_PACE_NOTE] line
      prompt = prompt.replace(
        /\[SPEAKING_PACE_NOTE\] .*/,
        `[SPEAKING_PACE_NOTE] ${PACE_NOTES[speakingPace as SpeakingPace] ?? PACE_NOTES.normal}`
      )

      // Replace [GREETING] line (only if custom greeting provided, otherwise keep current)
      if (customGreeting?.trim()) {
        prompt = prompt.replace(
          /\[GREETING\] .*/,
          `[GREETING] ${customGreeting.trim()}`
        )
      }

      await vapiRequest(`/assistant/${client.vapi_assistant_id}`, 'PATCH', {
        model: {
          ...currentModel,
          messages: [{ role: 'system', content: prompt }],
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Personality save error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Save failed' },
      { status: 500 }
    )
  }
}
