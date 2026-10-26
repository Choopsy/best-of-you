import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Valeurs nutritionnelles, à partir de la table Ciqual (ANSES).
 * Les valeurs Ciqual sont données pour 100 g d'aliment.
 */

export const NUTRIENT_KEYS = [
  'energy_kcal', 'proteins_g', 'carbs_g', 'sugars_g',
  'fat_g', 'saturated_fat_g', 'fiber_g', 'salt_g',
] as const

export type NutrientKey = (typeof NUTRIENT_KEYS)[number]
export type Nutrients = Record<NutrientKey, number>

export const NUTRIENT_LABELS: Record<NutrientKey, { label: string; unit: string }> = {
  energy_kcal:     { label: 'Énergie',      unit: 'kcal' },
  proteins_g:      { label: 'Protéines',    unit: 'g' },
  carbs_g:         { label: 'Glucides',     unit: 'g' },
  sugars_g:        { label: 'dont sucres',  unit: 'g' },
  fat_g:           { label: 'Lipides',      unit: 'g' },
  saturated_fat_g: { label: 'dont saturés', unit: 'g' },
  fiber_g:         { label: 'Fibres',       unit: 'g' },
  salt_g:          { label: 'Sel',          unit: 'g' },
}

export const zero = (): Nutrients =>
  Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, 0])) as Nutrients

export function scale(n: Nutrients, ratio: number): Nutrients {
  return Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, n[k] * ratio])) as Nutrients
}

export function sum(list: Nutrients[]): Nutrients {
  const acc = zero()
  for (const n of list) for (const k of NUTRIENT_KEYS) acc[k] += n[k] ?? 0
  return acc
}

export function roundNutrients(n: Nutrients): Nutrients {
  return Object.fromEntries(
    NUTRIENT_KEYS.map((k) => [k, k === 'energy_kcal' ? Math.round(n[k]) : Math.round(n[k] * 10) / 10]),
  ) as Nutrients
}

// ── Conversion des quantités en grammes ──────────────────────────────────────

/** Unités qui ne sont pas des poids : l'utilisateur peut indiquer un poids total. */
export const UNITS = [
  'g', 'kg', 'mg', 'ml', 'cl', 'dl', 'L', 'c.c', 'c.s', 'pincée',
  'pièce', 'tasse', 'verre', 'sachet', 'yaourt', 'botte', 'tranche', 'feuille', 'gousse', 'brin', '',
] as const

const EXACT: Record<string, number> = { g: 1, kg: 1000, mg: 0.001 }
// Volumes : densité ≈ 1 (eau, lait, bouillon). Cuillères : moyennes usuelles.
const APPROX: Record<string, number> = { ml: 1, cl: 10, dl: 100, l: 1000, 'c.s': 15, 'c.c': 5, 'pincée': 0.4 }

export function needsWeight(unit: string | null | undefined): boolean {
  const u = (unit ?? '').toLowerCase().trim()
  return !(u in EXACT) && !(u in APPROX)
}

export function toGrams(
  amount: number | null,
  unit: string | null,
  weightG?: number | null,
): { grams: number; approx: boolean } | null {
  if (weightG && weightG > 0) return { grams: weightG, approx: false }
  if (amount == null || amount <= 0) return null
  const u = (unit ?? '').toLowerCase().trim()
  if (u in EXACT) return { grams: amount * EXACT[u], approx: false }
  if (u in APPROX) return { grams: amount * APPROX[u], approx: true }
  return null
}

// ── Lecture Ciqual ───────────────────────────────────────────────────────────

/**
 * Quand Ciqual ne donne pas l'énergie d'un aliment, on l'estime à partir des
 * macronutriments avec les coefficients du règlement UE 1169/2011 (annexe XIV) :
 * protéines 4, glucides 4, lipides 9, fibres 2 kcal/g. Null si aucune macro connue.
 */
export function estimateKcal(row: { proteins_g?: unknown; carbs_g?: unknown; fat_g?: unknown; fiber_g?: unknown }): number | null {
  const vals = [row.proteins_g, row.carbs_g, row.fat_g, row.fiber_g]
  if (vals.every((v) => v == null)) return null
  const n = (v: unknown) => Number(v ?? 0) || 0
  return Math.round(4 * n(row.proteins_g) + 4 * n(row.carbs_g) + 9 * n(row.fat_g) + 2 * n(row.fiber_g))
}

const COLS = NUTRIENT_KEYS.join(',')

export async function fetchCiqual(
  supabase: SupabaseClient,
  codes: string[],
): Promise<Map<string, { name: string; per100: Nutrients }>> {
  const unique = [...new Set(codes.filter(Boolean))]
  const map = new Map<string, { name: string; per100: Nutrients }>()
  if (unique.length === 0) return map
  const { data } = await supabase
    .from('canonical_ingredients')
    .select(`ciqual_code,name_fr,${COLS}`)
    .in('ciqual_code', unique)
  for (const row of (data ?? []) as unknown as Array<Record<string, unknown>>) {
    const per100 = zero()
    for (const k of NUTRIENT_KEYS) per100[k] = Number(row[k] ?? 0) || 0
    if (row.energy_kcal == null) per100.energy_kcal = estimateKcal(row) ?? 0
    map.set(String(row.ciqual_code), { name: String(row.name_fr), per100 })
  }
  return map
}

// ── Nutrition d'une recette ──────────────────────────────────────────────────

export interface NutritionIngredient {
  name: string
  amount: number | null
  unit: string | null
  ciqual_code: string | null
  weight_g: number | null
}

export interface RecipeNutrition {
  perServing: Nutrients
  counted: number
  total: number
  approximate: boolean
  /** Ingrédients non comptés, avec la raison */
  missing: { name: string; reason: 'not_linked' | 'no_quantity' }[]
}

/** Calcul à partir d'une table Ciqual déjà chargée (pour traiter plusieurs recettes d'un coup). */
export function computeRecipeNutrition(
  ingredients: NutritionIngredient[],
  baseServings: number,
  ciqual: Map<string, { name: string; per100: Nutrients }>,
): RecipeNutrition | null {
  const list = ingredients.filter((i) => i.name?.trim())
  if (list.length === 0) return null

  const parts: Nutrients[] = []
  const missing: RecipeNutrition['missing'] = []
  let approximate = false

  for (const ing of list) {
    const food = ing.ciqual_code ? ciqual.get(ing.ciqual_code) : undefined
    if (!food) { missing.push({ name: ing.name, reason: 'not_linked' }); continue }
    const g = toGrams(ing.amount, ing.unit, ing.weight_g)
    if (!g) { missing.push({ name: ing.name, reason: 'no_quantity' }); continue }
    if (g.approx) approximate = true
    parts.push(scale(food.per100, g.grams / 100))
  }

  if (parts.length === 0) return null
  const servings = baseServings > 0 ? baseServings : 1
  return {
    perServing: roundNutrients(scale(sum(parts), 1 / servings)),
    counted: parts.length,
    total: list.length,
    approximate,
    missing,
  }
}

export async function calcRecipeNutrition(
  supabase: SupabaseClient,
  ingredients: NutritionIngredient[],
  baseServings: number,
): Promise<RecipeNutrition | null> {
  const ciqual = await fetchCiqual(supabase, ingredients.map((i) => i.ciqual_code ?? ''))
  return computeRecipeNutrition(ingredients, baseServings, ciqual)
}
