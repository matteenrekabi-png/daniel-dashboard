import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getClientByUserId } from '@/lib/get-client'
import { vapiRequest } from '@/lib/vapi'
import { parsePromptSections, applyPromptEdits, type PromptSection } from '@/lib/gemini-prompt'
import { logActivity } from '@/lib/log-activity'

// ─── GET: parse current VAPI prompt into editable sections ───────────────────

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const client = await getClientByUserId(user.id)
    if (!client?.vapi_assistant_id) {
      return NextResponse.json({ error: 'No assistant connected' }, { status: 404 })
    }

    const assistant = await vapiRequest(`/assistant/${client.vapi_assistant_id}`, 'GET')
    const messages = assistant.model?.messages ?? []
    const systemMsg = messages.find((m: { role: string }) => m.role === 'system')
    const prompt: string = systemMsg?.content ?? ''

    if (!prompt) {
      return NextResponse.json({ error: 'Could not read assistant prompt' }, { status: 500 })
    }

    const result = await parsePromptSections(prompt)
    return NextResponse.json(result)
  } catch (err) {
    console.error('Personality sections GET error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load sections' },
      { status: 500 }
    )
  }
}

// ─── POST: apply edited sections → push back to VAPI ─────────────────────────

export async function POST(request: Request) {
  try {
    const { sections }: { sections: PromptSection[] } = await request.json()
    if (!Array.isArray(sections)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const client = await getClientByUserId(user.id)
    if (!client?.vapi_assistant_id) {
      return NextResponse.json({ error: 'No assistant connected' }, { status: 404 })
    }

    // Fetch current prompt as the base for reconstruction
    const assistant = await vapiRequest(`/assistant/${client.vapi_assistant_id}`, 'GET')
    const currentModel = assistant.model ?? {}
    const messages = currentModel.messages ?? []
    const systemMsg = messages.find((m: { role: string }) => m.role === 'system')
    const currentPrompt: string = systemMsg?.content ?? ''

    if (!currentPrompt) {
      return NextResponse.json({ error: 'Could not read current assistant prompt' }, { status: 500 })
    }

    // Apply edits and push
    const rebuiltPrompt = applyPromptEdits(currentPrompt, sections)

    await vapiRequest(`/assistant/${client.vapi_assistant_id}`, 'PATCH', {
      model: {
        ...currentModel,
        messages: [{ role: 'system', content: rebuiltPrompt }],
      },
    })

    await logActivity({
      action: 'Edited agent prompt sections',
      clientId: client.id,
      clientName: client.business_name,
      changeType: 'prompt',
      beforeSnapshot: currentPrompt,
      afterSnapshot: rebuiltPrompt,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Personality sections POST error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Save failed' },
      { status: 500 }
    )
  }
}
