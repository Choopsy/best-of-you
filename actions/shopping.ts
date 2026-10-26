'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getFridge, getHouseholdId } from '@/lib/household'
import { buildShoppingList, type PlannedRecipe } from '@/lib/shopping'
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

export async function addShoppingItem(name: string): Promise<Result> {
  const supabase = await createClient()
  const label = name.trim()
  if (!label) return { error: 'Indique un article.' }
  if (label.length > 120) return { error: 'Article trop long.' }
  const household_id = await getHouseholdId(supabase)
  if (!household_id) return { error: 'Foyer introuvable.' }
  const { error } = await supabase.from('shopping_items').insert({ household_id, name: label, source: 'manual' })
  if (error) return { error: error.message }
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
