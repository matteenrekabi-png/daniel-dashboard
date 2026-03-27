import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { vapiRequest, uploadVapiKbFile, updateVapiKbFileId } from '@/lib/vapi'
import { KBSections, buildKbFromSections } from '@/lib/gemini-kb'
import { BusinessHoursData, hoursToKBContent, DEFAULT_HOURS, parseHoursFromKBSection } from '@/lib/business-hours'

type StoredKB = KBSections & { _vapiFileId?: string }

// GET — return current business hours (parsed from cached KB section, or defaults)
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: client } = await supabase.from('clients').select('id').single()
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

    const { data: kb } = await supabase
      .from('knowledge_base')
      .select('sections')
      .eq('client_id', client.id)
      .single()

    const stored = kb?.sections as StoredKB | null
    const bhSection = stored?.sections?.find(s => s.key === 'business_hours')

    if (bhSection?.content) {
      return NextResponse.json(parseHoursFromKBSection(bhSection.content))
    }

    return NextResponse.json(DEFAULT_HOURS)
  } catch (err) {
    console.error('Business hours GET error:', err)
    return NextResponse.json({ error: 'Load failed' }, { status: 500 })
  }
}

// POST — save hours to KB section and push to VAPI
export async function POST(request: Request) {
  try {
    const data: BusinessHoursData = await request.json()

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: client } = await supabase
      .from('clients')
      .select('id, vapi_assistant_id')
      .single()
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

    // Load current KB sections
    const { data: kb } = await supabase
      .from('knowledge_base')
      .select('sections')
      .eq('client_id', client.id)
      .single()

    const stored: StoredKB = (kb?.sections as StoredKB | null) ?? { sections: [], faqs: [] }
    const oldFileId = stored._vapiFileId ?? null

    // Update or insert the business_hours section
    const bhContent = hoursToKBContent(data)
    const existingIdx = stored.sections.findIndex(s => s.key === 'business_hours')

    const updatedSections = [...stored.sections]
    const bhSection = { key: 'business_hours', label: 'Business Hours', content: bhContent }

    if (existingIdx >= 0) {
      updatedSections[existingIdx] = bhSection
    } else {
      updatedSections.unshift(bhSection)
    }

    const kbPayload: KBSections = { sections: updatedSections, faqs: stored.faqs ?? [] }

    // Push to VAPI
    let newFileId: string | null = null
    if (client.vapi_assistant_id) {
      const kbMarkdown = buildKbFromSections(kbPayload)
      newFileId = await uploadVapiKbFile(kbMarkdown, 'Jordan_Knowledge_Base.md')
      await updateVapiKbFileId(client.vapi_assistant_id, newFileId)

      if (oldFileId && oldFileId !== newFileId) {
        try { await vapiRequest(`/file/${oldFileId}`, 'DELETE') } catch {}
      }
    }

    // Update Supabase cache
    await supabase.from('knowledge_base').upsert({
      client_id: client.id,
      sections: { ...kbPayload, ...(newFileId ? { _vapiFileId: newFileId } : oldFileId ? { _vapiFileId: oldFileId } : {}) },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'client_id' })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Business hours POST error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Save failed' }, { status: 500 })
  }
}
