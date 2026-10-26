import { createClient } from '@/lib/supabase/server'
import { NavContent } from './nav-content'

export async function AppNav() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: profile }, { count: pendingCount }] = await Promise.all([
    supabase.from('profiles').select('full_name, avatar_url').eq('id', user.id).maybeSingle(),
    supabase
      .from('friendships')
      .select('*', { count: 'exact', head: true })
      .eq('addressee_id', user.id)
      .eq('status', 'pending'),
  ])

  return (
    <NavContent
      avatarUrl={profile?.avatar_url ?? null}
      fullName={profile?.full_name ?? null}
      pendingFriendsCount={pendingCount ?? 0}
    />
  )
}
