'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { activityByKey, netKcal } from '@/lib/activities'
import { getHealthContext } from '@/lib/health'
import { isISODate, todayISO } from '@/lib/dates'

type Result = { error: string | null; kcal?: number }

function refresh() {
  for (const p of ['/forme', '/journal', '/']) revalidatePath(p)
}

export async function addActivity(input: { date: string; key: string; durationMin: number }): Promise<Result> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }
  if (!isISODate(input.date) || input.date > todayISO()) return { error: 'Date invalide.' }
  const type = activityByKey(input.key)
  if (!type) return { error: 'Activité inconnue.' }
  const minutes = Math.round(input.durationMin)
  if (!(minutes >= 1 && minutes <= 600)) return { error: 'Durée entre 1 et 600 minutes.' }

  // Métabolisme de base de la personne (sinon 1 kcal/kg/h, valeur standard du MET)
  const ctx = await getHealthContext(supabase, user.id)
  const bmr = ctx.targets?.bmr ?? (ctx.weightKg ? ctx.weightKg * 24 : null)
  if (!bmr) return { error: 'Indique ton poids dans ton profil santé pour estimer la dépense.' }

  const kcal = netKcal(type.met, minutes, bmr)
  const { error } = await supabase.from('activities').insert({
    user_id: user.id, done_on: input.date, activity_key: type.key, label: type.label,
    duration_min: minutes, met: type.met, kcal_net: kcal,
  })
  if (error) return { error: error.message }
  refresh()
  return { error: null, kcal }
}

export async function deleteActivity(id: string): Promise<Result> {
  const supabase = await createClient()
  const { error } = await supabase.from('activities').delete().eq('id', id)
  if (error) return { error: error.message }
  refresh()
  return { error: null }
}

export async function addWeight(input: { date: string; kg: number }): Promise<Result> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }
  if (!isISODate(input.date) || input.date > todayISO()) return { error: 'Date invalide.' }
  if (!(input.kg >= 30 && input.kg <= 300)) return { error: 'Poids entre 30 et 300 kg.' }
  const { error } = await supabase.from('weight_logs').upsert(
    { user_id: user.id, logged_on: input.date, weight_kg: Math.round(input.kg * 10) / 10 },
    { onConflict: 'user_id,logged_on' },
  )
  if (error) return { error: error.message }
  refresh()
  revalidatePath('/profile/health')
  return { error: null }
}

export async function deleteWeight(id: string): Promise<Result> {
  const supabase = await createClient()
  const { error } = await supabase.from('weight_logs').delete().eq('id', id)
  if (error) return { error: error.message }
  refresh()
  return { error: null }
}
