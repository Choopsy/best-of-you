'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { calcRecipeNutrition, fetchCiqual, roundNutrients, scale, NUTRIENT_KEYS, type Nutrients } from '@/lib/nutrition'
import { loadRecipe } from '@/lib/recipes'
import { isISODate } from '@/lib/dates'
import { checkQuantity, eatenGrams, nutrientFactor, type PortionInfo } from '@/lib/portions'
import { MEALS, type Meal } from '@/lib/types'
import { parseMealImport } from '@/lib/meal-import'
import { canImportMeals } from '@/lib/features'
import { getFridge, getHouseholdId } from '@/lib/household'
import { applyUse, propose, recipeConsumed, restoreMove, type Consumed, type FridgeMove, type FridgeProposal, type FridgeUse } from '@/lib/fridge-use'

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

function refreshFridge() {
  revalidatePath('/frigo')
  revalidatePath('/courses')
}

/**
 * Applique au frigo les retraits confirmés à l'écran et renvoie ce qu'il faudra remettre
 * si l'entrée est supprimée. Les règles du frigo (foyer) s'appliquent : un article
 * d'un autre foyer n'est simplement pas trouvé.
 */
async function applyFridgeUses(supabase: Awaited<ReturnType<typeof createClient>>, uses: FridgeUse[] | undefined): Promise<FridgeMove[]> {
  const list = (uses ?? []).filter((u) => typeof u?.itemId === 'string').slice(0, 30)
  if (!list.length) return []
  const { data: rows } = await supabase.from('fridge_items')
    .select('id, name, ciqual_code, custom_food_id, quantity, unit, expires_on').in('id', list.map((u) => u.itemId))
  const moves: FridgeMove[] = []
  for (const use of list) {
    const row = rows?.find((r) => r.id === use.itemId)
    if (!row) continue
    const item = { ...row, quantity: row.quantity != null ? Number(row.quantity) : null }
    const effect = applyUse(item, { itemId: use.itemId, amount: use.amount != null ? Number(use.amount) : null, finish: !!use.finish })
    if (!effect) continue
    const { error } = effect.remove
      ? await supabase.from('fridge_items').delete().eq('id', item.id)
      : await supabase.from('fridge_items').update({ quantity: effect.quantity }).eq('id', item.id)
    if (!error) moves.push(effect.move)
  }
  if (moves.length) refreshFridge()
  return moves
}

/** Garde les retraits avec l'entrée du journal (pour les annuler à la suppression) */
async function saveMoves(supabase: Awaited<ReturnType<typeof createClient>>, logId: string, moves: FridgeMove[]) {
  if (moves.length) await supabase.from('food_logs').update({ fridge_moves: moves }).eq('id', logId)
}

export type ProposalInput =
  | { kind: 'food'; code?: string; customId?: string; grams?: number; portions?: number }
  | { kind: 'recipe'; recipeId: string; servings: number }

/** Ce que le frigo pourrait fournir pour cet ajout (affiché coché sous le bouton « Ajouter ») */
export async function fridgeProposals(input: ProposalInput): Promise<FridgeProposal[]> {
  const { supabase, user } = await auth()
  if (!user) return []
  const items = await getFridge(supabase)
  if (!items.length) return []
  let consumed: Consumed[] = []
  if (input.kind === 'food') {
    const grams = input.grams != null ? Number(input.grams) : null
    const portions = input.portions != null ? Number(input.portions) : null
    if (input.customId) {
      const { data: f } = await supabase.from('custom_foods').select('name, portion_grams').eq('id', input.customId).maybeSingle()
      if (!f) return []
      consumed = [{ name: f.name, customFoodId: input.customId, grams, count: portions, portionGrams: f.portion_grams != null ? Number(f.portion_grams) : null }]
    } else if (input.code) {
      const food = (await fetchCiqual(supabase, [input.code])).get(input.code)
      if (!food) return []
      consumed = [{ name: food.name, ciqualCode: input.code, grams, count: portions }]
    }
  } else {
    if (!(input.servings > 0 && input.servings <= 20)) return []
    const recipe = await loadRecipe(supabase, input.recipeId)
    if (!recipe) return []
    consumed = recipeConsumed(recipe.ingredient_groups.flatMap((g) => g.ingredients), input.servings, recipe.base_servings ?? 1)
  }
  return propose(items, consumed)
}

function checkCommon(date: string, meal: string): string | null {
  if (!isISODate(date)) return 'Date invalide.'
  if (!MEALS.includes(meal as Meal)) return 'Repas invalide.'
  return null
}

type FoodInput = {
  /** Quantité en grammes… */ grams?: number
  /** …ou en portions (aliments enregistrés avec une portion) */ portions?: number
  /** Aliment Ciqual */ code?: string
  /** Produit enregistré (code-barres ou saisi à la main) */ customId?: string
}

/** Ligne du journal pour un aliment et une quantité (sans user_id, date ni repas), ou un message d'erreur. */
async function foodRow(supabase: Awaited<ReturnType<typeof createClient>>, input: FoodInput) {
  const unit = input.portions != null ? 'portion' as const : 'g' as const
  const amount = Number(unit === 'portion' ? input.portions : input.grams)

  let label: string
  // Valeurs enregistrées : pour 100 g, ou pour 1 portion (portion.perPortion)
  let values: Nutrients
  let portion: PortionInfo = { perPortion: false, portionGrams: null }
  if (input.customId) {
    const { data: food } = await supabase.from('custom_foods')
      .select(`name, brand, per_portion, portion_grams, ${NUTRIENT_KEYS.join(', ')}`).eq('id', input.customId).maybeSingle()
    if (!food) return { error: 'Produit introuvable.' }
    const f = food as unknown as Record<string, unknown>
    label = f.brand ? `${f.name} (${f.brand})` : String(f.name)
    values = Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, Number(f[k] ?? 0)])) as Nutrients
    portion = { perPortion: !!f.per_portion, portionGrams: f.portion_grams != null ? Number(f.portion_grams) : null }
  } else if (input.code) {
    const food = (await fetchCiqual(supabase, [input.code])).get(input.code)
    if (!food) return { error: 'Aliment introuvable dans la base Ciqual.' }
    label = food.name
    values = food.per100
  } else {
    return { error: 'Choisis un aliment.' }
  }

  const bad = checkQuantity(portion, unit, amount)
  if (bad) return { error: bad, label }
  const factor = nutrientFactor(portion, unit, amount)
  if (factor == null) return { error: 'Quantité impossible pour cet aliment.', label }
  return {
    row: {
      ciqual_code: input.customId ? null : input.code,
      custom_food_id: input.customId ?? null,
      label,
      grams: eatenGrams(portion, unit, amount),
      servings: unit === 'portion' ? amount : null,
      ...roundNutrients(scale(values, factor)),
    },
  }
}

export async function addFoodToLog(input: FoodInput & {
  date: string; meal: Meal
  /** Retraits du frigo confirmés à l'écran */ fridge?: FridgeUse[]
}): Promise<Result> {
  const { supabase, user } = await auth()
  if (!user) return { error: 'Non connecté' }
  const bad = checkCommon(input.date, input.meal)
  if (bad) return { error: bad }
  const built = await foodRow(supabase, input)
  if ('error' in built) return { error: built.error ?? 'Erreur lors de l\'ajout.' }
  const { data: log, error } = await supabase.from('food_logs').insert({
    user_id: user.id, eaten_on: input.date, meal: input.meal, ...built.row,
  }).select('id').single()
  if (error || !log) return { error: error?.message ?? 'Erreur lors de l\'ajout.' }
  await saveMoves(supabase, log.id, await applyFridgeUses(supabase, input.fridge))
  refresh()
  return { error: null }
}

/**
 * Plusieurs aliments d'un coup (photo du repas, après vérification à l'écran).
 * Chaque ligne est recalculée ici depuis Ciqual ou le produit du foyer : rien ne vient de l'IA.
 */
export async function addFoodsToLog(input: { date: string; meal: Meal; items: { code?: string; customId?: string; grams: number }[] }): Promise<Result & { count?: number }> {
  const { supabase, user } = await auth()
  if (!user) return { error: 'Non connecté' }
  const bad = checkCommon(input.date, input.meal)
  if (bad) return { error: bad }
  const items = Array.isArray(input.items) ? input.items : []
  if (!items.length) return { error: 'Aucun aliment à ajouter.' }
  if (items.length > 20) return { error: '20 aliments maximum.' }
  const rows = []
  for (const it of items) {
    const built = await foodRow(supabase, it.customId ? { customId: String(it.customId), grams: Number(it.grams) } : { code: String(it.code ?? ''), grams: Number(it.grams) })
    // Plusieurs lignes : on dit laquelle pose problème
    if ('error' in built) return { error: 'label' in built ? `${built.label} : ${built.error}` : built.error ?? 'Erreur lors de l\'ajout.' }
    rows.push({ user_id: user.id, eaten_on: input.date, meal: input.meal, ...built.row })
  }
  const { error } = await supabase.from('food_logs').insert(rows)
  if (error) return { error: error.message }
  refresh()
  return { error: null, count: rows.length }
}

/** « Ajouter à nouveau » : recopie une entrée du journal (mêmes quantités) à une autre date / un autre repas. */
export async function addAgain(input: { logId: string; date: string; meal: Meal }): Promise<Result> {
  const { supabase, user } = await auth()
  if (!user) return { error: 'Non connecté' }
  const bad = checkCommon(input.date, input.meal)
  if (bad) return { error: bad }
  const { data: src } = await supabase.from('food_logs').select('*').eq('id', input.logId).eq('user_id', user.id).maybeSingle()
  if (!src) return { error: 'Entrée introuvable.' }
  // Sans les retraits du frigo : supprimer la copie ne doit rien remettre au frigo
  const { id: _id, created_at: _c, fridge_moves: _f, ...copy } = src
  void _id; void _c; void _f
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
  const copies = rows.map(({ id, created_at, fridge_moves, ...r }) => ({ ...r, eaten_on: input.to }))
  const { error } = await supabase.from('food_logs').insert(copies)
  if (error) return { error: error.message }
  refresh()
  return { error: null }
}

export async function addRecipeToLog(input: { date: string; meal: Meal; recipeId: string; servings: number; fridge?: FridgeUse[] }): Promise<Result> {
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
  const { data: log, error } = await supabase.from('food_logs').insert({
    user_id: user.id,
    eaten_on: input.date,
    meal: input.meal,
    recipe_id: recipe.id,
    label: recipe.title,
    servings: input.servings,
    ...n,
  }).select('id').single()
  if (error || !log) return { error: error?.message ?? 'Erreur lors de l\'ajout.' }
  await saveMoves(supabase, log.id, await applyFridgeUses(supabase, input.fridge))
  refresh()
  return { error: null }
}

export async function deleteFoodLog(id: string): Promise<Result> {
  const { supabase, user } = await auth()
  if (!user) return { error: 'Non connecté' }
  const { data: log } = await supabase.from('food_logs').select('fridge_moves').eq('id', id).eq('user_id', user.id).maybeSingle()
  const { error } = await supabase.from('food_logs').delete().eq('id', id).eq('user_id', user.id)
  if (error) return { error: error.message }

  // L'effet inverse : ce que l'entrée avait retiré du frigo y revient
  const moves = (Array.isArray(log?.fridge_moves) ? log.fridge_moves : []) as FridgeMove[]
  if (moves.length) {
    const household_id = await getHouseholdId(supabase)
    const { data: current } = await supabase.from('fridge_items').select('id, quantity').in('id', moves.map((m) => m.item_id))
    for (const m of moves) {
      const row = current?.find((c) => c.id === m.item_id)
      const back = restoreMove(m, row ? { quantity: row.quantity != null ? Number(row.quantity) : null } : null)
      if (!back) continue
      if ('update' in back) await supabase.from('fridge_items').update({ quantity: back.update }).eq('id', m.item_id)
      else if (household_id) await supabase.from('fridge_items').insert({ ...back.insert, household_id, added_by: user.id })
    }
    refreshFridge()
  }
  refresh()
  return { error: null }
}

/**
 * Import d'un repas depuis un fichier JSON : le texte brut est relu ici (jamais l'aperçu du navigateur).
 * La date et le repas choisis à l'écran priment sur ceux du fichier.
 */
export async function importMealFile(input: { text: string; date: string; meal: Meal }): Promise<Result & { count?: number }> {
  const { supabase, user } = await auth()
  if (!user) return { error: 'Non connecté' }
  if (!canImportMeals(user.id)) return { error: 'Import non disponible.' }
  const bad = checkCommon(input.date, input.meal)
  if (bad) return { error: bad }
  const parsed = parseMealImport(String(input.text ?? ''))
  if (!parsed.ok) return { error: parsed.error }

  const rows = parsed.items.map((i) => ({
    user_id: user.id, eaten_on: input.date, meal: input.meal,
    label: i.label, grams: i.grams, servings: i.servings, ...i.nutrients,
  }))
  const { error } = await supabase.from('food_logs').insert(rows)
  if (error) return { error: error.message }
  refresh()
  return { error: null, count: rows.length }
}
