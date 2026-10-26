/**
 * « Qu'est-ce qu'on mange ce soir ? » : classe les recettes selon ce qu'il y a
 * au frigo, en priorité celles qui utilisent un aliment qui va périmer.
 * Module pur, testé par scripts/test-suggest.ts.
 */
import { daysBetween } from './dates'
import { normalizeName } from './shopping'

export interface SuggestRecipe {
  id: string
  title: string
  ingredients: { name: string; ciqual_code: string | null }[]
}

export interface SuggestFridgeItem {
  name: string
  ciqual_code: string | null
  expires_on: string | null
}

export interface Suggestion {
  id: string
  /** Ingrédients disponibles / ingrédients à compter (hors placard de base) */
  have: number
  total: number
  /** Aliments du frigo qui périment bientôt et que la recette utilise */
  saves: { name: string; days: number }[]
  missing: string[]
  score: number
}

/** Placard de base : on ne les compte ni comme manquants ni comme présents. */
const STAPLES = ['sel', 'poivre', 'eau', 'huile', 'vinaigre', 'epices', 'herbes de provence']
export const isStaple = (name: string) => {
  const n = normalizeName(name)
  return STAPLES.some((s) => n === s || n.startsWith(s + ' '))
}

export const URGENT_DAYS = 3

export function suggestRecipes(recipes: SuggestRecipe[], fridge: SuggestFridgeItem[], today: string, limit = 12): Suggestion[] {
  const usable = fridge
    .filter((f) => !f.expires_on || f.expires_on >= today)
    .map((f) => ({ ...f, norm: normalizeName(f.name), days: f.expires_on ? daysBetween(today, f.expires_on) : null }))

  const out: Suggestion[] = []
  for (const r of recipes) {
    const counted = r.ingredients.filter((i) => i.name?.trim() && !isStaple(i.name))
    if (counted.length === 0) continue
    let have = 0
    const missing: string[] = []
    const saves = new Map<string, number>()
    for (const ing of counted) {
      const norm = normalizeName(ing.name)
      const match = usable.filter((f) => (ing.ciqual_code && f.ciqual_code === ing.ciqual_code) || f.norm === norm)
      if (match.length) {
        have++
        for (const f of match) {
          if (f.days != null && f.days <= URGENT_DAYS) {
            const prev = saves.get(f.name)
            saves.set(f.name, prev == null ? f.days : Math.min(prev, f.days))
          }
        }
      } else {
        missing.push(ing.name)
      }
    }
    if (have === 0) continue
    const coverage = have / counted.length
    // Couverture (0 à 100) + bonus par aliment sauvé, plus fort s'il périme tôt
    const bonus = [...saves.values()].reduce((acc, d) => acc + (URGENT_DAYS + 1 - d) * 10, 0)
    out.push({
      id: r.id,
      have,
      total: counted.length,
      saves: [...saves.entries()].map(([name, days]) => ({ name, days })).sort((a, b) => a.days - b.days),
      missing,
      score: Math.round(coverage * 100 + bonus),
    })
  }
  return out.sort((a, b) => b.score - a.score || a.missing.length - b.missing.length).slice(0, limit)
}
