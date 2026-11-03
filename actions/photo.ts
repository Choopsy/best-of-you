'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type Result = { error: string | null }

const enc = encodeURIComponent

/** Accord pour l'envoi de la photo à Anthropic (première utilisation). Impossible sans accès activé. */
export async function acceptPhotoConsent(): Promise<Result> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('accept_photo_consent')
  if (error) return { error: error.message }
  revalidatePath('/journal')
  return { error: null }
}

/** Retrait de l'accord (Profil > Mes données) : la photo du repas redemandera l'accord. */
export async function withdrawPhotoConsent() {
  const supabase = await createClient()
  const { error } = await supabase.rpc('withdraw_photo_consent')
  if (error) redirect(`/profile/donnees?error=${enc(error.message)}`)
  revalidatePath('/journal')
  redirect(`/profile/donnees?message=${enc('Accord retiré : plus aucune photo ne sera envoyée sans ton nouvel accord.')}`)
}
