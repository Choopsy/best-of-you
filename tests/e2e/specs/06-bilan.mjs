// Bilan de la semaine : moyennes sur les jours notés, comparaison avec la semaine d'avant, clair et sombre
import { ALICE, B, check, newPage, shot, textOf } from '../helpers.mjs'

const iso = (d) => d.toISOString().slice(0, 10)
const addDays = (d, n) => new Date(d.getTime() + n * 86400000)

export default async function ({ browser, db }) {
  // Lundi de la semaine dernière (dates « jour », sans heure)
  const now = new Date(); const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
  const monday = addDays(today, -((today.getUTCDay() + 6) % 7) - 7)
  const log = (d, kcal, p, f) => db.query(`INSERT INTO food_logs (user_id, eaten_on, meal, label, energy_kcal, proteins_g, carbs_g, sugars_g, fat_g, saturated_fat_g, fiber_g, salt_g)
    VALUES ($1, $2, 'lunch', 'Repas', $3, $4, 0, 0, 0, 0, $5, 0)`, [ALICE, iso(d), kcal, p, f])
  // Semaine dernière : 6 jours notés (pas le jeudi) ; celle d'avant : 3 jours
  for (const [i, k, p, f] of [[0, 1650, 62, 21], [1, 1580, 70, 18], [2, 1700, 58, 25], [4, 1600, 66, 22], [5, 2100, 75, 19], [6, 1620, 60, 24]]) await log(addDays(monday, i), k, p, f)
  for (const [i, k] of [[-7, 1500], [-5, 1900], [-2, 1700]]) await log(addDays(monday, i), k, 58, 17)
  for (const [i, key, min, met] of [[1, 'run_10', 30, 9.3], [3, 'strength', 45, 3.5], [5, 'walk_brisk', 40, 4.8]])
    await db.query(`INSERT INTO activities (user_id, done_on, activity_key, label, duration_min, met, kcal_net) VALUES ($1, $2, $3, $3, $4, $5, 200)`, [ALICE, iso(addDays(monday, i)), key, min, met])

  for (const theme of ['light', 'dark']) {
    const { ctx, page, errors } = await newPage(browser, { theme })
    await page.goto(B + '/bilan'); await page.getByText('Alimentation').waitFor()
    await shot(page, `bilan-${theme}`, { fullPage: true })
    if (theme === 'light') {
      const t = await textOf(page.locator('main'))
      check(t.includes('6 jours notés sur 7'), 'semaine dernière : 6 jours notés sur 7')
      check(t.includes('Plus régulier que la semaine d\'avant (3 jours)'), 'comparaison avec la semaine d\'avant')
      check(/Séances\s*3/.test(t), '3 séances comptées')
      await page.getByRole('link', { name: 'Semaine suivante' }).click()
      check(await page.getByText('Semaine en cours').waitFor({ timeout: 6000 }).then(() => true, () => false), 'flèche : semaine en cours')
      await page.goto(B + '/forme'); await page.getByRole('link', { name: /Bilan complet/ }).click()
      check(await page.getByText('Semaine en cours').waitFor({ timeout: 6000 }).then(() => true, () => false), 'lien depuis Forme')
    }
    check(errors.length === 0, `${theme === 'dark' ? 'thème sombre' : 'thème clair'} : aucune erreur JavaScript ${errors.join(' | ')}`)
    await ctx.close()
  }
}
