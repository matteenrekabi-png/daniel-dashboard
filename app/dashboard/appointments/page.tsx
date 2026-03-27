import { createClient } from '@/lib/supabase/server'
import BusinessHoursEditor from './business-hours-editor'
import { parseHoursFromKBSection, DEFAULT_HOURS } from '@/lib/business-hours'
import { KBSections } from '@/lib/gemini-kb'

type StoredKB = KBSections & { _vapiFileId?: string }

export default async function BusinessHoursPage() {
  const supabase = await createClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .single()

  let initialHours = DEFAULT_HOURS

  if (client) {
    const { data: kb } = await supabase
      .from('knowledge_base')
      .select('sections')
      .eq('client_id', client.id)
      .single()

    const stored = kb?.sections as StoredKB | null
    const bhSection = stored?.sections?.find(s => s.key === 'business_hours')

    if (bhSection?.content) {
      initialHours = parseHoursFromKBSection(bhSection.content)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: '#ededed' }}>Business Hours</h1>
        <p className="text-sm mt-1" style={{ color: '#555' }}>
          Set when you&apos;re open. Your AI receptionist uses this to answer scheduling questions accurately.
        </p>
      </div>
      <BusinessHoursEditor initialHours={initialHours} />
    </div>
  )
}
