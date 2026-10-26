import type { SupabaseClient } from '@supabase/supabase-js'
import { shiftDate } from './dates'

export interface FridgeItem {
  id: string
  name: string
  ciqual_code: string | null
  quantity: number | null
  unit: string | null
  expires_on: string | null
  created_at: string
}

/** Identifiant du foyer de l'utilisateur (créé au besoin). */
export async function getHouseholdId(supabase: SupabaseClient): Promise<string | null> {
  const { data, error } = await supabase.rpc('ensure_household')
  if (error) return null
  return data as string
}

export async function getFridge(supabase: SupabaseClient): Promise<FridgeItem[]> {
  const { data } = await supabase
    .from('fridge_items')
    .select('id, name, ciqual_code, quantity, unit, expires_on, created_at')
    .order('expires_on', { ascending: true, nullsFirst: false })
    .order('name')
  return ((data ?? []) as FridgeItem[]).map((f) => ({ ...f, quantity: f.quantity != null ? Number(f.quantity) : null }))
}

/** Aliments périmés ou qui périment dans les `days` prochains jours. */
export async function getExpiringSoon(supabase: SupabaseClient, today: string, days = 2) {
  const { data } = await supabase
    .from('fridge_items')
    .select('id, name, expires_on')
    .not('expires_on', 'is', null)
    .lte('expires_on', shiftDate(today, days))
    .order('expires_on')
  return (data ?? []) as { id: string; name: string; expires_on: string }[]
}
