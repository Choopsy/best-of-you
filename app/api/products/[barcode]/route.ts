import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { NUTRIENT_KEYS, type Nutrients } from '@/lib/nutrition'
import { fetchOff, OFF_URL, type ProductLookup } from '@/lib/off'
import { LEGAL } from '@/lib/legal'

export type { ProductLookup }

// Open Food Facts demande d'identifier l'appli : « NomAppli/Version (contact) »
const OFF_BASE = process.env.OPENFOODFACTS_URL ?? OFF_URL
const USER_AGENT = `Dignis/1.0 (${LEGAL.contactEmail})`

export async function GET(req: NextRequest, ctx: { params: Promise<{ barcode: string }> }) {
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

  // ?local=1 : seulement les produits du foyer (le téléphone interroge Open Food Facts lui-même)
  if (req.nextUrl.searchParams.get('local') === '1') return Response.json({ found: false, barcode } satisfies ProductLookup)

  // 2. Secours : Open Food Facts depuis le serveur
  return Response.json(await fetchOff(barcode, { base: OFF_BASE, headers: { 'User-Agent': USER_AGENT } }))
}
