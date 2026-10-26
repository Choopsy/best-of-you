'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const full_name = (formData.get('full_name') as string)?.trim()
  const avatar_url = (formData.get('avatar_url') as string)?.trim() || null

  await Promise.all([
    supabase.from('profiles').update({ full_name, avatar_url }).eq('id', user.id),
    supabase.auth.updateUser({ data: { full_name } }),
  ])

  redirect('/profile?message=Profil mis à jour.')
}

export async function changePassword(formData: FormData) {
  const password = formData.get('password') as string
  const confirm = formData.get('confirm_password') as string

  if (password !== confirm) {
    redirect('/profile?error=Les mots de passe ne correspondent pas.')
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })

  if (error) redirect(`/profile?error=${encodeURIComponent(error.message)}`)
  redirect('/profile?message=Mot de passe mis à jour.')
}
