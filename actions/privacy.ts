'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const enc = encodeURIComponent
const BUCKET = 'recipe-images'

/** Accord explicite pour les données de santé (comptes créés avant sa mise en place). */
export async function giveHealthConsent(formData: FormData) {
  if (formData.get('health_consent') !== 'on') {
    redirect(`/consentement?error=${enc('Coche la case pour donner ton accord.')}`)
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { error } = await supabase.from('health_profiles')
    .update({ health_consent_at: new Date().toISOString() }).eq('user_id', user.id)
  if (error) redirect(`/consentement?error=${enc(error.message)}`)
  revalidatePath('/', 'layout')
  redirect('/')
}

/** Retrait de l'accord : efface profil santé, poids, séances et journal. */
export async function withdrawHealthConsent(formData: FormData) {
  const from = formData.get('from') === 'consentement' ? '/consentement' : '/profile/donnees'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { error } = await supabase.rpc('withdraw_health_data')
  if (error) redirect(`${from}?error=${enc(error.message)}`)
  revalidatePath('/', 'layout')
  redirect(`/profile/donnees?message=${enc('Tes données de santé ont été effacées. Les recettes, le frigo et le foyer restent disponibles.')}`)
}

/** Supprime toutes les photos de l'utilisateur (dossier à son nom), page par page. */
async function deleteMyFiles(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  for (let round = 0; round < 20; round++) {
    const { data, error } = await supabase.storage.from(BUCKET).list(userId, { limit: 100 })
    if (error) throw new Error(error.message)
    const files = (data ?? []).filter((f) => f.id) // les sous-dossiers n'ont pas d'id
    if (files.length === 0) return
    const { error: rmError } = await supabase.storage.from(BUCKET).remove(files.map((f) => `${userId}/${f.name}`))
    if (rmError) throw new Error(rmError.message)
  }
}

/** Suppression définitive du compte et de tout son contenu. */
export async function deleteAccount(formData: FormData) {
  if (String(formData.get('confirm') ?? '').trim().toUpperCase() !== 'SUPPRIMER') {
    redirect(`/profile/donnees?error=${enc('Écris SUPPRIMER en majuscules pour confirmer.')}#supprimer`)
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  try {
    await deleteMyFiles(supabase, user.id)
  } catch {
    redirect(`/profile/donnees?error=${enc('Impossible de supprimer tes photos pour le moment. Réessaie dans un instant.')}#supprimer`)
  }

  const { error } = await supabase.rpc('delete_my_account')
  if (error) redirect(`/profile/donnees?error=${enc(`La suppression a échoué : ${error.message}`)}#supprimer`)

  // Le compte n'existe plus : on efface aussi la session du navigateur
  await supabase.auth.signOut({ scope: 'local' })
  redirect(`/login?message=${enc('Ton compte et toutes tes données ont été supprimés. Merci d\'avoir utilisé l\'appli.')}`)
}
