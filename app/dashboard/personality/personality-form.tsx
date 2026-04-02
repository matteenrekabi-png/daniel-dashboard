'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import type { PromptSection } from '@/lib/gemini-prompt'

type PersonalityStyle = 'friendly' | 'professional' | 'casual'
type SpeakingPace = 'slow' | 'normal' | 'fast'

interface Props {
  personality: {
    id: string
    agent_name: string
    personality_style: PersonalityStyle
    speaking_pace: SpeakingPace
    custom_greeting: string | null
  } | null
  vapiAssistantId: string | null
  currentPrompt: string
  currentFirstMessage: string
}

const PERSONALITY_OPTIONS: { value: PersonalityStyle; label: string; desc: string; icon: string }[] = [
  { value: 'friendly',     label: 'Friendly',      desc: 'Warm, caring, and approachable',            icon: '☀' },
  { value: 'professional', label: 'Professional',   desc: 'Composed, polished, business-first',        icon: '◆' },
  { value: 'casual',       label: 'Casual',         desc: 'Relaxed and conversational',                icon: '◎' },
]

const PACE_OPTIONS: { value: SpeakingPace; label: string; desc: string }[] = [
  { value: 'slow',   label: 'Slow',   desc: 'Takes time between thoughts' },
  { value: 'normal', label: 'Normal', desc: 'Natural, comfortable pace'   },
  { value: 'fast',   label: 'Fast',   desc: 'Efficient and to the point'  },
]

const DOT_COLORS = ['#2563eb', '#0891b2', '#059669', '#d97706', '#9333ea', '#dc2626', '#0284c7', '#16a34a', '#ea580c']

const inputStyle: React.CSSProperties = {
  background: '#0a0a0a',
  border: '1px solid #1f1f1f',
  color: '#ededed',
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: 13,
  outline: 'none',
  width: '100%',
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
}

const focusIn = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  e.target.style.borderColor = '#2563eb'
  e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'
}
const focusOut = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  e.target.style.borderColor = '#1f1f1f'
  e.target.style.boxShadow = 'none'
}

export default function PersonalityForm({ personality, vapiAssistantId, currentPrompt, currentFirstMessage }: Props) {
  // ── Simple controls ─────────────────────────────────────────────────────────
  const [agentName, setAgentName]         = useState(personality?.agent_name ?? 'Jordan')
  const [savedName]                        = useState(personality?.agent_name ?? 'Jordan')
  const [style, setStyle]                 = useState<PersonalityStyle>(personality?.personality_style ?? 'friendly')
  const [pace, setPace]                   = useState<SpeakingPace>(personality?.speaking_pace ?? 'normal')
  const [firstMessage, setFirstMessage]   = useState(currentFirstMessage ?? personality?.custom_greeting ?? '')
  const [saving, setSaving]               = useState(false)

  // ── Behavior sections ────────────────────────────────────────────────────────
  const [sections, setSections]         = useState<PromptSection[]>([])
  const [sectionsLoading, setSectionsLoading] = useState(true)
  const [sectionsError, setSectionsError]     = useState<string | null>(null)
  const [openSections, setOpenSections]       = useState<Set<string>>(new Set())
  const [savingSections, setSavingSections]   = useState(false)
  const [sectionsDirty, setSectionsDirty]     = useState(false)

  // ── Advanced raw editor ──────────────────────────────────────────────────────
  const [showRawEditor, setShowRawEditor]   = useState(false)
  const [rawPrompt, setRawPrompt]           = useState(currentPrompt)
  const [savingRaw, setSavingRaw]           = useState(false)
  const [rawConfirmed, setRawConfirmed]     = useState(false)

  // Load behavior sections on mount
  useEffect(() => {
    if (!vapiAssistantId) { setSectionsLoading(false); return }
    fetch('/api/personality/sections')
      .then(r => r.json())
      .then((data: unknown) => {
        const d = data as { error?: string; sections?: PromptSection[] }
        if (d.error) { setSectionsError(d.error); return }
        const secs = d.sections ?? []
        setSections(secs)
        setOpenSections(new Set(secs.map(s => s.key)))
      })
      .catch(() => setSectionsError('Could not load behavior sections.'))
      .finally(() => setSectionsLoading(false))
  }, [vapiAssistantId])

  function toggleSection(key: string) {
    setOpenSections(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function updateSection(key: string, content: string) {
    setSections(prev => prev.map(s => s.key === key ? { ...s, content } : s))
    setSectionsDirty(true)
  }

  async function handleSaveSimple(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/personality', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentName, personalityStyle: style, speakingPace: pace, firstMessage }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error ?? 'Failed to save')
    } else {
      toast.success('Personality saved and pushed to your assistant')
      if (data.prompt) setRawPrompt(data.prompt)
      if (data.firstMessage) setFirstMessage(data.firstMessage)
    }
    setSaving(false)
  }

  async function handleSaveSections() {
    setSavingSections(true)
    const res = await fetch('/api/personality/sections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sections }),
    })
    const data = await res.json()
    if (!res.ok) toast.error(data.error ?? 'Save failed')
    else { toast.success('Behavior sections saved and pushed to your assistant'); setSectionsDirty(false) }
    setSavingSections(false)
  }

  async function handleSaveRaw() {
    if (!rawConfirmed) { toast.error('Check the confirmation box before saving.'); return }
    setSavingRaw(true)
    const res = await fetch('/api/personality/prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: rawPrompt }),
    })
    const data = await res.json()
    if (!res.ok) toast.error(data.error ?? 'Failed to save prompt')
    else { toast.success('Prompt saved and pushed to your assistant'); setRawConfirmed(false) }
    setSavingRaw(false)
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <style>{css}</style>

      {/* ── Simple controls ── */}
      <form onSubmit={handleSaveSimple} className="space-y-6">
        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wider" style={{ color: '#555' }}>Agent Name</label>
          <input
            value={agentName}
            onChange={e => setAgentName(e.target.value)}
            placeholder="Agent Name"
            required
            style={inputStyle}
            onFocus={focusIn}
            onBlur={focusOut}
          />
          <p className="text-xs" style={{ color: '#444' }}>The name your receptionist uses on calls.</p>
          {agentName.trim() && agentName.trim() !== savedName && (
            <p className="text-xs mt-1" style={{ color: '#f59e0b' }}>
              Remember to update the First Message below to use "{agentName.trim()}" as well.
            </p>
          )}
        </div>

        <div className="space-y-3">
          <label className="text-xs font-medium uppercase tracking-wider" style={{ color: '#555' }}>Personality Style</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PERSONALITY_OPTIONS.map(opt => (
              <div
                key={opt.value}
                onClick={() => setStyle(opt.value)}
                className={`option-card${style === opt.value ? ' selected' : ''}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span style={{ fontSize: 14, opacity: 0.7 }}>{opt.icon}</span>
                  <p className="font-semibold text-sm" style={{ color: style === opt.value ? '#60a5fa' : '#ededed' }}>{opt.label}</p>
                </div>
                <p className="text-xs" style={{ color: '#555' }}>{opt.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-xs font-medium uppercase tracking-wider" style={{ color: '#555' }}>Speaking Pace</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PACE_OPTIONS.map(opt => (
              <div
                key={opt.value}
                onClick={() => setPace(opt.value)}
                className={`option-card${pace === opt.value ? ' selected' : ''}`}
              >
                <p className="font-semibold text-sm" style={{ color: pace === opt.value ? '#60a5fa' : '#ededed' }}>{opt.label}</p>
                <p className="text-xs mt-1" style={{ color: '#555' }}>{opt.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wider" style={{ color: '#555' }}>First Message</label>
          <textarea
            value={firstMessage}
            onChange={e => setFirstMessage(e.target.value)}
            placeholder={`Hello, this is ${agentName} from [Business Name], how can I help you!`}
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
            onFocus={focusIn}
            onBlur={focusOut}
          />
          <p className="text-xs" style={{ color: '#444' }}>What your agent says at the very start of every call.</p>
        </div>

        <button type="submit" disabled={saving} className="btn-primary px-6 py-3">
          {saving ? 'Saving…' : 'Save & push to assistant'}
        </button>
      </form>

      {/* ── Behavior sections (KB-style) ── */}
      <div style={{ borderTop: '1px solid #1a1a1a' }} className="pt-8 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold" style={{ color: '#ededed' }}>Behavior Sections</p>
            <p className="text-xs mt-1" style={{ color: '#555' }}>
              How your agent thinks, talks, and handles calls — organized and editable.
            </p>
          </div>
          {sectionsDirty && !sectionsLoading && !sectionsError && (
            <span
              className="text-xs px-2.5 py-1 rounded-full font-medium shrink-0"
              style={{ background: '#1e3a5f22', color: '#60a5fa', border: '1px solid #2563eb33', animation: 'badgePop 0.3s ease both' }}
            >
              Unsaved changes
            </span>
          )}
        </div>

        {/* Loading state */}
        {sectionsLoading && (
          <div className="rounded-xl p-5 flex items-start gap-4" style={{ background: '#0f0f0f', border: '1px solid #1a1a1a' }}>
            <div className="ps-spinner" />
            <div>
              <p className="text-sm font-medium" style={{ color: '#ededed', marginBottom: 4 }}>
                Organizing your agent&apos;s instructions…
              </p>
              <p className="text-xs leading-relaxed" style={{ color: '#555' }}>
                Reading your current prompt and grouping it into editable sections. This only happens once.
              </p>
            </div>
          </div>
        )}

        {/* Error state */}
        {sectionsError && !sectionsLoading && (
          <div className="rounded-xl p-4" style={{ background: '#0f0f0f', border: '1px solid rgba(248,113,113,0.2)' }}>
            <p className="text-sm font-medium" style={{ color: '#f87171' }}>Could not load sections</p>
            <p className="text-xs mt-1" style={{ color: '#555' }}>{sectionsError}</p>
          </div>
        )}

        {/* Sections */}
        {!sectionsLoading && !sectionsError && sections.length > 0 && (
          <>
            {/* Warning banner */}
            <div
              className="rounded-xl p-4"
              style={{ background: 'linear-gradient(135deg, #1a0e00 0%, #120a00 100%)', border: '1px solid #78350f66' }}
            >
              <p className="text-xs font-semibold mb-1" style={{ color: '#fbbf24' }}>⚠ Any incorrect change can break your agent</p>
              <p className="text-xs leading-relaxed" style={{ color: '#777' }}>
                Every section directly controls how your agent thinks and responds on live calls.
                An error in <em>any</em> section — not just the ones marked sensitive — can cause your agent to behave incorrectly or stop working.
                Sections marked <span style={{ color: '#f87171' }}>sensitive</span> carry extra risk and should only be edited if you know exactly what you are changing.
              </p>
            </div>

            {sections.map((section, idx) => {
              const isOpen = openSections.has(section.key)
              const dotColor = DOT_COLORS[idx % DOT_COLORS.length]
              const rows = Math.max(5, Math.min(28, section.content.split('\n').length + 3))

              return (
                <div key={section.key} className="ps-card" style={{ animationDelay: `${0.04 * idx}s` }}>
                  <div className="ps-card-header" onClick={() => toggleSection(section.key)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                      <span className="ps-dot" style={{ background: dotColor }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <p className="ps-section-label">{section.label}</p>
                          {section.sensitive && (
                            <span
                              className="text-xs px-1.5 py-0.5 rounded font-medium"
                              style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)', fontSize: 10, animation: 'badgePop 0.35s ease both' }}
                            >
                              sensitive
                            </span>
                          )}
                        </div>
                        {!isOpen && (
                          <p className="ps-preview">
                            {section.content.split('\n')[0]?.trim() || <span style={{ color: '#2e2e2e', fontStyle: 'italic' }}>Empty</span>}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="ps-chevron" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
                  </div>

                  <div
                    className="ps-body"
                    style={{ maxHeight: isOpen ? '4000px' : '0', opacity: isOpen ? 1 : 0, paddingBottom: isOpen ? 20 : 0 }}
                  >
                    <div style={{ padding: '4px 20px 0' }}>
                      {section.sensitive && (
                        <div
                          className="rounded-lg p-3 mb-3"
                          style={{ background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.15)' }}
                        >
                          <p className="text-xs" style={{ color: '#888' }}>
                            <span style={{ color: '#f87171', fontWeight: 600 }}>Caution:</span> This section controls a core part of how your agent handles calls. Small changes can have big effects. Edit with care.
                          </p>
                        </div>
                      )}
                      <textarea
                        value={section.content}
                        onChange={e => updateSection(section.key, e.target.value)}
                        rows={rows}
                        style={{
                          ...inputStyle,
                          fontFamily: 'inherit',
                          fontSize: 13,
                          lineHeight: '1.7',
                          resize: 'vertical',
                        }}
                        onFocus={e => { e.target.style.borderColor = section.sensitive ? '#7f1d1d' : '#2563eb'; e.target.style.boxShadow = `0 0 0 3px ${section.sensitive ? 'rgba(239,68,68,0.08)' : 'rgba(37,99,235,0.1)'}` }}
                        onBlur={focusOut}
                      />
                      <p style={{ fontSize: 11, color: '#2e2e2e', marginTop: 6 }}>
                        Your agent uses this content to guide how it handles calls.
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingTop: 4 }}>
              <button
                type="button"
                onClick={handleSaveSections}
                disabled={savingSections || !sectionsDirty}
                className="btn-primary"
                style={{ padding: '12px 28px', fontSize: 14, opacity: sectionsDirty ? 1 : 0.45 }}
              >
                {savingSections ? 'Saving…' : 'Save behavior sections'}
              </button>
              <p style={{ fontSize: 12, color: '#444' }}>Pushes to your live agent instantly.</p>
            </div>
          </>
        )}

        {!sectionsLoading && !sectionsError && sections.length === 0 && vapiAssistantId && (
          <div className="rounded-xl p-4" style={{ background: '#0f0f0f', border: '1px solid #1a1a1a' }}>
            <p className="text-xs" style={{ color: '#555' }}>No editable sections found in your current prompt.</p>
          </div>
        )}
      </div>

      {/* ── Advanced: raw prompt editor ── */}
      <div style={{ borderTop: '1px solid #1a1a1a' }} className="pt-6 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#444' }}>Advanced</p>
          <p className="text-xs mt-1" style={{ color: '#333' }}>For technical users only. Do not edit unless you know what you are doing.</p>
        </div>

        <button
          type="button"
          onClick={() => setShowRawEditor(!showRawEditor)}
          className={`prompt-btn${showRawEditor ? ' open' : ''}`}
        >
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: showRawEditor ? 'rgba(37,99,235,0.15)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${showRawEditor ? '#2563eb44' : '#2a2a2a'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, transition: 'all 0.18s ease',
          }}>
            {showRawEditor ? '✕' : '⌥'}
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold" style={{ color: showRawEditor ? '#60a5fa' : '#ededed' }}>
              Edit System Prompt
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#555' }}>
              Advanced — directly edit the raw instructions your agent follows
            </p>
          </div>
          <div style={{ color: '#333', fontSize: 12, transition: 'transform 0.2s ease', transform: showRawEditor ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            ▾
          </div>
        </button>

        {showRawEditor && (
          <div className="animate-fade-slide space-y-4">
            <div
              className="rounded-xl p-4"
              style={{ background: 'linear-gradient(135deg, #1a0808 0%, #120808 100%)', border: '1px solid #7f1d1d', boxShadow: '0 0 20px rgba(127,29,29,0.15)' }}
            >
              <p className="text-sm font-semibold mb-1" style={{ color: '#f87171' }}>⚠ Proceed with extreme caution</p>
              <p className="text-xs leading-relaxed" style={{ color: '#888' }}>
                You are editing the raw system prompt that controls everything your AI agent does. A single mistake can break
                your agent on live calls. Only edit if you know exactly what you are doing — when in doubt, use the Behavior Sections above instead.
              </p>
            </div>

            <textarea
              value={rawPrompt}
              onChange={e => setRawPrompt(e.target.value)}
              rows={22}
              spellCheck={false}
              style={{
                ...inputStyle,
                fontFamily: 'monospace',
                fontSize: 11,
                lineHeight: 1.7,
                resize: 'vertical',
              }}
              onFocus={e => { e.target.style.borderColor = '#7f1d1d'; e.target.style.boxShadow = '0 0 0 3px rgba(239,68,68,0.08)' }}
              onBlur={focusOut}
            />

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={rawConfirmed}
                onChange={e => setRawConfirmed(e.target.checked)}
                className="mt-0.5"
                style={{ accentColor: '#ef4444' }}
              />
              <span className="text-xs leading-relaxed" style={{ color: '#666' }}>
                I understand that editing this prompt incorrectly can break my live agent and affect real calls.
              </span>
            </label>

            <button
              type="button"
              onClick={handleSaveRaw}
              disabled={savingRaw || !rawConfirmed}
              className="btn-danger px-6 py-3 w-full"
            >
              {savingRaw ? 'Saving…' : "Save prompt — I know what I'm doing"}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const css = `
  @keyframes fadeSlideDown {
    from { opacity: 0; transform: translateY(-8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes psCardIn {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .animate-fade-slide { animation: fadeSlideDown 0.22s ease both; }

  .btn-primary {
    background: #2563eb; color: #fff; border: none; border-radius: 8px;
    font-size: 13px; font-weight: 500; cursor: pointer;
    transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease, opacity 0.15s ease;
  }
  .btn-primary:hover:not(:disabled) { background: #1d4ed8; box-shadow: 0 0 20px rgba(37,99,235,0.45); transform: translateY(-1px); }
  .btn-primary:active:not(:disabled) { transform: scale(0.97); }
  .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }

  .btn-danger {
    background: #7f1d1d; color: #f87171; border: 1px solid #991b1b; border-radius: 8px;
    font-size: 13px; font-weight: 500; cursor: pointer;
    transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease, opacity 0.15s ease;
  }
  .btn-danger:hover:not(:disabled) { background: #991b1b; box-shadow: 0 0 20px rgba(239,68,68,0.3); transform: translateY(-1px); }
  .btn-danger:active:not(:disabled) { transform: scale(0.97); }
  .btn-danger:disabled { opacity: 0.5; cursor: not-allowed; color: #555; }

  .option-card {
    cursor: pointer; border-radius: 12px; padding: 16px;
    transition: background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, transform 0.12s ease;
    border: 1px solid #1a1a1a; background: #0f0f0f;
  }
  .option-card:hover { transform: translateY(-2px); border-color: #2a2a2a; box-shadow: 0 4px 20px rgba(0,0,0,0.4); }
  .option-card.selected {
    background: #1e3a5f; border-color: #2563eb;
    box-shadow: 0 0 0 1px rgba(37,99,235,0.2), 0 4px 20px rgba(37,99,235,0.15);
    transform: translateY(-1px);
  }

  .prompt-btn {
    display: flex; align-items: center; gap: 10px; padding: 14px 20px; border-radius: 12px; width: 100%;
    background: linear-gradient(135deg, #0f0f0f 0%, #0a0a0a 100%);
    border: 1px solid #2a2a2a; cursor: pointer;
    transition: background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, transform 0.12s ease;
  }
  .prompt-btn:hover { border-color: #2563eb44; background: linear-gradient(135deg, #111827 0%, #0f172a 100%); box-shadow: 0 0 24px rgba(37,99,235,0.12); transform: translateY(-1px); }
  .prompt-btn.open { border-color: #2563eb66; background: linear-gradient(135deg, #1e3a5f22 0%, #1e3a5f11 100%); box-shadow: 0 0 24px rgba(37,99,235,0.15); }
  .prompt-btn:active { transform: scale(0.99); }

  .ps-card {
    background: #0f0f0f; border: 1px solid #1a1a1a; border-radius: 12px; overflow: hidden;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
    animation: psCardIn 0.25s ease both;
  }
  .ps-card:hover { border-color: #222; box-shadow: 0 4px 24px rgba(0,0,0,0.25); }
  .ps-card-header {
    width: 100%; display: flex; align-items: center; justify-content: space-between;
    padding: 16px 20px; background: none; border: none; cursor: pointer; text-align: left;
    transition: background 0.15s ease; gap: 12px;
  }
  .ps-card-header:hover { background: rgba(255,255,255,0.015); }
  .ps-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; margin-top: 2px; }
  .ps-section-label { font-size: 14px; font-weight: 600; color: #ededed; margin: 0; }
  .ps-preview { font-size: 12px; color: #444; margin: 3px 0 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 380px; }
  .ps-chevron { font-size: 14px; color: #444; transition: transform 0.25s ease; display: inline-block; flex-shrink: 0; }
  .ps-body { overflow: hidden; transition: max-height 0.35s ease, opacity 0.25s ease, padding-bottom 0.25s ease; }

  .ps-spinner {
    width: 18px; height: 18px; border: 2px solid #1f1f1f; border-top-color: #2563eb;
    border-radius: 50%; animation: spin 0.8s linear infinite; flex-shrink: 0; margin-top: 2px;
  }
`
