'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

/** Met à jour la liste des amis avec qui une recette est partagée. */
export async function setRecipeShares(recipeId: string, friendIds: string[]): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }

  const { data: current } = await supabase.from('recipe_shares').select('user_id').eq('recipe_id', recipeId).eq('shared_by', user.id)
  const now = new Set((current ?? []).map((r) => r.user_id))
  const wanted = new Set(friendIds)
  const toAdd = [...wanted].filter((id) => !now.has(id))
  const toRemove = [...now].filter((id) => !wanted.has(id))

  if (toAdd.length) {
    // La sécurité de la base refuse si la recette n'est pas à moi ou si ce n'est pas un ami
    const { error } = await supabase.from('recipe_shares').insert(toAdd.map((user_id) => ({ recipe_id: recipeId, user_id, shared_by: user.id })))
    if (error) return { error: error.message }
  }
  if (toRemove.length) {
    const { error } = await supabase.from('recipe_shares').delete().eq('recipe_id', recipeId).in('user_id', toRemove)
    if (error) return { error: error.message }
  }
  revalidatePath(`/recipes/${recipeId}`)
  return { error: null }
}
