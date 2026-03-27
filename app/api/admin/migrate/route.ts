import { NextResponse } from 'next/server'

const ADMIN_EMAIL = 'matteenrekabi@superior-ai.org'

// Extracts the project ref from NEXT_PUBLIC_SUPABASE_URL
// e.g. https://abcdefgh.supabase.co → abcdefgh
function getProjectRef() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const match = url.match(/https:\/\/([^.]+)\.supabase\.co/)
  return match?.[1] ?? null
}

async function runSQL(projectRef: string, token: string, query: string) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  })
  const body = await res.json()
  return { ok: res.ok, body }
}

export async function POST(request: Request) {
  if (request.headers.get('x-admin-email') !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = process.env.SUPABASE_ACCESS_TOKEN
  if (!token) {
    return NextResponse.json(
      { error: 'SUPABASE_ACCESS_TOKEN env var is not set. Add your Supabase personal access token to Railway.' },
      { status: 500 }
    )
  }

  const projectRef = getProjectRef()
  if (!projectRef) {
    return NextResponse.json({ error: 'Could not extract project ref from NEXT_PUBLIC_SUPABASE_URL' }, { status: 500 })
  }

  const statements = [
    { name: 'Add is_active', sql: `ALTER TABLE clients ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE` },
    { name: 'Add admin_notes', sql: `ALTER TABLE clients ADD COLUMN IF NOT EXISTS admin_notes TEXT` },
    { name: 'Add announcement', sql: `ALTER TABLE clients ADD COLUMN IF NOT EXISTS announcement TEXT` },
    {
      name: 'Create activity_log',
      sql: `CREATE TABLE IF NOT EXISTS activity_log (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        action TEXT NOT NULL,
        client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
        client_name TEXT,
        details TEXT
      )`,
    },
    {
      name: 'Create client_users',
      sql: `CREATE TABLE IF NOT EXISTS client_users (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(client_id, user_id)
      )`,
    },
  ]

  const results = []
  for (const s of statements) {
    const { ok, body } = await runSQL(projectRef, token, s.sql)
    results.push({ name: s.name, ok, detail: ok ? 'done' : JSON.stringify(body) })
  }

  const allOk = results.every((r) => r.ok)
  return NextResponse.json({ success: allOk, results }, { status: allOk ? 200 : 207 })
}
