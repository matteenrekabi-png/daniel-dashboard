import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getClientByUserId } from '@/lib/get-client'
import { vapiRequest, uploadVapiKbFile, updateVapiKbFileId } from '@/lib/vapi'
import { KBSections, parseKBWithGemini, buildKbFromSections } from '@/lib/gemini-kb'
import { logActivity } from '@/lib/log-activity'

type StoredKB = KBSections & { _vapiFileId?: string }

export async function GET() {
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

    if (isNewFormat && (stored!.sections.length > 0 || stored!.faqs?.length > 0)) {
      const { _vapiFileId: _, ...clean } = stored!
      return NextResponse.json(clean)
    }

    if (!client.vapi_assistant_id) return NextResponse.json(emptyKBSections())

    const assistant = await vapiRequest(`/assistant/${client.vapi_assistant_id}`, 'GET')
    const fileIds: string[] = assistant.model?.knowledgeBase?.fileIds ?? []

    let kbContent: string | null = null
    let vapiFileId: string | null = null

    if (fileIds.length > 0) {
      try {
        const fileInfo = await vapiRequest(`/file/${fileIds[0]}`, 'GET')
        const contentRes = await fetch(fileInfo.url)
        kbContent = await contentRes.text()
        vapiFileId = fileIds[0]
      } catch (e) {
        console.warn('Could not fetch VAPI KB file:', e)
      }
    }

    if (!kbContent) return NextResponse.json(emptyKBSections())

    let sections: KBSections
    try {
      sections = await parseKBWithGemini(kbContent)
    } catch (err) {
      console.error('Gemini parse failed:', err)
      if (stored) {
        const { _vapiFileId: _, ...stale } = stored as StoredKB
        return NextResponse.json(stale)
      }
      return NextResponse.json(emptyKBSections())
    }

    await admin.from('knowledge_base').upsert({
      client_id: client.id,
      sections: { ...sections, ...(vapiFileId ? { _vapiFileId: vapiFileId } : {}) },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'client_id' })

    return NextResponse.json(sections)
  } catch (err) {
    console.error('KB GET error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Load failed' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body: KBSections = await request.json()

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
    const oldStored = kb?.sections as StoredKB | null
    const oldFileId = oldStored?._vapiFileId ?? null
    const oldKbMarkdown = oldStored ? buildKbFromSections(oldStored) : null

    let newFileId: string | null = null

    if (client.vapi_assistant_id) {
      const kbMarkdown = buildKbFromSections(body)
      newFileId = await uploadVapiKbFile(kbMarkdown, 'Jordan_Knowledge_Base.md')
      await updateVapiKbFileId(client.vapi_assistant_id, newFileId)

      if (oldFileId && oldFileId !== newFileId) {
        try { await vapiRequest(`/file/${oldFileId}`, 'DELETE') } catch {}
      }
    }

    await admin.from('knowledge_base').upsert({
      client_id: client.id,
      sections: { ...body, ...(newFileId ? { _vapiFileId: newFileId } : {}) },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'client_id' })

    await logActivity({
      action: 'Updated knowledge base',
      clientId: client.id,
      clientName: client.business_name,
      changeType: 'knowledge_base',
      beforeSnapshot: oldKbMarkdown,
      afterSnapshot: buildKbFromSections(body),
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('KB POST error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Save failed' }, { status: 500 })
  }
}

function emptyKBSections(): KBSections {
  return { sections: [], faqs: [] }
}
