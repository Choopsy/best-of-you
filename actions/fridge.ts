'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getHouseholdId } from '@/lib/household'
import { isISODate } from '@/lib/dates'

type Result = { error: string | null }

export interface FridgeInput {
  name: string
  ciqual_code: string | null
  quantity: number | null
  unit: string | null
  expires_on: string | null
}

function clean(input: FridgeInput): FridgeInput | string {
  const name = input.name?.trim()
  if (!name) return 'Indique le nom de l\'aliment.'
  if (name.length > 120) return 'Nom trop long.'
  if (input.quantity != null && !(input.quantity > 0 && input.quantity < 100000)) return 'Quantité invalide.'
  if (input.expires_on && !isISODate(input.expires_on)) return 'Date invalide.'
  return {
    name,
    ciqual_code: input.ciqual_code || null,
    quantity: input.quantity ?? null,
    unit: input.quantity != null ? (input.unit?.trim() || null) : null,
    expires_on: input.expires_on || null,
  }
}

function refresh() {
  revalidatePath('/frigo')
  revalidatePath('/courses')
  revalidatePath('/')
}

export async function addFridgeItem(input: FridgeInput): Promise<Result> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }
  const item = clean(input)
  if (typeof item === 'string') return { error: item }
  const household_id = await getHouseholdId(supabase)
  if (!household_id) return { error: 'Foyer introuvable.' }
  const { error } = await supabase.from('fridge_items').insert({ ...item, household_id, added_by: user.id })
  if (error) return { error: error.message }
  refresh()
  return { error: null }
}

export async function updateFridgeItem(id: string, input: FridgeInput): Promise<Result> {
  const supabase = await createClient()
  const item = clean(input)
  if (typeof item === 'string') return { error: item }
  const { error } = await supabase.from('fridge_items').update(item).eq('id', id)
  if (error) return { error: error.message }
  refresh()
  return { error: null }
}

export async function deleteFridgeItem(id: string): Promise<Result> {
  const supabase = await createClient()
  const { error } = await supabase.from('fridge_items').delete().eq('id', id)
  if (error) return { error: error.message }
  refresh()
  return { error: null }
}
