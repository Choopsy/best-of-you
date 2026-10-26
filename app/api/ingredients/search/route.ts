import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function normalizeSearch(s: string) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[œŒ]/g, 'oe')
    .replace(/[æÆ]/g, 'ae')
    .toLowerCase()
    .trim()
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (raw.length < 2) return Response.json([])

  const q = normalizeSearch(raw)
  const supabase = await createClient()

  // Priorité : commence par la requête, puis contient la requête
  const [{ data: starts }, { data: contains }] = await Promise.all([
    supabase
      .from('canonical_ingredients')
      .select('name_fr')
      .ilike('search_name', `${q}%`)
      .order('search_name')
      .limit(5),
    supabase
      .from('canonical_ingredients')
      .select('name_fr')
      .ilike('search_name', `%${q}%`)
      .not('search_name', 'ilike', `${q}%`)
      .order('search_name')
      .limit(4),
  ])

  const results = [
    ...(starts ?? []).map((r) => r.name_fr),
    ...(contains ?? []).map((r) => r.name_fr),
  ].slice(0, 7)

  return Response.json(results)
}
