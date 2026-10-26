'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function upsertReview(recipeId: string, rating: number | null, comment: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }

  const trimmedComment = comment.trim() || null
  if (!rating && !trimmedComment) return { error: 'Note ou commentaire requis' }

  const { error } = await supabase
    .from('recipe_reviews')
    .upsert(
      { recipe_id: recipeId, user_id: user.id, rating, comment: trimmedComment, updated_at: new Date().toISOString() },
      { onConflict: 'recipe_id,user_id' },
    )

  if (error) return { error: error.message }
  revalidatePath(`/recipes/${recipeId}`)
  return { error: null }
}

export async function deleteReview(recipeId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }

  const { error } = await supabase
    .from('recipe_reviews')
    .delete()
    .eq('recipe_id', recipeId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath(`/recipes/${recipeId}`)
  return { error: null }
}
