'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { calcRecipeNutrition, fetchCiqual, roundNutrients, scale } from '@/lib/nutrition'
import { loadRecipe } from '@/lib/recipes'
import { isISODate } from '@/lib/dates'
import { MEALS, type Meal } from '@/lib/types'

type Result = { error: string | null }

async function auth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
}

function checkCommon(date: string, meal: string): string | null {
  if (!isISODate(date)) return 'Date invalide.'
  if (!MEALS.includes(meal as Meal)) return 'Repas invalide.'
  return null
}

export async function addFoodToLog(input: { date: string; meal: Meal; code: string; grams: number }): Promise<Result> {
  const { supabase, user } = await auth()
  if (!user) return { error: 'Non connecté' }
  const bad = checkCommon(input.date, input.meal)
  if (bad) return { error: bad }
  if (!(input.grams > 0 && input.grams <= 5000)) return { error: 'Quantité entre 1 et 5 000 g.' }

  const food = (await fetchCiqual(supabase, [input.code])).get(input.code)
  if (!food) return { error: 'Aliment introuvable dans la base Ciqual.' }

  const n = roundNutrients(scale(food.per100, input.grams / 100))
  const { error } = await supabase.from('food_logs').insert({
    user_id: user.id,
    eaten_on: input.date,
    meal: input.meal,
    ciqual_code: input.code,
    label: food.name,
    grams: input.grams,
    ...n,
  })
  if (error) return { error: error.message }
  revalidatePath('/journal')
  revalidatePath('/')
  return { error: null }
}

export async function addRecipeToLog(input: { date: string; meal: Meal; recipeId: string; servings: number }): Promise<Result> {
  const { supabase, user } = await auth()
  if (!user) return { error: 'Non connecté' }
  const bad = checkCommon(input.date, input.meal)
  if (bad) return { error: bad }
  if (!(input.servings > 0 && input.servings <= 20)) return { error: 'Nombre de portions invalide.' }

  const recipe = await loadRecipe(supabase, input.recipeId)
  if (!recipe) return { error: 'Recette introuvable.' }

  const nutrition = await calcRecipeNutrition(
    supabase,
    recipe.ingredient_groups.flatMap((g) => g.ingredients),
    recipe.base_servings ?? 1,
  )
  if (!nutrition) {
    return { error: 'Aucun ingrédient de cette recette n\'est lié à la base Ciqual : impossible de calculer ses valeurs nutritionnelles.' }
  }

  const n = roundNutrients(scale(nutrition.perServing, input.servings))
  const { error } = await supabase.from('food_logs').insert({
    user_id: user.id,
    eaten_on: input.date,
    meal: input.meal,
    recipe_id: recipe.id,
    label: recipe.title,
    servings: input.servings,
    ...n,
  })
  if (error) return { error: error.message }
  revalidatePath('/journal')
  revalidatePath('/')
  return { error: null }
}

export async function deleteFoodLog(id: string): Promise<Result> {
  const { supabase, user } = await auth()
  if (!user) return { error: 'Non connecté' }
  const { error } = await supabase.from('food_logs').delete().eq('id', id).eq('user_id', user.id)
  if (error) return { error: error.message }
  revalidatePath('/journal')
  revalidatePath('/')
  return { error: null }
}
