import { createAdminClient } from './supabase/admin'

/**
 * Fetch a client row by the authenticated user's ID.
 * Checks the primary user_id first, then the client_users table
 * (for additional users who share a dashboard).
 * Uses the service role (bypasses RLS) with an explicit filter.
 */
export async function getClientByUserId(userId: string) {
  const admin = createAdminClient()

  // Primary owner
  const { data: client } = await admin
    .from('clients')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (client) return client

  // Additional user linked to a client
  const { data: link } = await admin
    .from('client_users')
    .select('client_id')
    .eq('user_id', userId)
    .single()

  if (!link) return null

  const { data: linkedClient } = await admin
    .from('clients')
    .select('*')
    .eq('id', link.client_id)
    .single()

  return linkedClient ?? null
}
