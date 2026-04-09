import { NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getClientByUserId } from '@/lib/get-client'
import { vapiRequest } from '@/lib/vapi'
import { parsePromptSections, applyPromptEdits, type PromptSection } from '@/lib/gemini-prompt'
import { logActivity } from '@/lib/log-activity'

function hashPrompt(prompt: string) {
  return createHash('sha256').update(prompt).digest('hex')
}

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

    // Fetch current prompt from VAPI to check hash
    const assistant = await vapiRequest(`/assistant/${client.vapi_assistant_id}`, 'GET')
    const messages = assistant.model?.messages ?? []
    const systemMsg = messages.find((m: { role: string }) => m.role === 'system')
    const prompt: string = systemMsg?.content ?? ''

    if (!prompt) {
      return NextResponse.json({ error: 'Could not read assistant prompt' }, { status: 500 })
    }

    const currentHash = hashPrompt(prompt)

    // Check Supabase cache — only use it if the hash matches (i.e. VAPI hasn't changed)
    const admin = createAdminClient()
    const { data: personality } = await admin
      .from('agent_personality')
      .select('prompt_hash, sections_cache')
      .eq('client_id', client.id)
      .single()

    if (personality?.sections_cache && personality.prompt_hash === currentHash) {
      return NextResponse.json({ sections: personality.sections_cache, cached: true })
    }

    let result
    try {
      result = await parsePromptSections(prompt)
    } catch (geminiErr) {
      // Gemini unavailable — serve stale cache if we have it rather than erroring
      if (personality?.sections_cache) {
        return NextResponse.json({ sections: personality.sections_cache, cached: true, stale: true })
      }
      throw geminiErr
    }

    await admin
      .from('agent_personality')
      .upsert(
        { client_id: client.id, prompt_hash: currentHash, sections_cache: result.sections },
        { onConflict: 'client_id' }
      )

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

    // Update cache so next load is instant
    const newHash = hashPrompt(rebuiltPrompt)
    const admin = createAdminClient()
    await admin
      .from('agent_personality')
      .upsert(
        { client_id: client.id, prompt_hash: newHash, sections_cache: sections },
        { onConflict: 'client_id' }
      )

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
