import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getClientByUserId } from '@/lib/get-client'
import { vapiRequest } from '@/lib/vapi'
import { logActivity } from '@/lib/log-activity'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const client = await getClientByUserId(user.id)
  if (!client?.vapi_assistant_id) return NextResponse.json({ prompt: '' })

  try {
    const assistant = await vapiRequest(`/assistant/${client.vapi_assistant_id}`, 'GET')
    const messages = assistant.model?.messages ?? []
    const systemMsg = messages.find((m: { role: string }) => m.role === 'system')
    return NextResponse.json({ prompt: systemMsg?.content ?? '' })
  } catch {
    return NextResponse.json({ prompt: '' })
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { prompt } = await request.json()
  if (!prompt) return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })

  const client = await getClientByUserId(user.id)
  if (!client?.vapi_assistant_id) return NextResponse.json({ error: 'No assistant connected' }, { status: 404 })

  const current = await vapiRequest(`/assistant/${client.vapi_assistant_id}`, 'GET')
  const currentModel = current.model ?? {}
  const existingMessages: { role: string; content: string }[] = currentModel.messages ?? []
  const systemMsg = existingMessages.find((m) => m.role === 'system')
  const oldPrompt: string = systemMsg?.content ?? ''
  const otherMessages = existingMessages.filter((m) => m.role !== 'system')

  await vapiRequest(`/assistant/${client.vapi_assistant_id}`, 'PATCH', {
    model: {
      ...currentModel,
      messages: [{ role: 'system', content: prompt }, ...otherMessages],
    },
  })

  await logActivity({
    action: 'Edited raw system prompt',
    clientId: client.id,
    clientName: client.business_name,
    changeType: 'prompt',
    beforeSnapshot: oldPrompt,
    afterSnapshot: prompt,
  })

  return NextResponse.json({ success: true })
}
