import { createClient } from '@/lib/supabase/server'
import { getClientByUserId } from '@/lib/get-client'
import { redirect } from 'next/navigation'
import SettingsForm from './settings-form'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const client = await getClientByUserId(user.id)

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: '#ededed' }}>Settings</h1>
        <p className="text-sm mt-1" style={{ color: '#555' }}>Account and notification preferences.</p>
      </div>
      <SettingsForm
        businessName={client?.business_name ?? ''}
        email={client?.email ?? user.email ?? ''}
      />
    </div>
  )
}
