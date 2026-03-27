import { createClient } from '@/lib/supabase/server'
import { getClientByUserId } from '@/lib/get-client'
import { createAdminClient } from '@/lib/supabase/admin'
import { vapiRequest } from '@/lib/vapi'
import { redirect } from 'next/navigation'
import PersonalityForm from './personality-form'

export default async function PersonalityPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const client = await getClientByUserId(user.id)
  const admin = createAdminClient()

  const { data: personality } = client ? await admin
    .from('agent_personality')
    .select('*')
    .eq('client_id', client.id)
    .single() : { data: null }

  // Fetch current system prompt from VAPI
  let currentPrompt = ''
  if (client?.vapi_assistant_id) {
    try {
      const assistant = await vapiRequest(`/assistant/${client.vapi_assistant_id}`, 'GET')
      const messages = assistant.model?.messages ?? []
      const systemMsg = messages.find((m: { role: string }) => m.role === 'system')
      currentPrompt = systemMsg?.content ?? ''
    } catch {
      // If VAPI fetch fails, show empty editor
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: '#ededed' }}>Agent Personality</h1>
        <p className="text-sm mt-1" style={{ color: '#555' }}>
          Customize how your AI employee sounds. Changes push to your live assistant immediately.
        </p>
      </div>
      <PersonalityForm
        personality={personality}
        vapiAssistantId={client?.vapi_assistant_id ?? null}
        currentPrompt={currentPrompt}
      />
    </div>
  )
}
