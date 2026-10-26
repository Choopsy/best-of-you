/**
 * Tendance du poids : moyenne mobile exponentielle (lissage de 10 % par jour),
 * comme dans les applis de suivi sérieuses. Une pesée isolée bouge à cause de
 * l'eau, du sel ou de la digestion ; la tendance montre la vraie direction.
 * Les jours sans pesée sont comblés par interpolation linéaire.
 */
import { daysBetween, shiftDate } from './dates'

export interface WeighIn { logged_on: string; weight_kg: number }
export interface TrendPoint { date: string; weight: number | null; trend: number }

const ALPHA = 0.1

export function weightTrend(weighIns: WeighIn[]): TrendPoint[] {
  const sorted = [...weighIns].sort((a, b) => a.logged_on.localeCompare(b.logged_on))
  if (sorted.length === 0) return []
  const byDate = new Map(sorted.map((w) => [w.logged_on, Number(w.weight_kg)]))
  const first = sorted[0].logged_on
  const last = sorted[sorted.length - 1].logged_on
  const span = daysBetween(first, last)

  const points: TrendPoint[] = []
  let trend = Number(sorted[0].weight_kg)
  let prevIdx = 0
  for (let i = 0; i <= span; i++) {
    const date = shiftDate(first, i)
    let value = byDate.get(date)
    const measured = value != null
    if (value == null) {
      // interpolation entre la pesée précédente et la suivante
      const next = sorted.find((w) => w.logged_on > date)!
      const prev = sorted[prevIdx]
      const t = daysBetween(prev.logged_on, date) / daysBetween(prev.logged_on, next.logged_on)
      value = Number(prev.weight_kg) + t * (Number(next.weight_kg) - Number(prev.weight_kg))
    } else {
      prevIdx = sorted.findIndex((w) => w.logged_on === date)
    }
    trend = i === 0 ? value : trend + ALPHA * (value - trend)
    points.push({ date, weight: measured ? value : null, trend: Math.round(trend * 100) / 100 })
  }
  return points
}

/** Variation de la tendance sur les 7 derniers jours (kg/semaine), si assez de recul. */
export function weeklyRate(points: TrendPoint[]): number | null {
  if (points.length < 8) return null
  const a = points[points.length - 8].trend
  const b = points[points.length - 1].trend
  return Math.round((b - a) * 10) / 10
}
