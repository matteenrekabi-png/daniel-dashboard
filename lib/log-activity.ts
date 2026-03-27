import { createAdminClient } from './supabase/admin'

export async function logActivity(opts: {
  action: string
  clientId?: string | null
  clientName?: string | null
  details?: string | null
  beforeSnapshot?: string | null
  afterSnapshot?: string | null
  changeType?: string | null
}) {
  try {
    const admin = createAdminClient()
    await admin.from('activity_log').insert({
      action: opts.action,
      client_id: opts.clientId ?? null,
      client_name: opts.clientName ?? null,
      details: opts.details ?? null,
      before_snapshot: opts.beforeSnapshot ?? null,
      after_snapshot: opts.afterSnapshot ?? null,
      change_type: opts.changeType ?? null,
    })
  } catch {
    // Non-fatal
  }
}
