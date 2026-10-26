'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) redirect('/')
}

export async function inviteUser(formData: FormData) {
  await assertAdmin()
  const email = formData.get('email') as string
  const full_name = formData.get('full_name') as string
  const admin = createAdminClient()
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name },
  })
  if (error) redirect(`/admin?error=${encodeURIComponent(error.message)}`)
  redirect(`/admin?message=${encodeURIComponent(`Invitation envoyée à ${email}`)}`)
}

export async function deleteUser(userId: string) {
  await assertAdmin()
  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) redirect(`/admin?error=${encodeURIComponent(error.message)}`)
  redirect('/admin')
}

export async function toggleContribute(userId: string, current: boolean) {
  await assertAdmin()
  const supabase = await createClient()
  await supabase.from('profiles').update({ can_contribute: !current }).eq('id', userId)
  redirect('/admin')
}

export async function deleteRecipeAdmin(userId: string, recipeId: string) {
  await assertAdmin()
  const admin = createAdminClient()
  await admin.from('recipes').delete().eq('id', recipeId)
  revalidatePath(`/admin/users/${userId}`)
  redirect(`/admin/users/${userId}`)
}

export async function deleteCategoryAdmin(userId: string, categoryId: string) {
  await assertAdmin()
  const admin = createAdminClient()
  await admin.from('categories').delete().eq('id', categoryId)
  revalidatePath(`/admin/users/${userId}`)
  redirect(`/admin/users/${userId}`)
}

export async function deleteReviewAdmin(userId: string, reviewId: string) {
  await assertAdmin()
  const admin = createAdminClient()
  await admin.from('recipe_reviews').delete().eq('id', reviewId)
  revalidatePath(`/admin/users/${userId}`)
  redirect(`/admin/users/${userId}`)
}

export async function resetUserPassword(userId: string, _prevState: { error?: string; success?: boolean }, formData: FormData): Promise<{ error?: string; success?: boolean }> {
  await assertAdmin()
  const password = formData.get('password') as string
  const confirm = formData.get('confirm') as string
  if (password.length < 8) return { error: 'Le mot de passe doit faire au moins 8 caractères.' }
  if (password !== confirm) return { error: 'Les mots de passe ne correspondent pas.' }
  const admin = createAdminClient()
  const { error } = await admin.auth.admin.updateUserById(userId, { password })
  if (error) return { error: error.message }
  return { success: true }
}
