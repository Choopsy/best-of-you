import type { SupabaseClient } from '@supabase/supabase-js'
import type { Ingredient } from './types'

export interface NutritionSummary {
  energy_kcal:      number
  proteins_g:       number
  carbs_g:          number
  sugars_g:         number
  fat_g:            number
  saturated_fat_g:  number
  fiber_g:          number
  salt_g:           number
  matched: number
  total:   number
}

// Convertit une quantité + unité en grammes (null = unité inconnue)
function toGrams(amount: number, unit: string | null): number | null {
  const u = unit?.toLowerCase().trim() ?? ''
  switch (u) {
    case 'g':   return amount
    case 'kg':  return amount * 1000
    case 'mg':  return amount / 1000
    case 'ml':  return amount           // densité ≈ 1 pour la plupart des liquides
    case 'cl':  return amount * 10
    case 'dl':  return amount * 100
    case 'l':   return amount * 1000
    default:    return null             // unité, c. à soupe, pincée… non convertibles
  }
}

const ZERO: Omit<NutritionSummary, 'matched' | 'total'> = {
  energy_kcal: 0, proteins_g: 0, carbs_g: 0, sugars_g: 0,
  fat_g: 0, saturated_fat_g: 0, fiber_g: 0, salt_g: 0,
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function add(acc: typeof ZERO, row: any, ratio: number) {
  const n = (k: string) => (typeof row[k] === 'number' ? row[k] * ratio : 0)
  acc.energy_kcal     += n('energy_kcal')
  acc.proteins_g      += n('proteins_g')
  acc.carbs_g         += n('carbs_g')
  acc.sugars_g        += n('sugars_g')
  acc.fat_g           += n('fat_g')
  acc.saturated_fat_g += n('saturated_fat_g')
  acc.fiber_g         += n('fiber_g')
  acc.salt_g          += n('salt_g')
}

export async function calcRecipeNutrition(
  supabase: SupabaseClient,
  ingredients: Ingredient[],
  baseServings: number,
): Promise<NutritionSummary | null> {
  if (ingredients.length === 0) return null

  const totals = { ...ZERO }
  let matched = 0

  await Promise.all(
    ingredients.map(async (ing) => {
      if (!ing.name?.trim()) return

      const grams = ing.amount != null ? toGrams(ing.amount, ing.unit) : null

      const { data } = await supabase
        .from('canonical_ingredients')
        .select('energy_kcal,proteins_g,carbs_g,sugars_g,fat_g,saturated_fat_g,fiber_g,salt_g')
        .textSearch('name_fr', ing.name.trim(), { type: 'plain', config: 'french' })
        .limit(1)
        .maybeSingle()

      if (!data) return
      matched++

      // ratio = quantité en grammes / 100 (valeurs CIQUAL sont pour 100 g)
      const ratio = grams != null ? grams / 100 : 1
      add(totals, data, ratio)
    }),
  )

  if (matched === 0) return null

  const perServing = baseServings > 0 ? baseServings : 1
  const round = (v: number) => Math.round(v / perServing * 10) / 10

  return {
    energy_kcal:     Math.round(totals.energy_kcal / perServing),
    proteins_g:      round(totals.proteins_g),
    carbs_g:         round(totals.carbs_g),
    sugars_g:        round(totals.sugars_g),
    fat_g:           round(totals.fat_g),
    saturated_fat_g: round(totals.saturated_fat_g),
    fiber_g:         round(totals.fiber_g),
    salt_g:          round(totals.salt_g),
    matched,
    total: ingredients.length,
  }
}
