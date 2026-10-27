/** Tests du bilan de la semaine — npx tsx scripts/test-weekly.ts */
import assert from 'node:assert/strict'
import { delta, pickTip, reviewWeek, type DayIntake } from '../lib/weekly'
import { shiftDate } from '../lib/dates'

let n = 0
const test = (name: string, fn: () => void) => { fn(); n++; console.log('✓', name) }
const MON = '2026-10-19'
const week = (vals: (Partial<DayIntake> | null)[]): DayIntake[] => vals.map((v, i) => ({
  date: shiftDate(MON, i), kcal: v?.kcal ?? 0, proteins_g: v?.proteins_g ?? 0, fiber_g: v?.fiber_g ?? 0, logged: v != null,
}))
const base = {
  start: MON, until: shiftDate(MON, 6), kcalTargetFor: () => 2000, proteinTarget: 80, fiberTarget: 30,
  activities: [], sessionsGoal: 3, weightChange: null,
}

test('Moyennes sur les seuls jours notés', () => {
  const r = reviewWeek({ ...base, days: week([{ kcal: 2000, proteins_g: 80 }, null, { kcal: 1800, proteins_g: 60 }, null, null, null, null]) })
  assert.equal(r.loggedDays, 2)
  assert.equal(r.avgKcal, 1900)
  assert.equal(r.avgProtein, 70)
  assert.equal(r.elapsedDays, 7)
})

test('Jours proches de l\'objectif : ±10 %, avec l\'objectif du jour (sport compris)', () => {
  const r = reviewWeek({
    ...base,
    kcalTargetFor: (d) => (d === shiftDate(MON, 1) ? 2500 : 2000),
    days: week([{ kcal: 2150 }, { kcal: 2400 }, { kcal: 1700 }, null, null, null, null]),
  })
  assert.equal(r.daysOnTarget, 2) // 2150/2000 oui, 2400/2500 oui, 1700/2000 non
  assert.equal(r.avgKcalTarget, 2166.6666666666665)
})

test('Semaine en cours : jours à venir ignorés', () => {
  const r = reviewWeek({ ...base, until: shiftDate(MON, 2), days: week([{ kcal: 2000 }, { kcal: 2000 }, { kcal: 2000 }, { kcal: 9999 }, null, null, null]) })
  assert.equal(r.elapsedDays, 3)
  assert.equal(r.avgKcal, 2000)
})

test('Sport : séances de la semaine seulement, minutes soutenues comptées double', () => {
  const r = reviewWeek({
    ...base, days: week([null, null, null, null, null, null, null]),
    activities: [
      { done_on: shiftDate(MON, 0), duration_min: 30, met: 9.3, activity_key: 'run_10' },
      { done_on: shiftDate(MON, 3), duration_min: 40, met: 3.5, activity_key: 'strength' },
      { done_on: shiftDate(MON, -1), duration_min: 60, met: 9.3, activity_key: 'run_10' }, // semaine d'avant
    ],
  })
  assert.equal(r.sessions, 2)
  assert.equal(r.activeMinutes, 100)
  assert.equal(r.strengthDays, 1)
})

test('Une seule piste, dans l\'ordre de priorité', () => {
  const low = week([{ kcal: 2000, proteins_g: 50, fiber_g: 30 }, { kcal: 2000, proteins_g: 55, fiber_g: 30 }, { kcal: 2000, proteins_g: 60, fiber_g: 30 }, { kcal: 2000, proteins_g: 85, fiber_g: 30 }, null, null, null])
  assert.equal(pickTip(reviewWeek({ ...base, days: low }), 80, 30).title, 'Les protéines')
  const fiber = week([{ proteins_g: 90, fiber_g: 10 }, { proteins_g: 90, fiber_g: 12 }, { proteins_g: 90, fiber_g: 14 }, null, null, null, null])
  assert.equal(pickTip(reviewWeek({ ...base, days: fiber }), 80, 30).title, 'Les fibres')
  const ok = week([{ proteins_g: 90, fiber_g: 30 }, { proteins_g: 90, fiber_g: 30 }, { proteins_g: 90, fiber_g: 30 }, null, null, null, null])
  const tip = pickTip(reviewWeek({ ...base, days: ok }), 80, 30)
  assert.equal(tip.title, 'Bouger un peu plus')
  assert.ok(tip.text.includes('150 minutes'))
  assert.equal(pickTip(reviewWeek({ ...base, days: week([{}, null, null, null, null, null, null]) }), 80, 30).title, 'Noter un peu plus')
})

test('Comparaison avec la semaine d\'avant', () => {
  assert.equal(delta(1850.4, 1900), -50)
  assert.equal(delta(-0.34, 0.1, 1), -0.4)
  assert.equal(delta(null, 3), null)
})

console.log(`\n${n} tests OK`)
