import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { NUTRIENT_KEYS, type Nutrients } from '@/lib/nutrition'

export interface ProductLookup {
  found: boolean
  /** Déjà enregistré dans le foyer */
  saved?: { id: string }
  source?: 'off' | 'manual'
  barcode: string
  name?: string
  brand?: string | null
  image_url?: string | null
  per100?: Nutrients
  /** Valeurs manquantes chez Open Food Facts (à compléter) */
  incomplete?: boolean
}

// Open Food Facts demande d'identifier l'appli dans chaque requête
const OFF_URL = process.env.OPENFOODFACTS_URL ?? 'https://world.openfoodfacts.org'
const USER_AGENT = 'Equilibre/1.0 (appli perso de nutrition ; https://github.com/Choopsy)'

const OFF_FIELDS: Record<keyof Nutrients, string> = {
  energy_kcal: 'energy-kcal_100g',
  proteins_g: 'proteins_100g',
  carbs_g: 'carbohydrates_100g',
  sugars_g: 'sugars_100g',
  fat_g: 'fat_100g',
  saturated_fat_g: 'saturated-fat_100g',
  fiber_g: 'fiber_100g',
  salt_g: 'salt_100g',
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ barcode: string }> }) {
  const { barcode } = await ctx.params
  if (!/^[0-9]{8,14}$/.test(barcode)) return Response.json({ error: 'Code-barres invalide' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non connecté' }, { status: 401 })

  // 1. Déjà enregistré par le foyer ?
  const { data: saved } = await supabase.from('custom_foods')
    .select(`id, name, brand, image_url, source, ${NUTRIENT_KEYS.join(', ')}`)
    .eq('barcode', barcode).maybeSingle()
  if (saved) {
    const s = saved as unknown as Record<string, unknown>
    const out: ProductLookup = {
      found: true, saved: { id: String(s.id) }, source: s.source as 'off' | 'manual', barcode,
      name: String(s.name), brand: (s.brand as string | null) ?? null, image_url: (s.image_url as string | null) ?? null,
      per100: Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, Number(s[k] ?? 0)])) as Nutrients,
    }
    return Response.json(out)
  }

  // 2. Open Food Facts
  try {
    const res = await fetch(
      `${OFF_URL}/api/v2/product/${barcode}?fields=product_name,product_name_fr,brands,image_front_small_url,nutriments`,
      { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(6000), next: { revalidate: 86400 } },
    )
    if (res.ok) {
      const json = await res.json()
      const p = json?.product
      const name = p?.product_name_fr || p?.product_name
      if (json?.status === 1 && name) {
        const n = p.nutriments ?? {}
        const missing = NUTRIENT_KEYS.filter((k) => n[OFF_FIELDS[k]] == null)
        const per100 = Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, Number(n[OFF_FIELDS[k]] ?? 0) || 0])) as Nutrients
        return Response.json({
          found: true, source: 'off', barcode, name: String(name).trim(),
          brand: p.brands ? String(p.brands).split(',')[0].trim() : null,
          image_url: p.image_front_small_url ?? null,
          per100,
          incomplete: missing.includes('energy_kcal') || missing.length > 3,
        } satisfies ProductLookup)
      }
    }
  } catch {
    // réseau indisponible : on propose la saisie manuelle
  }
  return Response.json({ found: false, barcode } satisfies ProductLookup)
}
