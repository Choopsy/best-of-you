'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LEGAL } from '@/lib/legal'
import { APP_NAME } from '@/lib/brand'

async function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  const proto = h.get('x-forwarded-proto') ?? 'http'
  return `${proto}://${host}`
}

const enc = encodeURIComponent

export async function signIn(formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get('email') ?? ''),
    password: String(formData.get('password') ?? ''),
  })
  if (error) redirect(`/login?error=${enc('Email ou mot de passe incorrect.')}`)
  redirect('/')
}

export async function signUp(formData: FormData) {
  const fullName = String(formData.get('full_name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const confirm = String(formData.get('confirm_password') ?? '')

  if (!fullName || !email) redirect(`/register?error=${enc('Nom et email obligatoires.')}`)
  if (password.length < 8) redirect(`/register?error=${enc('Le mot de passe doit faire au moins 8 caractères.')}`)
  if (password !== confirm) redirect(`/register?error=${enc('Les mots de passe ne correspondent pas.')}`)
  // Vérifié ici aussi : les cases du formulaire se contournent facilement
  if (formData.get('adult') !== 'on') redirect(`/register?error=${enc(`${APP_NAME} est réservé aux personnes de ${LEGAL.minAge} ans et plus.`)}`)
  if (formData.get('privacy') !== 'on') redirect(`/register?error=${enc('Accepte les conditions d\'utilisation et lis la politique de confidentialité pour créer ton compte.')}`)

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Trace de l'information donnée (versions lues et acceptées) et de l'âge déclaré
      data: {
        full_name: fullName, privacy_version: LEGAL.version, terms_version: LEGAL.termsVersion,
        privacy_accepted_at: new Date().toISOString(), adult_confirmed: true,
      },
      emailRedirectTo: `${await siteUrl()}/auth/callback?next=/onboarding`,
    },
  })
  if (error) redirect(`/register?error=${enc(error.message)}`)

  // Confirmation par email activée dans Supabase : pas encore de session
  if (!data.session) {
    redirect(`/login?message=${enc('Compte créé ! Clique sur le lien reçu par email pour l\'activer.')}`)
  }
  redirect('/onboarding')
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim()
  if (!email) redirect(`/forgot-password?error=${enc('Indique ton email.')}`)
  const supabase = await createClient()
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await siteUrl()}/auth/callback?next=/set-password`,
  })
  // Même message que l'email existe ou non (ne pas révéler les comptes existants)
  redirect(`/login?message=${enc('Si un compte existe pour cet email, un lien de réinitialisation vient d\'être envoyé.')}`)
}

export async function setPassword(formData: FormData) {
  const password = String(formData.get('password') ?? '')
  const confirm = String(formData.get('confirm_password') ?? '')

  if (password.length < 8) redirect(`/set-password?error=${enc('Le mot de passe doit faire au moins 8 caractères.')}`)
  if (password !== confirm) redirect(`/set-password?error=${enc('Les mots de passe ne correspondent pas.')}`)

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })
  if (error) redirect(`/set-password?error=${enc(error.message)}`)
  redirect('/')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
