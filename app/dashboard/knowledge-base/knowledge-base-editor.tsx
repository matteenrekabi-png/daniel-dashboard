'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'

interface KBSection {
  key: string
  label: string
  content: string
}

interface FAQ {
  id: string
  question: string
  answer: string
}

interface KBSections {
  sections: KBSection[]
  faqs: FAQ[]
}

interface Props {
  initialSections: KBSections | null
  vapiAssistantId: string | null
}

const DOT_COLORS = ['#2563eb', '#0891b2', '#059669', '#d97706', '#9333ea', '#dc2626', '#0284c7', '#16a34a', '#ea580c']

const inputStyle: React.CSSProperties = {
  background: '#080808',
  border: '1px solid #1f1f1f',
  color: '#d4d4d4',
  borderRadius: 8,
  padding: '12px 14px',
  fontSize: 13,
  lineHeight: '1.7',
  outline: 'none',
  width: '100%',
  resize: 'vertical' as const,
  fontFamily: 'ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, monospace',
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
}

export default function KnowledgeBaseEditor({ initialSections }: Props) {
  const [sections, setSections] = useState<KBSection[]>(initialSections?.sections ?? [])
  const [faqs, setFaqs] = useState<FAQ[]>(initialSections?.faqs ?? [])
  const [loading, setLoading] = useState(!initialSections)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [openSections, setOpenSections] = useState<Set<string>>(new Set())
  const [addingSection, setAddingSection] = useState(false)
  const [newSectionLabel, setNewSectionLabel] = useState('')
  const addInputRef = useRef<HTMLInputElement>(null)

  // Open all sections once data is loaded
  useEffect(() => {
    if (sections.length > 0) {
      setOpenSections(new Set([...sections.map((s) => s.key), 'faqs']))
    }
  }, [sections.length > 0]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!initialSections) {
      fetch('/api/knowledge-base')
        .then((r) => r.json())
        .then((data: unknown) => {
          if ((data as { error?: string }).error) {
            setLoadError((data as { error: string }).error)
            return
          }
          applyData(data as KBSections)
        })
        .catch(() => setLoadError('Could not connect to load your knowledge base.'))
        .finally(() => setLoading(false))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function applyData(data: KBSections) {
    const secs = data.sections ?? []
    const fqs = (data.faqs ?? []).map((f: FAQ, i: number) => ({ ...f, id: f.id || `faq-${i}` }))
    setSections(secs)
    setFaqs(fqs)
    setOpenSections(new Set([...secs.map((s) => s.key), 'faqs']))
  }

  function toggleSection(key: string) {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function updateSection(key: string, content: string) {
    setSections((prev) => prev.map((s) => (s.key === key ? { ...s, content } : s)))
  }

  function removeSection(key: string) {
    setSections((prev) => prev.filter((s) => s.key !== key))
  }

  function confirmAddSection() {
    const label = newSectionLabel.trim()
    if (!label) return
    const key = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
    const uniqueKey = sections.some((s) => s.key === key) ? `${key}_${Date.now()}` : key
    setSections((prev) => [...prev, { key: uniqueKey, label, content: '' }])
    setOpenSections((prev) => new Set([...prev, uniqueKey]))
    setNewSectionLabel('')
    setAddingSection(false)
  }

  function addFaq() {
    const newFaq = { id: `new-${Date.now()}`, question: '', answer: '' }
    setFaqs((prev) => [...prev, newFaq])
    setOpenSections((prev) => new Set([...prev, 'faqs']))
  }

  function updateFaq(id: string, field: 'question' | 'answer', value: string) {
    setFaqs((prev) => prev.map((f) => (f.id === id ? { ...f, [field]: value } : f)))
  }

  function removeFaq(id: string) {
    setFaqs((prev) => prev.filter((f) => f.id !== id))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/knowledge-base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections, faqs }),
      })
      const data = await res.json()
      if (!res.ok) toast.error(data.error ?? 'Save failed')
      else toast.success('Saved and synced to your assistant')
    } finally {
      setSaving(false)
    }
  }

  async function handleRefresh() {
    setRefreshing(true)
    try {
      const res = await fetch('/api/knowledge-base/refresh', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Refresh failed'); return }
      applyData(data)
      toast.success('Knowledge base re-read from your assistant')
    } finally {
      setRefreshing(false)
    }
  }

  const focusStyle = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = '#2563eb'
    e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.08)'
  }
  const blurStyle = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = '#1f1f1f'
    e.target.style.boxShadow = 'none'
  }

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <>
        <style>{css}</style>
        <div className="kb-loading-card">
          <div className="kb-spinner" />
          <div>
            <p style={{ color: '#ededed', fontWeight: 600, fontSize: 14, marginBottom: 6 }}>
              Reading your assistant&apos;s knowledge base&hellip;
            </p>
            <p style={{ color: '#555', fontSize: 13, lineHeight: 1.6 }}>
              Organizing everything your AI currently knows into editable sections.
              This only happens once — every visit after this loads instantly.
            </p>
          </div>
        </div>
      </>
    )
  }

  if (loadError) {
    return (
      <>
        <style>{css}</style>
        <div className="kb-error-card">
          <p style={{ color: '#f87171', fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Could not load knowledge base</p>
          <p style={{ color: '#555', fontSize: 13 }}>{loadError}</p>
        </div>
      </>
    )
  }

  // ─── Editor ───────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <style>{css}</style>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: 12, color: '#555' }}>
          {sections.length} section{sections.length !== 1 ? 's' : ''} · {faqs.length} FAQ{faqs.length !== 1 ? 's' : ''}
        </p>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          title="Re-read the knowledge base from your live assistant. Use this if you edited the assistant directly in VAPI."
          className="btn-ghost px-3 py-2 flex items-center gap-2"
        >
          <span style={{ display: 'inline-block', transition: 'transform 0.7s ease', transform: refreshing ? 'rotate(360deg)' : 'none' }}>↻</span>
          {refreshing ? 'Reloading…' : 'Reload from assistant'}
        </button>
      </div>

      {/* Dynamic section cards */}
      {sections.map((section, idx) => {
        const isOpen = openSections.has(section.key)
        const lineCount = section.content.trim() ? section.content.trim().split('\n').length : 0
        const preview = section.content.split('\n')[0]?.trim()
        const dotColor = DOT_COLORS[idx % DOT_COLORS.length]
        const rows = Math.max(6, Math.min(30, section.content.split('\n').length + 3))

        return (
          <div key={section.key} className="kb-card" style={{ animationDelay: `${0.04 * idx}s` }}>
            <div className="kb-card-header" onClick={() => toggleSection(section.key)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <span className="kb-dot" style={{ background: dotColor }} />
                <div style={{ minWidth: 0 }}>
                  <p className="kb-section-label">{section.label}</p>
                  {!isOpen && (
                    <p className="kb-preview">
                      {preview || <span className="kb-preview-empty">Empty — click to add content</span>}
                    </p>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                {lineCount > 0 && <span className="kb-line-count">{lineCount} lines</span>}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); if (confirm(`Remove "${section.label}"?`)) removeSection(section.key) }}
                  className="remove-btn"
                  style={{ fontSize: 11 }}
                >
                  Remove
                </button>
                <span className="kb-chevron" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
              </div>
            </div>

            <div className="kb-body" style={{ maxHeight: isOpen ? '4000px' : '0', opacity: isOpen ? 1 : 0, paddingBottom: isOpen ? 20 : 0 }}>
              <div style={{ padding: '0 20px' }}>
                <textarea
                  value={section.content}
                  onChange={(e) => updateSection(section.key, e.target.value)}
                  placeholder={`Enter ${section.label.toLowerCase()} details here…`}
                  rows={rows}
                  style={inputStyle}
                  onFocus={focusStyle}
                  onBlur={blurStyle}
                />
                <p style={{ fontSize: 11, color: '#2e2e2e', marginTop: 6 }}>
                  Edit directly — your agent uses this content to answer questions.
                </p>
              </div>
            </div>
          </div>
        )
      })}

      {/* Add section */}
      {addingSection ? (
        <div className="kb-card" style={{ padding: '16px 20px' }}>
          <p style={{ fontSize: 13, color: '#ededed', marginBottom: 10, fontWeight: 500 }}>New section name</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              ref={addInputRef}
              value={newSectionLabel}
              onChange={(e) => setNewSectionLabel(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); confirmAddSection() } if (e.key === 'Escape') { setAddingSection(false); setNewSectionLabel('') } }}
              placeholder="e.g. Seasonal Promotions, Membership Plans…"
              style={{ ...inputStyle, fontFamily: 'inherit', flex: 1 }}
              onFocus={focusStyle}
              onBlur={blurStyle}
              autoFocus
            />
            <button type="button" onClick={confirmAddSection} className="btn-primary" style={{ padding: '8px 16px', fontSize: 13, flexShrink: 0 }}>Add</button>
            <button type="button" onClick={() => { setAddingSection(false); setNewSectionLabel('') }} className="btn-ghost" style={{ padding: '8px 12px' }}>Cancel</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setAddingSection(true)} className="add-faq-btn">
          + Add Section
        </button>
      )}

      {/* FAQs */}
      <div className="kb-card" style={{ animationDelay: `${0.04 * sections.length}s` }}>
        <div className="kb-card-header" onClick={() => toggleSection('faqs')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="kb-dot" style={{ background: '#7c3aed' }} />
            <div>
              <p className="kb-section-label">FAQs</p>
              {!openSections.has('faqs') && (
                <p className="kb-preview">
                  {faqs.length > 0 ? `${faqs.length} question${faqs.length !== 1 ? 's' : ''} · ${faqs[0]?.question?.slice(0, 50) ?? ''}…` : <span className="kb-preview-empty">No questions yet</span>}
                </p>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {faqs.length > 0 && <span className="kb-faq-count">{faqs.length}</span>}
            <span className="kb-chevron" style={{ transform: openSections.has('faqs') ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
          </div>
        </div>

        <div className="kb-body" style={{ maxHeight: openSections.has('faqs') ? '99999px' : '0', opacity: openSections.has('faqs') ? 1 : 0, paddingBottom: openSections.has('faqs') ? 20 : 0 }}>
          <div style={{ padding: '0 20px' }} className="space-y-3">
            <p style={{ fontSize: 12, color: '#3a3a3a', marginBottom: 12 }}>
              Common questions and the exact answers your agent will use.
            </p>
            {faqs.length === 0 && (
              <p style={{ color: '#333', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>No FAQs yet.</p>
            )}
            {faqs.map((faq, idx) => (
              <div key={faq.id} className="faq-card" style={{ animationDelay: `${0.03 * idx}s` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#7c3aed' }}>#{idx + 1}</span>
                  <button type="button" onClick={() => removeFaq(faq.id)} className="remove-btn">Remove</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div>
                    <label style={{ fontSize: 11, color: '#444', display: 'block', marginBottom: 4 }}>Question</label>
                    <input value={faq.question} onChange={(e) => updateFaq(faq.id, 'question', e.target.value)} placeholder="What is your cancellation policy?" style={{ ...inputStyle, fontFamily: 'inherit' }} onFocus={focusStyle} onBlur={blurStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: '#444', display: 'block', marginBottom: 4 }}>Answer</label>
                    <textarea value={faq.answer} onChange={(e) => updateFaq(faq.id, 'answer', e.target.value)} placeholder="Free cancellation with 24+ hours notice…" rows={3} style={{ ...inputStyle, fontFamily: 'inherit' }} onFocus={focusStyle} onBlur={blurStyle} />
                  </div>
                </div>
              </div>
            ))}
            <button type="button" onClick={addFaq} className="add-faq-btn">+ Add Question</button>
          </div>
        </div>
      </div>

      {/* Save */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingTop: 4 }}>
        <button type="submit" disabled={saving} className="btn-primary" style={{ padding: '12px 28px', fontSize: 14 }}>
          {saving ? 'Saving…' : 'Save & sync to assistant'}
        </button>
        <p style={{ fontSize: 12, color: '#444' }}>Changes push to your live agent instantly.</p>
      </div>
    </form>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const css = `
  @keyframes fadeSlideUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
  @keyframes spin { to { transform:rotate(360deg) } }

  .kb-card { background:#0f0f0f; border:1px solid #1a1a1a; border-radius:12px; overflow:hidden; transition:border-color 0.2s ease,box-shadow 0.2s ease; animation:fadeSlideUp 0.25s ease both; }
  .kb-card:hover { border-color:#222; box-shadow:0 4px 24px rgba(0,0,0,0.25); }
  .kb-card-header { width:100%; display:flex; align-items:center; justify-content:space-between; padding:16px 20px; background:none; border:none; cursor:pointer; text-align:left; transition:background 0.15s ease; gap:12px; }
  .kb-card-header:hover { background:rgba(255,255,255,0.015); }
  .kb-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; margin-top:1px; }
  .kb-section-label { font-size:14px; font-weight:600; color:#ededed; margin:0; line-height:1.3; }
  .kb-preview { font-size:12px; color:#444; margin:3px 0 0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:480px; }
  .kb-preview-empty { color:#2e2e2e; font-style:italic; }
  .kb-line-count { font-size:11px; font-weight:500; color:#3a3a3a; background:#141414; border:1px solid #1e1e1e; padding:2px 8px; border-radius:99px; }
  .kb-faq-count { font-size:11px; font-weight:600; color:#7c3aed; background:rgba(124,58,237,0.1); border:1px solid rgba(124,58,237,0.2); padding:2px 8px; border-radius:99px; min-width:28px; text-align:center; }
  .kb-chevron { font-size:14px; color:#444; transition:transform 0.25s ease; display:inline-block; }
  .kb-body { overflow:hidden; transition:max-height 0.35s ease,opacity 0.25s ease,padding-bottom 0.25s ease; }
  .faq-card { background:#090909; border:1px solid #1a1a1a; border-radius:10px; padding:14px; transition:border-color 0.18s ease; animation:fadeSlideUp 0.2s ease both; }
  .faq-card:hover { border-color:#232323; }
  .add-faq-btn { width:100%; padding:12px; font-size:13px; font-weight:500; border-radius:10px; cursor:pointer; background:#090909; border:1px dashed #2a2a2a; color:#555; transition:all 0.18s ease; font-family:inherit; }
  .add-faq-btn:hover { border-color:#2563eb; color:#60a5fa; box-shadow:0 0 16px rgba(37,99,235,0.08); }
  .remove-btn { background:none; border:none; cursor:pointer; font-size:12px; padding:4px 8px; border-radius:6px; color:#444; font-family:inherit; transition:color 0.15s ease,background 0.15s ease; }
  .remove-btn:hover { color:#f87171; background:rgba(248,113,113,0.08); }
  .btn-primary { background:#2563eb; color:#fff; border:none; border-radius:8px; font-weight:500; cursor:pointer; font-family:inherit; transition:background 0.15s ease,box-shadow 0.15s ease,transform 0.1s ease,opacity 0.15s ease; }
  .btn-primary:hover:not(:disabled) { background:#1d4ed8; box-shadow:0 0 24px rgba(37,99,235,0.4); transform:translateY(-1px); }
  .btn-primary:active:not(:disabled) { transform:scale(0.97); }
  .btn-primary:disabled { opacity:0.55; cursor:not-allowed; }
  .btn-ghost { background:transparent; border:1px solid #2a2a2a; border-radius:8px; font-size:12px; font-weight:500; cursor:pointer; color:#555; font-family:inherit; transition:all 0.15s ease; }
  .btn-ghost:hover:not(:disabled) { border-color:rgba(37,99,235,0.4); color:#60a5fa; box-shadow:0 0 12px rgba(37,99,235,0.1); }
  .btn-ghost:disabled { opacity:0.5; cursor:not-allowed; }
  .kb-loading-card { background:#0f0f0f; border:1px solid #1a1a1a; border-radius:12px; padding:32px 28px; display:flex; align-items:flex-start; gap:20px; }
  .kb-spinner { width:20px; height:20px; border:2px solid #1f1f1f; border-top-color:#2563eb; border-radius:50%; animation:spin 0.8s linear infinite; flex-shrink:0; margin-top:2px; }
  .kb-error-card { background:#0f0f0f; border:1px solid rgba(248,113,113,0.15); border-radius:12px; padding:28px; }
`
