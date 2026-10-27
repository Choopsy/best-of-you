'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getFridge, getHouseholdId } from '@/lib/household'
import { buildShoppingList, normalizeName, type PlannedRecipe } from '@/lib/shopping'
import { isAisleKey, resolveOrder } from '@/lib/aisles'
import { isISODate, todayISO } from '@/lib/dates'

type Result = { error: string | null; count?: number }

/** (Re)génère la liste à partir du planning entre deux dates, moins le frigo. */
export async function generateShoppingList(from: string, to: string): Promise<Result> {
  const supabase = await createClient()
  if (!isISODate(from) || !isISODate(to) || from > to) return { error: 'Période invalide.' }
  const household_id = await getHouseholdId(supabase)
  if (!household_id) return { error: 'Foyer introuvable.' }

  const [{ data: plan, error: planErr }, fridge] = await Promise.all([
    supabase.from('meal_plan')
      .select('servings, recipes ( title, base_servings, ingredients ( name, amount, unit, ciqual_code ) )')
      .gte('planned_on', from).lte('planned_on', to),
    getFridge(supabase),
  ])
  if (planErr) return { error: planErr.message }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const planned: PlannedRecipe[] = (plan ?? []).filter((p: any) => p.recipes).map((p: any) => ({
    title: p.recipes.title,
    servings: Number(p.servings),
    baseServings: Number(p.recipes.base_servings) || 1,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ingredients: (p.recipes.ingredients ?? []).map((i: any) => ({
      name: i.name, amount: i.amount != null ? Number(i.amount) : null, unit: i.unit, ciqual_code: i.ciqual_code,
    })),
  }))
  if (planned.length === 0) return { error: 'Aucune recette prévue sur cette période. Ajoute des recettes dans « Semaine ».' }

  const lines = buildShoppingList(planned, fridge, todayISO())

  // Remplace les articles générés précédemment (non cochés), garde ceux ajoutés à la main
  const { error: delErr } = await supabase.from('shopping_items').delete().eq('source', 'plan').eq('checked', false)
  if (delErr) return { error: delErr.message }
  if (lines.length) {
    const { error } = await supabase.from('shopping_items').insert(lines.map((l) => ({
      household_id, name: l.name, ciqual_code: l.ciqual_code, quantity: l.quantity, unit: l.unit,
      note: [l.note, l.recipes.length ? `Pour : ${l.recipes.join(', ')}` : null].filter(Boolean).join(' · ') || null,
      source: 'plan',
    })))
    if (error) return { error: error.message }
  }
  revalidatePath('/courses')
  return { error: null, count: lines.length }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Ajoute un article. `id` peut être choisi par le téléphone (ajout hors connexion) :
 * renvoyé deux fois après une coupure, il n'est créé qu'une fois.
 */
export async function addShoppingItem(name: string, id?: string): Promise<Result> {
  const supabase = await createClient()
  const label = name.trim()
  if (!label) return { error: 'Indique un article.' }
  if (label.length > 120) return { error: 'Article trop long.' }
  if (id !== undefined && !UUID.test(id)) return { error: 'Identifiant invalide.' }
  const household_id = await getHouseholdId(supabase)
  if (!household_id) return { error: 'Foyer introuvable.' }
  const { error } = await supabase.from('shopping_items').insert({ ...(id ? { id } : {}), household_id, name: label, source: 'manual' })
  if (error && error.code !== '23505') return { error: error.message }
  revalidatePath('/courses')
  return { error: null }
}

export async function toggleShoppingItem(id: string, checked: boolean): Promise<Result> {
  const supabase = await createClient()
  const { error } = await supabase.from('shopping_items').update({ checked }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/courses')
  return { error: null }
}

export async function deleteShoppingItem(id: string): Promise<Result> {
  const supabase = await createClient()
  const { error } = await supabase.from('shopping_items').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/courses')
  return { error: null }
}

/** Les articles cochés vont au frigo (sans date : à compléter), puis sortent de la liste. */
export async function storeCheckedInFridge(): Promise<Result> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }
  const { data: checked, error: e1 } = await supabase
    .from('shopping_items').select('id, household_id, name, ciqual_code, quantity, unit').eq('checked', true)
  if (e1) return { error: e1.message }
  if (!checked?.length) return { error: 'Aucun article coché.' }
  const { error: e2 } = await supabase.from('fridge_items').insert(checked.map((c) => ({
    household_id: c.household_id, name: c.name, ciqual_code: c.ciqual_code,
    quantity: c.quantity, unit: c.quantity != null ? c.unit : null, added_by: user.id,
  })))
  if (e2) return { error: e2.message }
  const { error: e3 } = await supabase.from('shopping_items').delete().in('id', checked.map((c) => c.id))
  if (e3) return { error: e3.message }
  revalidatePath('/courses')
  revalidatePath('/frigo')
  return { error: null, count: checked.length }
}

export async function clearChecked(): Promise<Result> {
  const supabase = await createClient()
  const { error } = await supabase.from('shopping_items').delete().eq('checked', true)
  if (error) return { error: error.message }
  revalidatePath('/courses')
  return { error: null }
}

/** Range un article dans un autre rayon ; mémorisé pour tout le foyer (« auto » = revenir à la devinette). */
export async function setItemAisle(name: string, aisle: string): Promise<Result> {
  const supabase = await createClient()
  const name_norm = normalizeName(name).slice(0, 120)
  if (!name_norm) return { error: 'Article invalide.' }
  const household_id = await getHouseholdId(supabase)
  if (!household_id) return { error: 'Foyer introuvable.' }
  if (aisle === 'auto') {
    const { error } = await supabase.from('aisle_overrides').delete().eq('household_id', household_id).eq('name_norm', name_norm)
    if (error) return { error: error.message }
  } else {
    if (!isAisleKey(aisle)) return { error: 'Rayon inconnu.' }
    const { error } = await supabase.from('aisle_overrides')
      .upsert({ household_id, name_norm, aisle, updated_at: new Date().toISOString() }, { onConflict: 'household_id,name_norm' })
    if (error) return { error: error.message }
  }
  revalidatePath('/courses')
  return { error: null }
}

/** Ordre des rayons de ton magasin (pour tout le foyer). */
export async function setAisleOrder(order: string[]): Promise<Result> {
  const supabase = await createClient()
  const clean = resolveOrder(order)
  const household_id = await getHouseholdId(supabase)
  if (!household_id) return { error: 'Foyer introuvable.' }
  const { error } = await supabase.from('households').update({ aisle_order: clean }).eq('id', household_id)
  if (error) return { error: error.message }
  revalidatePath('/courses')
  return { error: null }
}
