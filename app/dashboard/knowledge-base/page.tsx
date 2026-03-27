import { createClient } from '@/lib/supabase/server'
import { getClientByUserId } from '@/lib/get-client'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { KBSections } from '@/lib/gemini-kb'
import KnowledgeBaseEditor from './knowledge-base-editor'

export default async function KnowledgeBasePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const client = await getClientByUserId(user.id)
  const admin = createAdminClient()

  const { data: kb } = client ? await admin
    .from('knowledge_base')
    .select('sections')
    .eq('client_id', client.id)
    .single() : { data: null }

  const saved = kb?.sections as (KBSections & { _vapiFileId?: string }) | null
  const isNewFormat = Array.isArray(saved?.sections)
  const initialSections: KBSections | null = isNewFormat && (saved!.sections.length > 0 || saved!.faqs?.length > 0)
    ? { sections: saved!.sections, faqs: saved!.faqs ?? [] }
    : null

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: '#ededed' }}>Knowledge Base</h1>
        <p className="text-sm mt-1" style={{ color: '#555' }}>
          Everything your AI employee knows about your business.
          Edit any section and save to push changes to your live assistant instantly.
        </p>
      </div>
      <KnowledgeBaseEditor
        initialSections={initialSections ?? null}
        vapiAssistantId={client?.vapi_assistant_id ?? null}
      />
    </div>
  )
}
