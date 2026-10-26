'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { todayISO, isISODate } from '@/lib/dates'
import { ageFromBirthDate, LOSS_RATES } from '@/lib/targets'

const ACTIVITY = ['sedentary', 'moderate', 'active', 'very_active']
const GOALS = ['lose', 'maintain', 'gain_muscle']
const DIETS = ['omnivore', 'pescatarian', 'vegetarian', 'vegan']
const EXCLUSIONS = ['gluten', 'lactose']

function num(v: FormDataEntryValue | null): number | null {
  if (v == null || String(v).trim() === '') return null
  const n = Number(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function safePath(p: string | null) {
  return p && p.startsWith('/') && !p.startsWith('//') ? p : '/profile/health'
}

export async function saveHealthProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const back = safePath(String(formData.get('back') ?? ''))
  const next = safePath(String(formData.get('next') ?? back))
  function fail(msg: string): never {
    redirect(`${back}?error=${encodeURIComponent(msg)}`)
  }

  const sex = String(formData.get('sex') ?? '')
  const birthDate = String(formData.get('birth_date') ?? '')
  const height = num(formData.get('height_cm'))
  const weight = num(formData.get('weight_kg'))
  const activity = String(formData.get('activity_level') ?? '')
  const goal = String(formData.get('goal') ?? 'maintain')
  const rate = num(formData.get('goal_rate_kg_week'))
  const targetWeight = num(formData.get('target_weight_kg'))
  const diet = String(formData.get('diet') ?? 'omnivore')
  const exclusions = formData.getAll('exclusions').map(String).filter((e) => EXCLUSIONS.includes(e))
  const sessions = num(formData.get('weekly_sessions_goal'))
  const sportMode = String(formData.get('sport_mode') ?? 'included') === 'logged' ? 'logged' : 'included'

  if (sex !== 'male' && sex !== 'female') fail('Indique ton sexe (utilisé par l\'équation du métabolisme).')
  if (!isISODate(birthDate)) fail('Indique ta date de naissance.')
  const age = ageFromBirthDate(birthDate)
  if (age < 18) fail('Les objectifs nutritionnels de l\'appli sont prévus pour les adultes (18 ans et plus).')
  if (age > 100) fail('Date de naissance invalide.')
  if (height == null || height < 120 || height > 230) fail('Indique une taille entre 120 et 230 cm.')
  if (weight == null || weight < 35 || weight > 250) fail('Indique un poids entre 35 et 250 kg.')
  if (!ACTIVITY.includes(activity)) fail('Choisis ton niveau d\'activité.')
  if (!GOALS.includes(goal)) fail('Choisis un objectif.')
  if (!DIETS.includes(diet)) fail('Choisis un régime.')
  if (targetWeight != null && (targetWeight < 35 || targetWeight > 250)) fail('Poids cible invalide.')
  if (sessions != null && (sessions < 0 || sessions > 21)) fail('Nombre de séances invalide.')

  // Accord explicite (RGPD art. 9) : déjà donné, ou coché dans ce formulaire
  const { data: existing } = await supabase.from('health_profiles').select('health_consent_at').eq('user_id', user.id).maybeSingle()
  const consentAt = existing?.health_consent_at ?? (formData.get('health_consent') === 'on' ? new Date().toISOString() : null)
  if (!consentAt) fail('Coche la case d\'accord pour que tes données de santé puissent être enregistrées.')

  const { error } = await supabase.from('health_profiles').upsert({
    user_id: user.id,
    sex,
    birth_date: birthDate,
    height_cm: height,
    activity_level: activity,
    goal,
    goal_rate_kg_week: goal === 'lose' ? (LOSS_RATES.find((r) => r === rate) ?? 0.5) : null,
    target_weight_kg: targetWeight,
    diet,
    exclusions,
    weekly_sessions_goal: sessions != null ? Math.round(sessions) : null,
    sport_mode: sportMode,
    health_consent_at: consentAt,
    updated_at: new Date().toISOString(),
  })
  if (error) fail(error.message)

  // Le poids saisi devient la pesée du jour (une par jour)
  const { data: last } = await supabase
    .from('weight_logs').select('weight_kg').eq('user_id', user.id)
    .order('logged_on', { ascending: false }).limit(1).maybeSingle()
  if (!last || Number(last.weight_kg) !== weight) {
    const { error: wErr } = await supabase.from('weight_logs').upsert(
      { user_id: user.id, logged_on: todayISO(), weight_kg: weight },
      { onConflict: 'user_id,logged_on' },
    )
    if (wErr) fail(wErr.message)
  }

  revalidatePath('/', 'layout')
  redirect(`${next}${next.includes('?') ? '&' : '?'}message=${encodeURIComponent('Profil enregistré, objectifs mis à jour.')}`)
}
