import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getClientByUserId } from '@/lib/get-client'
import { KBSections } from '@/lib/gemini-kb'

type StoredKB = KBSections & { _vapiFileId?: string }

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const client = await getClientByUserId(user.id)
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

    const admin = createAdminClient()

    const { data: kb } = await admin
      .from('knowledge_base')
      .select('sections')
      .eq('client_id', client.id)
      .single()

    const stored = kb?.sections as StoredKB | null
    const isNewFormat = Array.isArray(stored?.sections)

    if (!isNewFormat || (stored!.sections.length === 0 && (stored!.faqs?.length ?? 0) === 0)) {
      return NextResponse.json({ error: 'No knowledge base found. Save your knowledge base first.' }, { status: 404 })
    }

    const { _vapiFileId: _, ...clean } = stored!
    return NextResponse.json(clean)
  } catch (err) {
    console.error('KB refresh error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Refresh failed' }, { status: 500 })
  }
}
