import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { FoodSuggestion } from '@/lib/types'


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
  const raw = request.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (raw.length < 2) return Response.json([])

  const q = normalizeSearch(raw)
  const supabase = await createClient()
  const cols = 'ciqual_code, name_fr, energy_kcal, proteins_g'

  // Priorité : commence par la requête, puis contient la requête
  const [{ data: starts }, { data: contains }] = await Promise.all([
    supabase.from('canonical_ingredients').select(cols)
      .ilike('search_name', `${q}%`).order('search_name').limit(6),
    supabase.from('canonical_ingredients').select(cols)
      .ilike('search_name', `%${q}%`).not('search_name', 'ilike', `${q}%`).order('search_name').limit(6),
  ])

  const results: FoodSuggestion[] = [...(starts ?? []), ...(contains ?? [])]
    .slice(0, 8)
    .map((r) => ({
      code: String(r.ciqual_code),
      name: r.name_fr,
      kcal: r.energy_kcal != null ? Number(r.energy_kcal) : null,
      proteins: r.proteins_g != null ? Number(r.proteins_g) : null,
    }))

  return Response.json(results)
}
