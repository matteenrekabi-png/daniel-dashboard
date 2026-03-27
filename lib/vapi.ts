const VAPI_BASE = 'https://api.vapi.ai'

export async function vapiRequest(path: string, method: string, body?: unknown) {
  const res = await fetch(`${VAPI_BASE}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`VAPI ${method} ${path} failed (${res.status}): ${text}`)
  }

  return res.json()
}

export async function createVapiAssistant(params: {
  agentName: string
  businessName: string
  personalityStyle: string
  systemPrompt: string
}) {
  return vapiRequest('/assistant', 'POST', {
    name: `${params.businessName} — ${params.agentName}`,
    model: {
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      messages: [
        { role: 'system', content: params.systemPrompt },
      ],
    },
    voice: {
      provider: '11labs',
      voiceId: 'rachel',
    },
    firstMessage: `Thanks for calling ${params.businessName}, this is ${params.agentName}! How can I help you?`,
    transcriber: {
      provider: 'deepgram',
      model: 'nova-2',
      language: 'en-US',
    },
    endCallFunctionEnabled: true,
    recordingEnabled: true,
  })
}

export async function updateVapiAssistantPrompt(assistantId: string, systemPrompt: string) {
  // Fetch current state so we preserve provider, model name, and tools
  const current = await vapiRequest(`/assistant/${assistantId}`, 'GET')
  const currentModel = current.model ?? {}

  // Rebuild messages: replace system message, keep any others
  const existingMessages: { role: string; content: string }[] = currentModel.messages ?? []
  const otherMessages = existingMessages.filter((m) => m.role !== 'system')
  const updatedMessages = [{ role: 'system', content: systemPrompt }, ...otherMessages]

  return vapiRequest(`/assistant/${assistantId}`, 'PATCH', {
    model: {
      ...currentModel,
      messages: updatedMessages,
    },
  })
}

export async function getVapiCalls(assistantId: string, limit = 50) {
  return vapiRequest(`/call?assistantId=${assistantId}&limit=${limit}`, 'GET')
}

// ─── Knowledge base file management ─────────────────────────────────────────

/** Upload a text file to VAPI and return the new file ID. */
export async function uploadVapiKbFile(content: string, filename: string): Promise<string> {
  const formData = new FormData()
  const blob = new Blob([content], { type: 'text/plain' })
  formData.append('file', blob, filename)
  formData.append('purpose', 'assistant')

  const res = await fetch(`${VAPI_BASE}/file`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.VAPI_API_KEY}` },
    body: formData,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`VAPI file upload failed (${res.status}): ${text.slice(0, 200)}`)
  }

  const data = await res.json()
  return data.id as string
}

/** Replace the KB file on an assistant, preserving all other model properties. */
export async function updateVapiKbFileId(assistantId: string, newFileId: string) {
  const current = await vapiRequest(`/assistant/${assistantId}`, 'GET')
  const currentModel = current.model ?? {}
  return vapiRequest(`/assistant/${assistantId}`, 'PATCH', {
    model: {
      ...currentModel,
      knowledgeBase: { provider: 'google', fileIds: [newFileId] },
    },
  })
}
