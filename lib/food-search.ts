import type { SupabaseClient } from '@supabase/supabase-js'
import type { FoodSuggestion } from './types'
import { estimateKcal } from './nutrition'
import { canUseGrams } from './portions'

/**
 * Recherche d'aliments : table Ciqual, plus les produits du foyer si householdId est donné.
 * Utilisée par la saisie (/api/ingredients/search) et pour relier les aliments vus sur
 * une photo de repas (bestFoodMatch).
 */

export function normalizeSearch(s: string) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[œŒ]/g, 'oe')
    .replace(/[æÆ]/g, 'ae')
    .replace(/[%_\\,()]/g, ' ')
    .toLowerCase()
    .trim()
}

type ProductRow = { id: string; name: string; brand: string | null; energy_kcal: number; proteins_g: number; per_portion: boolean; portion_grams: number | null }

/**
 * `pattern` : texte déjà normalisé ; un « % » entre deux mots accepte n'importe quoi entre eux
 * (« riz%cuit » trouve « Riz blanc, cuit »).
 */
export async function searchFoods(
  supabase: SupabaseClient,
  raw: string,
  { householdId = null, pattern }: { householdId?: string | null; pattern?: string } = {},
): Promise<FoodSuggestion[]> {
  const q = pattern ?? normalizeSearch(raw)
  const cols = 'ciqual_code, name_fr, energy_kcal, proteins_g, carbs_g, fat_g, fiber_g'
  const productText = (pattern ? pattern.replace(/%/g, ' ') : raw).replace(/[%_,()]/g, ' ').trim()

  // Priorité : commence par la requête, puis contient la requête ;
  // dans chaque groupe, les noms les plus courts (les plus « simples ») d'abord.
  const [{ data: starts }, { data: contains }, { data: products }] = await Promise.all([
    supabase.from('canonical_ingredients').select(cols)
      .ilike('search_name', `${q}%`).limit(40),
    supabase.from('canonical_ingredients').select(cols)
      .ilike('search_name', `%${q}%`).not('search_name', 'ilike', `${q}%`).limit(40),
    householdId
      // Seulement les produits de mon foyer (pas ceux d'autres foyers lisibles via une recette publique)
      ? supabase.from('custom_foods').select('id, name, brand, energy_kcal, proteins_g, per_portion, portion_grams').eq('household_id', householdId).ilike('name', `%${productText}%`).limit(5)
      : Promise.resolve({ data: [] as ProductRow[] }),
  ])
  const byLength = (a: { name_fr: string }, b: { name_fr: string }) =>
    a.name_fr.length - b.name_fr.length || a.name_fr.localeCompare(b.name_fr, 'fr')

  const own: FoodSuggestion[] = ((products ?? []) as ProductRow[]).map((p) => ({
    code: p.id, kind: 'custom', name: p.brand ? `${p.name} (${p.brand})` : p.name,
    kcal: Number(p.energy_kcal), proteins: Number(p.proteins_g),
    perPortion: !!p.per_portion, portionGrams: p.portion_grams != null ? Number(p.portion_grams) : null,
  }))
  return [...own, ...[...(starts ?? []).sort(byLength), ...(contains ?? []).sort(byLength)]
    .slice(0, 8 - Math.min(own.length, 3))
    .map((r) => ({
      code: String(r.ciqual_code),
      name: r.name_fr,
      kcal: r.energy_kcal != null ? Number(r.energy_kcal) : estimateKcal(r),
      proteins: r.proteins_g != null ? Number(r.proteins_g) : null,
      kind: 'ciqual' as const,
    }))]
}

/**
 * Motifs essayés pour relier un nom à un aliment, du plus précis au plus large :
 * le nom tel quel, les mots dans l'ordre avec n'importe quoi entre eux, puis en retirant
 * les derniers mots (« poulet rôti fermier » → « poulet rôti » → « poulet »).
 * Les mots perdent leur pluriel : Ciqual écrit « Haricot vert, cuit », l'IA « haricots verts cuits »
 * (« haricot » trouve aussi « haricots »).
 */
export function matchPatterns(name: string): string[] {
  const singular = (w: string) => (w.length > 3 && /[sx]$/.test(w) ? w.slice(0, -1) : w)
  const words = normalizeSearch(name).split(/[\s'’-]+/).filter((w) => w.length >= 2).map(singular)
  const out: string[] = []
  const add = (p: string) => { if (p.length >= 2 && !out.includes(p)) out.push(p) }
  add(normalizeSearch(name))
  for (let n = words.length; n >= 1; n--) add(words.slice(0, n).join('%'))
  return out.slice(0, 4)
}

/**
 * Meilleur aliment pour un nom (photo de repas) : premier résultat de la recherche habituelle
 * qui se compte en grammes. Null si rien ne correspond : l'utilisateur choisira lui-même.
 */
export async function bestFoodMatch(supabase: SupabaseClient, name: string, householdId: string | null): Promise<FoodSuggestion | null> {
  for (const pattern of matchPatterns(name)) {
    const found = (await searchFoods(supabase, name, { householdId, pattern }))
      .find((f) => f.kind !== 'custom' || canUseGrams({ perPortion: !!f.perPortion, portionGrams: f.portionGrams ?? null }))
    if (found) return found
  }
  return null
}
