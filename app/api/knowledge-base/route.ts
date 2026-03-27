import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { vapiRequest, uploadVapiKbFile, updateVapiKbFileId } from '@/lib/vapi'
import { KBSections, parseKBWithGemini, buildKbFromSections } from '@/lib/gemini-kb'

type StoredKB = KBSections & { _vapiFileId?: string }

// ─── GET: load knowledge base ────────────────────────────────────────────────
// Gemini is called ONLY when Supabase cache is empty.
// Every other load is served from cache — no Gemini cost.

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: client } = await supabase
      .from('clients')
      .select('id, vapi_assistant_id')
      .single()
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

    // ── Serve from Supabase cache if available ──
    const { data: kb } = await supabase
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

    // ── Cache miss — fetch VAPI KB file and parse with Gemini (once) ──
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
      // Fallback: serve stale cache rather than error
      if (stored) {
        const { _vapiFileId: _, ...stale } = stored as StoredKB
        return NextResponse.json(stale)
      }
      return NextResponse.json(emptyKBSections())
    }

    // Cache so Gemini is never called again for this client
    await supabase.from('knowledge_base').upsert({
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

// ─── POST: save — no Gemini, just rebuild markdown and upload ────────────────

export async function POST(request: Request) {
  try {
    const body: KBSections = await request.json()

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: client } = await supabase
      .from('clients')
      .select('id, vapi_assistant_id')
      .single()
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

    const { data: kb } = await supabase
      .from('knowledge_base')
      .select('sections')
      .eq('client_id', client.id)
      .single()
    const oldFileId = (kb?.sections as StoredKB | null)?._vapiFileId ?? null

    let newFileId: string | null = null

    if (client.vapi_assistant_id) {
      const kbMarkdown = buildKbFromSections(body)
      newFileId = await uploadVapiKbFile(kbMarkdown, 'Jordan_Knowledge_Base.md')
      await updateVapiKbFileId(client.vapi_assistant_id, newFileId)

      if (oldFileId && oldFileId !== newFileId) {
        try { await vapiRequest(`/file/${oldFileId}`, 'DELETE') } catch {}
      }
    }

    await supabase.from('knowledge_base').upsert({
      client_id: client.id,
      sections: { ...body, ...(newFileId ? { _vapiFileId: newFileId } : {}) },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'client_id' })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('KB POST error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Save failed' }, { status: 500 })
  }
}

function emptyKBSections(): KBSections {
  return { sections: [], faqs: [] }
}
