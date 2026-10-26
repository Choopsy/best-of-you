'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getHouseholdId } from '@/lib/household'
import { isISODate } from '@/lib/dates'
import { MEALS, type Meal } from '@/lib/types'

type Result = { error: string | null }

export async function addToPlan(input: { date: string; meal: Meal; recipeId: string; servings: number }): Promise<Result> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }
  if (!isISODate(input.date)) return { error: 'Date invalide.' }
  if (!MEALS.includes(input.meal)) return { error: 'Repas invalide.' }
  if (!(input.servings > 0 && input.servings <= 50)) return { error: 'Nombre de portions invalide.' }
  const household_id = await getHouseholdId(supabase)
  if (!household_id) return { error: 'Foyer introuvable.' }
  const { error } = await supabase.from('meal_plan').insert({
    household_id, planned_on: input.date, meal: input.meal, recipe_id: input.recipeId,
    servings: input.servings, added_by: user.id,
  })
  if (error) return { error: error.message }
  revalidatePath('/semaine')
  return { error: null }
}

export async function removeFromPlan(id: string): Promise<Result> {
  const supabase = await createClient()
  const { error } = await supabase.from('meal_plan').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/semaine')
  return { error: null }
}
