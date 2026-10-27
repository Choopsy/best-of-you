import type { SupabaseClient } from '@supabase/supabase-js'
import { shiftDate } from './dates'
import type { HealthContext } from './health'
import { weightTrend } from './weight'
import { pickTip, reviewWeek, type DayIntake, type Tip, type WeekReview } from './weekly'

export interface WeekData {
  review: WeekReview
  prev: WeekReview
  days: DayIntake[]
  tip: Tip
  /** Objectif calories moyen (hors sport), pour les ronds des jours */
  baseTarget: number | null
}

/** Charge et calcule le bilan d'une semaine (lundi donné) et de la précédente, en 3 requêtes. */
export async function getWeekData(
  supabase: SupabaseClient, userId: string, monday: string, today: string, ctx: HealthContext,
): Promise<WeekData> {
  const prevMonday = shiftDate(monday, -7)
  const sunday = shiftDate(monday, 6)
  const [{ data: logs }, { data: acts }, { data: weights }] = await Promise.all([
    supabase.from('food_logs').select('eaten_on, energy_kcal, proteins_g, fiber_g')
      .eq('user_id', userId).gte('eaten_on', prevMonday).lte('eaten_on', sunday),
    supabase.from('activities').select('done_on, duration_min, met, activity_key, kcal_net')
      .eq('user_id', userId).gte('done_on', prevMonday).lte('done_on', sunday),
    supabase.from('weight_logs').select('logged_on, weight_kg')
      .eq('user_id', userId).gte('logged_on', shiftDate(prevMonday, -45)).lte('logged_on', sunday),
  ])

  const byDay = new Map<string, DayIntake>()
  for (const l of logs ?? []) {
    const d = byDay.get(l.eaten_on) ?? { date: l.eaten_on, kcal: 0, proteins_g: 0, fiber_g: 0, logged: true }
    d.kcal += Number(l.energy_kcal) || 0
    d.proteins_g += Number(l.proteins_g) || 0
    d.fiber_g += Number(l.fiber_g) || 0
    byDay.set(l.eaten_on, d)
  }
  const daysOf = (start: string) => Array.from({ length: 7 }, (_, i) => {
    const date = shiftDate(start, i)
    return byDay.get(date) ?? { date, kcal: 0, proteins_g: 0, fiber_g: 0, logged: false }
  })

  const activities = (acts ?? []).map((a) => ({ ...a, met: Number(a.met), kcal_net: Number(a.kcal_net) }))
  const exerciseByDay = new Map<string, number>()
  for (const a of activities) exerciseByDay.set(a.done_on, (exerciseByDay.get(a.done_on) ?? 0) + a.kcal_net)
  const t = ctx.targets
  const baseTarget = t ? t.energyKcal - t.exerciseKcal : null
  const logged = ctx.health?.sport_mode === 'logged'
  const kcalTargetFor = (date: string) => (baseTarget == null ? null : baseTarget + (logged ? exerciseByDay.get(date) ?? 0 : 0))

  // Tendance du poids : différence entre la fin de la semaine et la fin de la précédente
  const points = weightTrend((weights ?? []).map((w) => ({ logged_on: w.logged_on, weight_kg: Number(w.weight_kg) })))
  const trendAt = (date: string) => [...points].reverse().find((p) => p.date <= date)?.trend ?? null
  const changeFor = (start: string) => {
    const endDate = shiftDate(start, 6) < today ? shiftDate(start, 6) : today
    const hasWeighIn = points.some((p) => p.weight != null && p.date >= start && p.date <= endDate)
    const a = trendAt(shiftDate(start, -1))
    const b = trendAt(endDate)
    return hasWeighIn && a != null && b != null ? Math.round((b - a) * 10) / 10 : null
  }

  const common = {
    kcalTargetFor, proteinTarget: t?.proteinsG ?? null, fiberTarget: t?.fiberMinG ?? 30,
    activities, sessionsGoal: ctx.health?.weekly_sessions_goal ?? null,
  }
  const days = daysOf(monday)
  const review = reviewWeek({ ...common, start: monday, days, until: sunday < today ? sunday : today, weightChange: changeFor(monday) })
  const prev = reviewWeek({ ...common, start: prevMonday, days: daysOf(prevMonday), until: shiftDate(prevMonday, 6), weightChange: changeFor(prevMonday) })
  return { review, prev, days, tip: pickTip(review, common.proteinTarget, common.fiberTarget), baseTarget }
}
