import type { SupabaseClient } from '@supabase/supabase-js'
import { NUTRIENT_KEYS, sum, zero, type Nutrients } from './nutrition'
import type { FoodLog, PickableRecipe } from './types'
import { shiftDate } from './dates'

export async function getDayLogs(supabase: SupabaseClient, userId: string, date: string) {
  const { data } = await supabase
    .from('food_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('eaten_on', date)
    .order('created_at')
  const logs = (data ?? []) as FoodLog[]
  const totals: Nutrients = logs.length
    ? sum(logs.map((l) => Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, Number(l[k])])) as Nutrients))
    : zero()
  return { logs, totals }
}

/** Recettes proposées dans le journal : les miennes puis mes favoris. */
export async function getPickableRecipes(supabase: SupabaseClient, userId: string): Promise<PickableRecipe[]> {
  const [{ data: mine }, { data: liked }] = await Promise.all([
    supabase.from('recipes').select('id, title, cover_image_url').eq('author_id', userId).order('title'),
    supabase.from('recipe_likes').select('recipes ( id, title, cover_image_url )').eq('user_id', userId),
  ])
  const list: PickableRecipe[] = [...(mine ?? [])]
  const seen = new Set(list.map((r) => r.id))
  for (const row of (liked ?? []) as unknown as { recipes: PickableRecipe | null }[]) {
    if (row.recipes && !seen.has(row.recipes.id)) { list.push(row.recipes); seen.add(row.recipes.id) }
  }
  return list
}

/** Calories des 7 derniers jours (du plus ancien à aujourd'hui). */
export async function getWeekTotals(supabase: SupabaseClient, userId: string, today: string) {
  const from = shiftDate(today, -6)
  const { data } = await supabase
    .from('food_logs')
    .select('eaten_on, energy_kcal')
    .eq('user_id', userId)
    .gte('eaten_on', from)
    .lte('eaten_on', today)
  const byDay = new Map<string, number>()
  for (const r of data ?? []) byDay.set(r.eaten_on, (byDay.get(r.eaten_on) ?? 0) + Number(r.energy_kcal))
  return Array.from({ length: 7 }, (_, i) => {
    const date = shiftDate(from, i)
    return { date, kcal: byDay.get(date) ?? 0 }
  })
}

export interface RecentEntry {
  logId: string
  label: string
  detail: string
  kcal: number
}

/** Entrées récentes (30 jours), sans doublon : pour « Ajouter à nouveau ». */
export async function getRecentEntries(supabase: SupabaseClient, userId: string, today: string, limit = 12): Promise<RecentEntry[]> {
  const { data } = await supabase
    .from('food_logs')
    .select('id, label, servings, grams, energy_kcal, created_at')
    .eq('user_id', userId)
    .gte('eaten_on', shiftDate(today, -30))
    .order('created_at', { ascending: false })
    .limit(150)
  const seen = new Set<string>()
  const out: RecentEntry[] = []
  for (const r of data ?? []) {
    const detail = r.servings != null
      ? `${Number(r.servings).toLocaleString('fr-FR')} portion${Number(r.servings) > 1 ? 's' : ''}`
      : r.grams != null ? `${Math.round(Number(r.grams))} g` : ''
    const key = `${r.label}|${detail}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ logId: r.id, label: r.label, detail, kcal: Math.round(Number(r.energy_kcal)) })
    if (out.length >= limit) break
  }
  return out
}
