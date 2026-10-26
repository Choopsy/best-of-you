import { getSession } from '@/lib/auth'
import { NavContent } from './nav-content'
import { getExpiringSoon } from '@/lib/household'
import { todayISO } from '@/lib/dates'

export async function AppNav() {
  const { supabase, user } = await getSession()
  if (!user) return null

  const [{ data: profile }, { count: pendingCount }, expiring, { count: invites }] = await Promise.all([
    supabase.from('profiles').select('full_name, avatar_url').eq('id', user.id).maybeSingle(),
    supabase
      .from('friendships')
      .select('*', { count: 'exact', head: true })
      .eq('addressee_id', user.id)
      .eq('status', 'pending'),
    getExpiringSoon(supabase, todayISO()),
    supabase.from('household_invites').select('*', { count: 'exact', head: true }).eq('invited_user_id', user.id),
  ])

  return (
    <NavContent
      avatarUrl={profile?.avatar_url ?? null}
      fullName={profile?.full_name ?? null}
      pendingFriendsCount={pendingCount ?? 0}
      kitchenAlerts={expiring.length + (invites ?? 0)}
    />
  )
}
