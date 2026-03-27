import { createAdminClient } from './supabase/admin'

/**
 * Fetch a client row by the authenticated user's ID.
 * Uses the service role (bypasses RLS) with an explicit user_id filter.
 * This is the correct pattern for all server-side data access in this app.
 */
export async function getClientByUserId(userId: string) {
  const admin = createAdminClient()
  const { data: client } = await admin
    .from('clients')
    .select('*')
    .eq('user_id', userId)
    .single()
  return client
}
