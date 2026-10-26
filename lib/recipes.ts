import type { SupabaseClient } from '@supabase/supabase-js'
import type { RecipeDetail, RecipeSummary } from './types'

/* eslint-disable @typescript-eslint/no-explicit-any */

export const RECIPE_SUMMARY_SELECT = `
  id, title, description, cover_image_url, visibility,
  prep_time_min, cook_time_min, base_servings, difficulty, created_at,
  recipe_tags ( tags ( id, name, color ) ),
  profiles!author_id ( full_name, avatar_url ),
  recipe_reviews ( rating )
`

export function toSummary(r: any): RecipeSummary {
  const ratings = (r.recipe_reviews ?? []).map((rv: any) => rv.rating).filter((v: any) => v != null)
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    cover_image_url: r.cover_image_url,
    prep_time_min: r.prep_time_min,
    cook_time_min: r.cook_time_min,
    base_servings: r.base_servings,
    difficulty: r.difficulty,
    visibility: r.visibility,
    created_at: r.created_at,
    tags: (r.recipe_tags ?? []).map((rt: any) => rt.tags).filter(Boolean),
    author: r.profiles ?? null,
    avg_rating: ratings.length ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length : null,
  }
}

/** Charge une recette complète (si l'utilisateur a le droit de la voir). */
export async function loadRecipe(supabase: SupabaseClient, id: string): Promise<RecipeDetail | null> {
  const { data: raw } = await supabase
    .from('recipes')
    .select(`
      id, author_id, title, description, cover_image_url, visibility,
      prep_time_min, cook_time_min, base_servings, difficulty, created_at,
      recipe_tags ( tags ( id, name, color ) ),
      profiles!author_id ( full_name, avatar_url ),
      ingredient_groups (
        id, name, position,
        ingredients ( id, name, amount, unit, ciqual_code, weight_g, position )
      ),
      steps ( id, position, content, image_url, step_ingredients ( ingredient_id ) )
    `)
    .eq('id', id)
    .maybeSingle()

  if (!raw) return null
  const r = raw as any
  return {
    ...toSummary(r),
    author_id: r.author_id,
    ingredient_groups: (r.ingredient_groups as any[])
      .sort((a, b) => a.position - b.position)
      .map((g) => ({
        id: g.id,
        name: g.name,
        position: g.position,
        ingredients: (g.ingredients as any[])
          .sort((a, b) => a.position - b.position)
          .map((i) => ({
            ...i,
            amount: i.amount != null ? Number(i.amount) : null,
            weight_g: i.weight_g != null ? Number(i.weight_g) : null,
          })),
      })),
    steps: (r.steps as any[])
      .sort((a, b) => a.position - b.position)
      .map((s) => ({
        id: s.id,
        position: s.position,
        content: s.content,
        image_url: s.image_url,
        ingredient_ids: (s.step_ingredients ?? []).map((si: any) => si.ingredient_id),
      })),
  }
}
