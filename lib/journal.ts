import type { SupabaseClient } from '@supabase/supabase-js'
import { NUTRIENT_KEYS, sum, zero, type Nutrients } from './nutrition'
import type { FoodLog, PickableRecipe } from './types'

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
