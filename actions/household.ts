'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getHouseholdId } from '@/lib/household'

type Result = { error: string | null }

function refreshAll() {
  for (const p of ['/foyer', '/frigo', '/semaine', '/courses', '/']) revalidatePath(p)
}

export async function inviteToHousehold(friendId: string): Promise<Result> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }
  const household_id = await getHouseholdId(supabase)
  if (!household_id) return { error: 'Foyer introuvable.' }
  const { error } = await supabase.from('household_invites').insert({ household_id, invited_user_id: friendId, invited_by: user.id })
  if (error) return { error: error.code === '23505' ? 'Invitation déjà envoyée.' : 'Tu ne peux inviter que tes amis.' }
  revalidatePath('/foyer')
  return { error: null }
}

export async function cancelInvite(id: string): Promise<Result> {
  const supabase = await createClient()
  const { error } = await supabase.from('household_invites').delete().eq('id', id)
  if (error) return { error: error.message }
  refreshAll()
  return { error: null }
}

export async function acceptInvite(id: string): Promise<Result> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('accept_household_invite', { invite: id })
  if (error) return { error: error.message }
  refreshAll()
  return { error: null }
}

export async function leaveHousehold(): Promise<Result> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('leave_household')
  if (error) return { error: error.message }
  refreshAll()
  return { error: null }
}

export async function renameHousehold(name: string): Promise<Result> {
  const supabase = await createClient()
  const label = name.trim()
  if (!label || label.length > 60) return { error: 'Nom invalide.' }
  const household_id = await getHouseholdId(supabase)
  if (!household_id) return { error: 'Foyer introuvable.' }
  const { error } = await supabase.from('households').update({ name: label }).eq('id', household_id)
  if (error) return { error: error.message }
  refreshAll()
  return { error: null }
}
