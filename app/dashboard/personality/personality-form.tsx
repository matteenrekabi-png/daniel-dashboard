'use client'

import { useState } from 'react'
import { toast } from 'sonner'

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
}

const PERSONALITY_OPTIONS: { value: PersonalityStyle; label: string; desc: string; icon: string }[] = [
  { value: 'friendly', label: 'Friendly', desc: 'Warm, caring, and approachable', icon: '☀' },
  { value: 'professional', label: 'Professional', desc: 'Composed, polished, business-first', icon: '◆' },
  { value: 'casual', label: 'Casual', desc: 'Relaxed and conversational', icon: '◎' },
]

const PACE_OPTIONS: { value: SpeakingPace; label: string; desc: string }[] = [
  { value: 'slow', label: 'Slow', desc: 'Takes time between thoughts' },
  { value: 'normal', label: 'Normal', desc: 'Natural, comfortable pace' },
  { value: 'fast', label: 'Fast', desc: 'Efficient and to the point' },
]

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

export default function PersonalityForm({ personality, vapiAssistantId, currentPrompt }: Props) {
  const [agentName, setAgentName] = useState(personality?.agent_name ?? 'Jordan')
  const [style, setStyle] = useState<PersonalityStyle>(personality?.personality_style ?? 'friendly')
  const [pace, setPace] = useState<SpeakingPace>(personality?.speaking_pace ?? 'normal')
  const [greeting, setGreeting] = useState(personality?.custom_greeting ?? '')
  const [saving, setSaving] = useState(false)

  const [showPromptEditor, setShowPromptEditor] = useState(false)
  const [rawPrompt, setRawPrompt] = useState(currentPrompt)
  const [savingPrompt, setSavingPrompt] = useState(false)
  const [promptConfirmed, setPromptConfirmed] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/personality', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentName, personalityStyle: style, speakingPace: pace, customGreeting: greeting }),
    })
    const data = await res.json()
    if (!res.ok) toast.error(data.error ?? 'Failed to save')
    else toast.success('Personality saved and pushed to your assistant')
    setSaving(false)
  }

  async function handleSavePrompt() {
    if (!promptConfirmed) { toast.error('Check the confirmation box before saving.'); return }
    setSavingPrompt(true)
    const res = await fetch('/api/personality/prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: rawPrompt }),
    })
    const data = await res.json()
    if (!res.ok) toast.error(data.error ?? 'Failed to save prompt')
    else { toast.success('Prompt saved and pushed to your assistant'); setPromptConfirmed(false) }
    setSavingPrompt(false)
  }

  return (
    <div className="space-y-6">
      <style>{`
        @keyframes fadeSlideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0); }
          50%       { box-shadow: 0 0 16px 4px rgba(37, 99, 235, 0.25); }
        }
        .animate-fade-slide { animation: fadeSlideDown 0.22s ease both; }
        .btn-primary {
          background: #2563eb;
          color: #fff;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease, opacity 0.15s ease;
        }
        .btn-primary:hover:not(:disabled) {
          background: #1d4ed8;
          box-shadow: 0 0 20px rgba(37,99,235,0.45);
          transform: translateY(-1px);
        }
        .btn-primary:active:not(:disabled) { transform: scale(0.97); }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-danger {
          background: #7f1d1d;
          color: #f87171;
          border: 1px solid #991b1b;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease, opacity 0.15s ease;
        }
        .btn-danger:hover:not(:disabled) {
          background: #991b1b;
          box-shadow: 0 0 20px rgba(239,68,68,0.3);
          transform: translateY(-1px);
        }
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
          display: flex; align-items: center; gap: 10px;
          padding: 14px 20px; border-radius: 12px; width: 100%;
          background: linear-gradient(135deg, #0f0f0f 0%, #0a0a0a 100%);
          border: 1px solid #2a2a2a;
          cursor: pointer;
          transition: background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, transform 0.12s ease;
        }
        .prompt-btn:hover {
          border-color: #2563eb44;
          background: linear-gradient(135deg, #111827 0%, #0f172a 100%);
          box-shadow: 0 0 24px rgba(37,99,235,0.12), inset 0 1px 0 rgba(255,255,255,0.03);
          transform: translateY(-1px);
        }
        .prompt-btn.open {
          border-color: #2563eb66;
          background: linear-gradient(135deg, #1e3a5f22 0%, #1e3a5f11 100%);
          box-shadow: 0 0 24px rgba(37,99,235,0.15);
        }
        .prompt-btn:active { transform: scale(0.99); }
      `}</style>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Agent name */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wider" style={{ color: '#555' }}>Agent Name</label>
          <input
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            placeholder="Jordan"
            required
            style={inputStyle}
            onFocus={(e) => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)' }}
            onBlur={(e) => { e.target.style.borderColor = '#1f1f1f'; e.target.style.boxShadow = 'none' }}
          />
          <p className="text-xs" style={{ color: '#444' }}>The name your receptionist uses on calls.</p>
        </div>

        {/* Personality style */}
        <div className="space-y-3">
          <label className="text-xs font-medium uppercase tracking-wider" style={{ color: '#555' }}>Personality Style</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PERSONALITY_OPTIONS.map((opt) => (
              <div key={opt.value} onClick={() => setStyle(opt.value)} className={`option-card${style === opt.value ? ' selected' : ''}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span style={{ fontSize: 14, opacity: 0.7 }}>{opt.icon}</span>
                  <p className="font-semibold text-sm" style={{ color: style === opt.value ? '#60a5fa' : '#ededed' }}>{opt.label}</p>
                </div>
                <p className="text-xs" style={{ color: '#555' }}>{opt.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Speaking pace */}
        <div className="space-y-3">
          <label className="text-xs font-medium uppercase tracking-wider" style={{ color: '#555' }}>Speaking Pace</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PACE_OPTIONS.map((opt) => (
              <div key={opt.value} onClick={() => setPace(opt.value)} className={`option-card${pace === opt.value ? ' selected' : ''}`}>
                <p className="font-semibold text-sm" style={{ color: pace === opt.value ? '#60a5fa' : '#ededed' }}>{opt.label}</p>
                <p className="text-xs mt-1" style={{ color: '#555' }}>{opt.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Custom greeting */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wider" style={{ color: '#555' }}>
            Custom Greeting <span style={{ color: '#333', textTransform: 'none', letterSpacing: 0, fontSize: 11 }}>(optional)</span>
          </label>
          <textarea
            value={greeting}
            onChange={(e) => setGreeting(e.target.value)}
            placeholder={`Thanks for calling [Business Name], this is ${agentName}! How can I help you?`}
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
            onFocus={(e) => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)' }}
            onBlur={(e) => { e.target.style.borderColor = '#1f1f1f'; e.target.style.boxShadow = 'none' }}
          />
          <p className="text-xs" style={{ color: '#444' }}>Leave blank to use the default greeting.</p>
        </div>

        <button type="submit" disabled={saving} className="btn-primary px-6 py-3">
          {saving ? 'Saving…' : 'Save & push to assistant'}
        </button>
      </form>

      {/* Edit System Prompt — prominent card button */}
      <div style={{ borderTop: '1px solid #1a1a1a' }} className="pt-6 space-y-4">
        <button type="button" onClick={() => setShowPromptEditor(!showPromptEditor)} className={`prompt-btn${showPromptEditor ? ' open' : ''}`}>
          <div
            style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: showPromptEditor ? 'rgba(37,99,235,0.15)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${showPromptEditor ? '#2563eb44' : '#2a2a2a'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, transition: 'all 0.18s ease',
            }}
          >
            {showPromptEditor ? '✕' : '⌥'}
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold" style={{ color: showPromptEditor ? '#60a5fa' : '#ededed' }}>
              Edit System Prompt
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#555' }}>
              Advanced — directly edit the raw instructions your agent follows
            </p>
          </div>
          <div style={{ color: '#333', fontSize: 12, transition: 'transform 0.2s ease', transform: showPromptEditor ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            ▾
          </div>
        </button>

        {showPromptEditor && (
          <div className="animate-fade-slide space-y-4">
            {/* Warning banner */}
            <div
              className="rounded-xl p-4"
              style={{ background: 'linear-gradient(135deg, #1a0808 0%, #120808 100%)', border: '1px solid #7f1d1d', boxShadow: '0 0 20px rgba(127,29,29,0.15)' }}
            >
              <p className="text-sm font-semibold mb-1" style={{ color: '#f87171' }}>⚠ Proceed with extreme caution</p>
              <p className="text-xs leading-relaxed" style={{ color: '#888' }}>
                You are editing the raw system prompt that controls everything your AI agent does. A single mistake can break
                your agent on live calls. Only edit if you know exactly what you are doing — when in doubt, contact support.
              </p>
            </div>

            <textarea
              value={rawPrompt}
              onChange={(e) => setRawPrompt(e.target.value)}
              rows={22}
              spellCheck={false}
              style={{
                ...inputStyle,
                fontFamily: 'monospace',
                fontSize: 11,
                lineHeight: 1.7,
                resize: 'vertical',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
              }}
              onFocus={(e) => { e.target.style.borderColor = '#7f1d1d'; e.target.style.boxShadow = '0 0 0 3px rgba(239,68,68,0.08)' }}
              onBlur={(e) => { e.target.style.borderColor = '#1f1f1f'; e.target.style.boxShadow = 'none' }}
            />

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={promptConfirmed}
                onChange={(e) => setPromptConfirmed(e.target.checked)}
                className="mt-0.5"
                style={{ accentColor: '#ef4444' }}
              />
              <span className="text-xs leading-relaxed" style={{ color: '#666' }}>
                I understand that editing this prompt incorrectly can break my live agent and affect real calls.
              </span>
            </label>

            <button
              type="button"
              onClick={handleSavePrompt}
              disabled={savingPrompt || !promptConfirmed}
              className="btn-danger px-6 py-3 w-full"
            >
              {savingPrompt ? 'Saving…' : 'Save prompt — I know what I\'m doing'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
