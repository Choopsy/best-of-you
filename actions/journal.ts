'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { calcRecipeNutrition, fetchCiqual, roundNutrients, scale, NUTRIENT_KEYS, type Nutrients } from '@/lib/nutrition'
import { loadRecipe } from '@/lib/recipes'
import { isISODate } from '@/lib/dates'
import { MEALS, type Meal } from '@/lib/types'

type Result = { error: string | null }

function refresh() {
  revalidatePath('/journal')
  revalidatePath('/')
}

async function auth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
}

function checkCommon(date: string, meal: string): string | null {
  if (!isISODate(date)) return 'Date invalide.'
  if (!MEALS.includes(meal as Meal)) return 'Repas invalide.'
  return null
}

export async function addFoodToLog(input: {
  date: string; meal: Meal; grams: number
  /** Aliment Ciqual */ code?: string
  /** Produit enregistré (code-barres ou saisi à la main) */ customId?: string
}): Promise<Result> {
  const { supabase, user } = await auth()
  if (!user) return { error: 'Non connecté' }
  const bad = checkCommon(input.date, input.meal)
  if (bad) return { error: bad }
  if (!(input.grams > 0 && input.grams <= 5000)) return { error: 'Quantité entre 1 et 5 000 g.' }

  let label: string
  let per100: Nutrients
  if (input.customId) {
    const { data: food } = await supabase.from('custom_foods')
      .select(`name, brand, ${NUTRIENT_KEYS.join(', ')}`).eq('id', input.customId).maybeSingle()
    if (!food) return { error: 'Produit introuvable.' }
    const f = food as unknown as Record<string, unknown>
    label = f.brand ? `${f.name} (${f.brand})` : String(f.name)
    per100 = Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, Number(f[k] ?? 0)])) as Nutrients
  } else if (input.code) {
    const food = (await fetchCiqual(supabase, [input.code])).get(input.code)
    if (!food) return { error: 'Aliment introuvable dans la base Ciqual.' }
    label = food.name
    per100 = food.per100
  } else {
    return { error: 'Choisis un aliment.' }
  }

  const n = roundNutrients(scale(per100, input.grams / 100))
  const { error } = await supabase.from('food_logs').insert({
    user_id: user.id,
    eaten_on: input.date,
    meal: input.meal,
    ciqual_code: input.customId ? null : input.code,
    custom_food_id: input.customId ?? null,
    label,
    grams: input.grams,
    ...n,
  })
  if (error) return { error: error.message }
  refresh()
  return { error: null }
}

/** « Ajouter à nouveau » : recopie une entrée du journal (mêmes quantités) à une autre date / un autre repas. */
export async function addAgain(input: { logId: string; date: string; meal: Meal }): Promise<Result> {
  const { supabase, user } = await auth()
  if (!user) return { error: 'Non connecté' }
  const bad = checkCommon(input.date, input.meal)
  if (bad) return { error: bad }
  const { data: src } = await supabase.from('food_logs').select('*').eq('id', input.logId).eq('user_id', user.id).maybeSingle()
  if (!src) return { error: 'Entrée introuvable.' }
  const { id: _id, created_at: _c, ...copy } = src
  void _id; void _c
  const { error } = await supabase.from('food_logs').insert({ ...copy, eaten_on: input.date, meal: input.meal })
  if (error) return { error: error.message }
  refresh()
  return { error: null }
}

/** « Comme hier » : recopie tout un repas d'un jour sur un autre. */
export async function copyMeal(input: { from: string; to: string; meal: Meal }): Promise<Result> {
  const { supabase, user } = await auth()
  if (!user) return { error: 'Non connecté' }
  const bad = checkCommon(input.to, input.meal) ?? checkCommon(input.from, input.meal)
  if (bad) return { error: bad }
  const { data: rows } = await supabase.from('food_logs').select('*')
    .eq('user_id', user.id).eq('eaten_on', input.from).eq('meal', input.meal)
  if (!rows?.length) return { error: 'Rien à recopier.' }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const copies = rows.map(({ id, created_at, ...r }) => ({ ...r, eaten_on: input.to }))
  const { error } = await supabase.from('food_logs').insert(copies)
  if (error) return { error: error.message }
  refresh()
  return { error: null }
}

export async function addRecipeToLog(input: { date: string; meal: Meal; recipeId: string; servings: number }): Promise<Result> {
  const { supabase, user } = await auth()
  if (!user) return { error: 'Non connecté' }
  const bad = checkCommon(input.date, input.meal)
  if (bad) return { error: bad }
  if (!(input.servings > 0 && input.servings <= 20)) return { error: 'Nombre de portions invalide.' }

  const recipe = await loadRecipe(supabase, input.recipeId)
  if (!recipe) return { error: 'Recette introuvable.' }

  const nutrition = await calcRecipeNutrition(
    supabase,
    recipe.ingredient_groups.flatMap((g) => g.ingredients),
    recipe.base_servings ?? 1,
  )
  if (!nutrition) {
    return { error: 'Aucun ingrédient de cette recette n\'est lié à la base Ciqual : impossible de calculer ses valeurs nutritionnelles.' }
  }

  const n = roundNutrients(scale(nutrition.perServing, input.servings))
  const { error } = await supabase.from('food_logs').insert({
    user_id: user.id,
    eaten_on: input.date,
    meal: input.meal,
    recipe_id: recipe.id,
    label: recipe.title,
    servings: input.servings,
    ...n,
  })
  if (error) return { error: error.message }
  refresh()
  return { error: null }
}

export async function deleteFoodLog(id: string): Promise<Result> {
  const { supabase, user } = await auth()
  if (!user) return { error: 'Non connecté' }
  const { error } = await supabase.from('food_logs').delete().eq('id', id).eq('user_id', user.id)
  if (error) return { error: error.message }
  refresh()
  return { error: null }
}
