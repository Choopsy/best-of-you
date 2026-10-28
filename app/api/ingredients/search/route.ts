import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { FoodSuggestion } from '@/lib/types'
import { estimateKcal } from '@/lib/nutrition'


function normalizeSearch(s: string) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[œŒ]/g, 'oe')
    .replace(/[æÆ]/g, 'ae')
    .replace(/[%_\\,()]/g, ' ')
    .toLowerCase()
    .trim()
}

export async function GET(request: NextRequest) {
  // ?products=1 : inclure aussi les produits enregistrés du foyer (journal)
  const withProducts = request.nextUrl.searchParams.get('products') === '1'
  const raw = request.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (raw.length < 2) return Response.json([])

  const q = normalizeSearch(raw)
  const supabase = await createClient()
  const cols = 'ciqual_code, name_fr, energy_kcal, proteins_g, carbs_g, fat_g, fiber_g'

  // Priorité : commence par la requête, puis contient la requête ;
  // dans chaque groupe, les noms les plus courts (les plus « simples ») d'abord.
  const [{ data: starts }, { data: contains }, { data: products }] = await Promise.all([
    supabase.from('canonical_ingredients').select(cols)
      .ilike('search_name', `${q}%`).limit(40),
    supabase.from('canonical_ingredients').select(cols)
      .ilike('search_name', `%${q}%`).not('search_name', 'ilike', `${q}%`).limit(40),
    withProducts
      ? supabase.from('custom_foods').select('id, name, brand, energy_kcal, proteins_g, per_portion, portion_grams').ilike('name', `%${raw.replace(/[%_,()]/g, ' ')}%`).limit(5)
      : Promise.resolve({ data: [] as { id: string; name: string; brand: string | null; energy_kcal: number; proteins_g: number; per_portion: boolean; portion_grams: number | null }[] }),
  ])
  const byLength = (a: { name_fr: string }, b: { name_fr: string }) =>
    a.name_fr.length - b.name_fr.length || a.name_fr.localeCompare(b.name_fr, 'fr')

  const own: FoodSuggestion[] = (products ?? []).map((p) => ({
    code: p.id, kind: 'custom', name: p.brand ? `${p.name} (${p.brand})` : p.name,
    kcal: Number(p.energy_kcal), proteins: Number(p.proteins_g),
    perPortion: !!p.per_portion, portionGrams: p.portion_grams != null ? Number(p.portion_grams) : null,
  }))
  const results: FoodSuggestion[] = [...own, ...[...(starts ?? []).sort(byLength), ...(contains ?? []).sort(byLength)]
    .slice(0, 8 - Math.min(own.length, 3))
    .map((r) => ({
      code: String(r.ciqual_code),
      name: r.name_fr,
      kcal: r.energy_kcal != null ? Number(r.energy_kcal) : estimateKcal(r),
      proteins: r.proteins_g != null ? Number(r.proteins_g) : null,
      kind: 'ciqual' as const,
    }))]

  return Response.json(results)
}
