'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

async function auth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return { supabase, user }
}

export async function saveCollection(id: string | null, formData: FormData): Promise<{ error: string } | void> {
  const { supabase, user } = await auth()
  const name = String(formData.get('name') ?? '').trim()
  const cover = String(formData.get('cover_image_url') ?? '').trim() || null
  if (!name) return { error: 'Le nom est obligatoire.' }

  if (id) {
    const { error } = await supabase.from('collections').update({ name, cover_image_url: cover }).eq('id', id).eq('owner_id', user.id)
    if (error) return { error: error.message }
    revalidatePath('/collections')
    redirect(`/collections/${id}`)
  }

  const { data, error } = await supabase
    .from('collections')
    .insert({ owner_id: user.id, name, cover_image_url: cover })
    .select('id')
    .single()
  if (error || !data) return { error: error?.message ?? 'Erreur lors de la création.' }
  revalidatePath('/collections')
  redirect(`/collections/${data.id}`)
}

export async function deleteCollection(id: string): Promise<{ error: string } | void> {
  const { supabase, user } = await auth()
  const { error } = await supabase.from('collections').delete().eq('id', id).eq('owner_id', user.id)
  if (error) return { error: error.message }
  revalidatePath('/collections')
  redirect('/collections')
}
