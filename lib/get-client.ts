import { cookies } from 'next/headers'
import { createAdminClient } from './supabase/admin'

const ADMIN_EMAIL = 'matteenrekabi@superior-ai.org'

/**
 * Fetch a client row by the authenticated user's ID.
 * If the user is admin and an admin_view_client_id cookie is set,
 * returns that client instead (allows admin to operate as any client).
 */
export async function getClientByUserId(userId: string) {
  const admin = createAdminClient()

  // Admin override: check if admin is viewing a specific client
  const { data: authUser } = await admin.auth.admin.getUserById(userId)
  const isAdmin = authUser?.user?.email === ADMIN_EMAIL

  if (isAdmin) {
    const cookieStore = await cookies()
    const viewClientId = cookieStore.get('admin_view_client_id')?.value
    if (viewClientId) {
      const { data: viewClient } = await admin
        .from('clients')
        .select('*')
        .eq('id', viewClientId)
        .single()
      if (viewClient) return viewClient
    }
    return null
  }

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
