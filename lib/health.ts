import type { SupabaseClient } from '@supabase/supabase-js'
import { ageFromBirthDate, computeTargets, validateInput, type DailyTargets } from './targets'
import type { HealthProfile } from './types'
import { todayISO } from './dates'

export interface HealthContext {
  health: HealthProfile | null
  weightKg: number | null
  age: number | null
  /** Le profil a tout ce qu'il faut pour calculer les objectifs */
  complete: boolean
  targets: DailyTargets | null
  /** Raison pour laquelle les objectifs ne sont pas calculés */
  error: string | null
}

export async function getHealthContext(supabase: SupabaseClient, userId: string, date?: string): Promise<HealthContext> {
  const [{ data: health }, { data: weight }] = await Promise.all([
    supabase.from('health_profiles').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('weight_logs').select('weight_kg').eq('user_id', userId)
      .order('logged_on', { ascending: false }).limit(1).maybeSingle(),
  ])

  const h = health as HealthProfile | null
  const weightKg = weight ? Number(weight.weight_kg) : null
  const age = h?.birth_date ? ageFromBirthDate(h.birth_date) : null
  const complete = !!(h?.sex && h.birth_date && h.height_cm && h.activity_level && weightKg)

  if (!complete || !h || age == null || weightKg == null) {
    return { health: h, weightKg, age, complete: false, targets: null, error: null }
  }

  const input = {
    sex: h.sex!,
    ageYears: age,
    heightCm: Number(h.height_cm),
    weightKg,
    activity: h.activity_level!,
    goal: h.goal,
    lossRateKgWeek: h.goal_rate_kg_week != null ? Number(h.goal_rate_kg_week) : null,
  }
  const error = validateInput(input)
  if (error) return { health: h, weightKg, age, complete: true, targets: null, error }

  // Mode « je note mes séances » : la dépense nette du jour s'ajoute à l'objectif
  let exerciseKcal = 0
  if (h.sport_mode === 'logged') {
    const { data: acts } = await supabase.from('activities').select('kcal_net')
      .eq('user_id', userId).eq('done_on', date ?? todayISO())
    exerciseKcal = (acts ?? []).reduce((acc, a) => acc + Number(a.kcal_net), 0)
  }
  return { health: h, weightKg, age, complete: true, targets: computeTargets(input, { exerciseKcal }), error: null }
}
