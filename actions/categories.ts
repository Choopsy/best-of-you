'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { CategoryVisibility } from '@/lib/types'

async function getDb() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isAdmin = user?.email === process.env.ADMIN_EMAIL
  return { supabase: isAdmin ? createAdminClient() : supabase, user }
}

export async function createCategory(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const name = (formData.get('name') as string)?.trim()
  if (!name) return { error: 'Le nom est obligatoire.' }

  await supabase.from('profiles').upsert(
    { id: user.id, full_name: user.user_metadata?.full_name ?? null },
    { onConflict: 'id', ignoreDuplicates: true },
  )

  const visibility = (formData.get('visibility') as CategoryVisibility) ?? 'private'
  const coverUrl = (formData.get('cover_image_url') as string)?.trim() || null

  const { data, error } = await supabase
    .from('categories')
    .insert({ author_id: user.id, name, visibility, cover_image_url: coverUrl })
    .select('id')
    .single()

  if (error || !data) return { error: error?.message ?? 'Erreur lors de la création.' }

  if (visibility === 'shared') {
    const memberIdsJson = formData.get('member_ids') as string | null
    const memberIds: string[] = memberIdsJson ? JSON.parse(memberIdsJson) : []
    if (memberIds.length > 0) {
      await supabase.from('category_members').insert(
        memberIds.map((user_id) => ({ category_id: data.id, user_id })),
      )
    }
  }

  redirect(`/categories/${data.id}`)
}

export async function updateCategory(id: string, formData: FormData) {
  const { supabase, user } = await getDb()
  if (!user) redirect('/login')

  const name = (formData.get('name') as string)?.trim()
  if (!name) return { error: 'Le nom est obligatoire.' }

  const visibility = (formData.get('visibility') as CategoryVisibility) ?? 'private'
  const coverUrl = (formData.get('cover_image_url') as string)?.trim() || null

  const { error } = await supabase
    .from('categories')
    .update({ name, visibility, cover_image_url: coverUrl })
    .eq('id', id)

  if (error) return { error: error.message }

  if (visibility === 'shared') {
    const memberIdsJson = formData.get('member_ids') as string | null
    const newIds = new Set<string>(memberIdsJson ? JSON.parse(memberIdsJson) : [])

    const { data: current } = await supabase
      .from('category_members')
      .select('user_id')
      .eq('category_id', id)

    const currentIds = new Set((current ?? []).map((r) => r.user_id))
    const toAdd = [...newIds].filter((uid) => !currentIds.has(uid))
    const toRemove = [...currentIds].filter((uid) => !newIds.has(uid))

    await Promise.all([
      toAdd.length > 0
        ? supabase.from('category_members').insert(toAdd.map((user_id) => ({ category_id: id, user_id })))
        : null,
      ...toRemove.map((uid) =>
        supabase.from('category_members').delete().eq('category_id', id).eq('user_id', uid),
      ),
    ].filter(Boolean))
  } else {
    await supabase.from('category_members').delete().eq('category_id', id)
  }

  redirect(`/categories/${id}`)
}

export async function deleteCategory(id: string) {
  const { supabase, user } = await getDb()
  if (!user) redirect('/login')
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) return { error: error.message }
  redirect('/')
}

export async function addCategoryMember(categoryId: string, userId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }

  const { error } = await supabase
    .from('category_members')
    .insert({ category_id: categoryId, user_id: userId })

  if (error) return { error: error.message }
  revalidatePath(`/categories/${categoryId}/edit`)
  return { error: null }
}

export async function removeCategoryMember(categoryId: string, userId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }

  const { error } = await supabase
    .from('category_members')
    .delete()
    .eq('category_id', categoryId)
    .eq('user_id', userId)

  if (error) return { error: error.message }
  revalidatePath(`/categories/${categoryId}/edit`)
  return { error: null }
}
