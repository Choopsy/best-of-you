'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { CreateRecipeInput } from '@/lib/types'

export async function createRecipe(input: CreateRecipeInput) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Garantir que le profil existe (sécurité si le trigger n'a pas fonctionné)
  await supabase.from('profiles').upsert(
    { id: user.id, full_name: user.user_metadata?.full_name ?? null },
    { onConflict: 'id', ignoreDuplicates: true },
  )

  const { data: recipe, error } = await supabase
    .from('recipes')
    .insert({
      author_id: user.id,
      title: input.title,
      description: input.description || null,
      cover_image_url: input.cover_image_url || null,
      prep_time_min: input.prep_time_min,
      cook_time_min: input.cook_time_min,
      base_servings: input.base_servings,
      difficulty: input.difficulty,
      visibility: input.visibility,
    })
    .select('id')
    .single()

  if (error || !recipe) return { error: error?.message ?? 'Erreur lors de la création' }

  await insertRelations(supabase, recipe.id, input)
  if (input.collection_id) {
    await supabase.from('collection_recipes').insert({ collection_id: input.collection_id, recipe_id: recipe.id })
  }
  redirect(`/recipes/${recipe.id}`)
}

export async function updateRecipe(id: string, input: CreateRecipeInput) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('recipes')
    .update({
      title: input.title,
      description: input.description || null,
      cover_image_url: input.cover_image_url || null,
      prep_time_min: input.prep_time_min,
      cook_time_min: input.cook_time_min,
      base_servings: input.base_servings,
      difficulty: input.difficulty,
      visibility: input.visibility,
    })
    .eq('id', id)
    .eq('author_id', user.id)

  if (error) return { error: error.message }

  // Supprime et réinsère les relations (approche simple)
  await Promise.all([
    supabase.from('recipe_tags').delete().eq('recipe_id', id),
    supabase.from('ingredient_groups').delete().eq('recipe_id', id), // cascade → ingredients
    supabase.from('steps').delete().eq('recipe_id', id),
  ])

  await insertRelations(supabase, id, input)
  redirect(`/recipes/${id}`)
}

export async function deleteRecipe(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('recipes').delete().eq('id', id)
  if (error) return { error: error.message }
  redirect('/recipes')
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function insertRelations(
  supabase: Awaited<ReturnType<typeof createClient>>,
  recipeId: string,
  input: CreateRecipeInput,
) {
  if (input.tag_ids.length > 0) {
    await supabase
      .from('recipe_tags')
      .insert(input.tag_ids.map((tag_id) => ({ recipe_id: recipeId, tag_id })))
  }

  // Map "gi_ii" -> DB ingredient ID (for step_ingredients links)
  const ingDbIds: Record<string, string> = {}

  for (let gi = 0; gi < input.groups.length; gi++) {
    const group = input.groups[gi]
    const validIngredients = group.ingredients.filter((i) => i.name.trim())
    if (!group.name.trim() && validIngredients.length === 0) continue

    const { data: groupRow } = await supabase
      .from('ingredient_groups')
      .insert({ recipe_id: recipeId, name: group.name, position: gi })
      .select('id')
      .single()

    if (!groupRow) continue

    if (validIngredients.length > 0) {
      const { data: ingRows } = await supabase.from('ingredients').insert(
        validIngredients.map((ing, ii) => ({
          recipe_id: recipeId,
          group_id: groupRow.id,
          name: ing.name,
          amount: ing.amount && ing.amount > 0 ? ing.amount : null,
          unit: ing.unit || null,
          ciqual_code: ing.ciqual_code || null,
          weight_g: ing.weight_g && ing.weight_g > 0 ? ing.weight_g : null,
          position: ii,
        })),
      ).select('id')

      ingRows?.forEach((row, ii) => {
        ingDbIds[`${gi}_${ii}`] = row.id
      })
    }
  }

  const validSteps = input.steps.filter((s) => s.content.trim())
  if (validSteps.length > 0) {
    const { data: stepRows } = await supabase.from('steps').insert(
      validSteps.map((step, si) => ({
        recipe_id: recipeId,
        position: si + 1,
        content: step.content,
        image_url: step.image_url || null,
      })),
    ).select('id')

    const stepIngLinks: { step_id: string; ingredient_id: string }[] = []
    validSteps.forEach((step, si) => {
      const stepId = stepRows?.[si]?.id
      if (!stepId) return
      step.ingredient_positions.forEach(({ gi, ii }) => {
        const ingId = ingDbIds[`${gi}_${ii}`]
        if (ingId) stepIngLinks.push({ step_id: stepId, ingredient_id: ingId })
      })
    })

    if (stepIngLinks.length > 0) {
      await supabase.from('step_ingredients').insert(stepIngLinks)
    }
  }
}
