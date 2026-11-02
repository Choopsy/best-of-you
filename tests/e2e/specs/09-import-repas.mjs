// Import d'un repas depuis un fichier JSON : réservé (Alice oui, Bob non), aperçu, choix du repas, ajout au journal
import { ALICE, B, BOB, check, newPage, shot, textOf } from '../helpers.mjs'

const file = (name, data) => ({ name, mimeType: 'application/json', buffer: Buffer.from(typeof data === 'string' ? data : JSON.stringify(data)) })

export default async function ({ browser, db }) {
  // Bob n'est pas dans MEAL_IMPORT_USERS : ni lien, ni page
  {
    const { ctx, page } = await newPage(browser, { user: BOB })
    await page.goto(B + '/profile/donnees'); await page.getByRole('heading', { name: 'Mes données', exact: true }).waitFor()
    check(await page.getByRole('link', { name: /Importer un repas/ }).count() === 0, "autre compte : pas de lien vers l'import")
    // Avec le chargement progressif (loading.tsx), le code HTTP part avant notFound() : on vérifie l'écran
    await page.goto(B + '/journal/importer'); await page.waitForLoadState('networkidle')
    const form = await page.getByLabel('Fichier du repas').count()
    const heading = await page.getByRole('heading', { name: 'Importer un repas' }).count()
    const lost = await page.getByRole('heading', { name: 'Page introuvable' }).count()
    check(form === 0 && heading === 0 && lost === 1, `autre compte : page introuvable (formulaire ${form}, titre ${heading})`)
    await shot(page, 'import-repas-refuse')
    await ctx.close()
  }

  const { ctx, page, errors } = await newPage(browser)
  await page.goto(B + '/profile/donnees')
  await page.getByRole('link', { name: /Importer un repas/ }).click()
  await page.getByRole('heading', { name: 'Importer un repas' }).waitFor()
  const input = page.getByLabel('Fichier du repas')

  // Fichier invalide : message clair, pas de bouton d'ajout
  await input.setInputFiles(file('faux.json', '{ "nom": "Pizza" }'))
  check(await page.getByRole('alert').filter({ hasText: 'nutriments' }).waitFor({ timeout: 5000 }).then(() => true, () => false), 'fichier incomplet : erreur expliquée')
  check(await page.locator('main').getByRole('button', { name: /Ajouter/ }).count() === 0, 'pas de bouton « Ajouter » sur un fichier invalide')

  // Fichier valide : deux plats, repas « diner » repris du fichier
  await input.setInputFiles(file('resto.json', {
    type: 'repas', repas: 'diner',
    plats: [
      { nom: 'Pavé de saumon, riz', grammes: 380, nutriments: { kcal: 720, proteines: 42, glucides: 70, lipides: 26 } },
      { nom: 'Fondant au chocolat', nutriments: { kcal: 430, sucres: 38, satures: 14 } },
    ],
  }))
  const preview = page.getByRole('region', { name: 'Aperçu' })
  await preview.waitFor({ timeout: 5000 })
  const t = await textOf(preview)
  check(t.includes('Pavé de saumon, riz') && t.includes('1 150 kcal'), `aperçu : 2 plats, total 1 150 kcal`)
  check(await page.getByRole('radio', { name: 'Dîner', exact: true }).getAttribute('aria-checked') === 'true', 'repas du fichier présélectionné (Dîner)')
  await shot(page, 'import-repas', { fullPage: true })

  await page.getByRole('radio', { name: 'Déjeuner', exact: true }).click()
  await page.getByRole('button', { name: 'Ajouter les 2 plats au journal' }).click()
  await page.waitForURL('**/journal', { timeout: 10000 })
  const rows = (await db.query(`SELECT label, meal, energy_kcal::int AS kcal, grams::int AS g FROM food_logs WHERE user_id = $1 AND label IN ('Pavé de saumon, riz', 'Fondant au chocolat') ORDER BY label`, [ALICE])).rows
  check(rows.length === 2 && rows.every((r) => r.meal === 'lunch'), `enregistrés au déjeuner choisi à l'écran ${JSON.stringify(rows)}`)
  check(rows.find((r) => r.label === 'Pavé de saumon, riz')?.g === 380, 'grammes repris du fichier')
  check(await page.getByText('Fondant au chocolat').first().isVisible(), 'visible dans le journal')

  check(errors.length === 0, `aucune erreur JavaScript ${errors.join(' | ')}`)
  await ctx.close()
}
