import { createAdminClient } from './supabase/admin'

export async function logActivity(opts: {
  action: string
  clientId?: string | null
  clientName?: string | null
  details?: string | null
}) {
  try {
    const admin = createAdminClient()
    await admin.from('activity_log').insert({
      action: opts.action,
      client_id: opts.clientId ?? null,
      client_name: opts.clientName ?? null,
      details: opts.details ?? null,
    })
  } catch {
    // Non-fatal — don't break the main operation if logging fails
  }
}
