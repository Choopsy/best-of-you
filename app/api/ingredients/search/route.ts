import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getHouseholdId } from '@/lib/household'
import { searchFoods } from '@/lib/food-search'

export async function GET(request: NextRequest) {
  // ?products=1 : inclure aussi les produits enregistrés du foyer (journal)
  const withProducts = request.nextUrl.searchParams.get('products') === '1'
  const raw = request.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (raw.length < 2) return Response.json([])

  const supabase = await createClient()
  const householdId = withProducts ? await getHouseholdId(supabase) : null
  return Response.json(await searchFoods(supabase, raw, { householdId }))
}
