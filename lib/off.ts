/**
 * Recherche d'un produit par code-barres : produits déjà enregistrés par le foyer,
 * puis Open Food Facts.
 *
 * Open Food Facts limite la lecture à 15 produits par minute et par adresse IP.
 * Appelé depuis le serveur, tous les sites hébergés chez Vercel partagent les mêmes
 * adresses : la limite est vite atteinte et la recherche échoue au hasard. Appelé
 * depuis le téléphone, la limite est propre à chaque personne (doc officielle).
 * On interroge donc Open Food Facts depuis le navigateur, et le serveur en secours.
 */
import { NUTRIENT_KEYS, type Nutrients } from './nutrition'

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
  /** Open Food Facts n'a pas répondu (différent de « produit inconnu ») */
  error?: boolean
}

export const OFF_URL = 'https://world.openfoodfacts.org'
export const OFF_QUERY = 'fields=product_name,product_name_fr,brands,image_front_small_url,nutriments'

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

/** Réponse d'Open Food Facts → produit, ou « inconnu ». */
export function parseOff(json: unknown, barcode: string): ProductLookup {
  const j = json as { status?: number; product?: Record<string, unknown> } | null
  const p = j?.product
  const name = (p?.product_name_fr || p?.product_name) as string | undefined
  if (j?.status !== 1 || !p || !name) return { found: false, barcode }
  const n = (p.nutriments ?? {}) as Record<string, unknown>
  const missing = NUTRIENT_KEYS.filter((k) => n[OFF_FIELDS[k]] == null)
  return {
    found: true, source: 'off', barcode, name: String(name).trim(),
    brand: p.brands ? String(p.brands).split(',')[0].trim() : null,
    image_url: (p.image_front_small_url as string | undefined) ?? null,
    per100: Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, Number(n[OFF_FIELDS[k]] ?? 0) || 0])) as Nutrients,
    incomplete: missing.includes('energy_kcal') || missing.length > 3,
  }
}

/**
 * Interroge Open Food Facts avec un nouvel essai en cas de coupure, de délai dépassé
 * ou de service saturé (503). `error: true` = pas de réponse exploitable.
 */
export async function fetchOff(barcode: string, opts: { base?: string; headers?: HeadersInit; tries?: number } = {}): Promise<ProductLookup> {
  const url = `${opts.base ?? OFF_URL}/api/v2/product/${barcode}?${OFF_QUERY}`
  const tries = opts.tries ?? 2
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: opts.headers, signal: AbortSignal.timeout(8000), cache: 'no-store' })
      // 404 = produit absent de la base ; le corps dit la même chose (status 0)
      if (res.ok || res.status === 404) {
        const json = await res.json().catch(() => null)
        if (json) return parseOff(json, barcode)
      }
    } catch { /* réseau ou délai : on réessaie */ }
    if (i < tries - 1) await new Promise((r) => setTimeout(r, 700))
  }
  return { found: false, barcode, error: true }
}

/**
 * Côté téléphone : 1. produits du foyer, 2. Open Food Facts en direct,
 * 3. en secours, Open Food Facts via le serveur.
 */
export async function lookupProduct(barcode: string): Promise<ProductLookup> {
  try {
    const local = await fetch(`/api/products/${barcode}?local=1`, { cache: 'no-store' }).then((r) => r.json()) as ProductLookup
    if (local.found) return local
  } catch { /* on tente quand même Open Food Facts */ }
  const direct = await fetchOff(barcode)
  if (!direct.error) return direct
  try {
    return await fetch(`/api/products/${barcode}`, { cache: 'no-store' }).then((r) => r.json()) as ProductLookup
  } catch {
    return { found: false, barcode, error: true }
  }
}
