'use server'

import { createClient } from '@/lib/supabase/server'
import { getHouseholdId } from '@/lib/household'
import { NUTRIENT_KEYS, type Nutrients } from '@/lib/nutrition'

export interface ProductInput {
  barcode: string | null
  name: string
  brand: string | null
  image_url: string | null
  source: 'off' | 'manual'
  /** Valeurs pour 100 g, ou pour 1 portion si perPortion */
  per100: Nutrients
  perPortion?: boolean
  /** Poids d'une portion en grammes (facultatif) */
  portionGrams?: number | null
}

/** Enregistre (ou met à jour) un produit pour le foyer ; renvoie son identifiant. */
export async function saveProduct(input: ProductInput): Promise<{ error: string | null; id?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }
  const name = input.name?.trim()
  if (!name) return { error: 'Indique le nom du produit.' }
  if (input.barcode && !/^[0-9]{8,14}$/.test(input.barcode)) return { error: 'Code-barres invalide.' }
  const perPortion = !!input.perPortion
  const portionGrams = input.portionGrams ? Math.round(Number(input.portionGrams) * 10) / 10 : null
  if (portionGrams != null && !(portionGrams > 0 && portionGrams <= 3000)) return { error: 'Poids de la portion entre 1 et 3 000 g.' }
  for (const k of NUTRIENT_KEYS) {
    const v = Number(input.per100[k] ?? 0)
    const max = perPortion ? (k === 'energy_kcal' ? 5000 : 1000) : (k === 'energy_kcal' ? 950 : 100)
    if (!(v >= 0 && v <= max)) {
      return { error: perPortion
        ? 'Une valeur nutritionnelle est hors limites pour une portion.'
        : 'Une valeur est trop grande pour 100 g. Ce sont des valeurs pour une portion ? Choisis « 1 portion ».' }
    }
  }
  const household_id = await getHouseholdId(supabase)
  if (!household_id) return { error: 'Foyer introuvable.' }

  const row = {
    household_id, barcode: input.barcode, name: name.slice(0, 120), brand: input.brand?.slice(0, 80) || null,
    image_url: input.image_url?.startsWith('https://') ? input.image_url : null,
    source: input.source, created_by: user.id, per_portion: perPortion, portion_grams: portionGrams,
    ...Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, Math.round(Number(input.per100[k] ?? 0) * 100) / 100])),
  }
  const q = input.barcode
    ? supabase.from('custom_foods').upsert(row, { onConflict: 'household_id,barcode' })
    : supabase.from('custom_foods').insert(row)
  const { data, error } = await q.select('id').single()
  if (error || !data) return { error: error?.message ?? 'Erreur lors de l\'enregistrement.' }
  return { error: null, id: data.id }
}
