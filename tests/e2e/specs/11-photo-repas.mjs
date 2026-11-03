// Photo du repas : accès réservé, accord, analyse (fausse API Anthropic), correction, ajout au journal, panne, quota
import { fakeClaude } from '../stack.mjs'
import { ALICE, B, BOB, check, newPage, shot, textOf } from '../helpers.mjs'

const ASSIETTE = [
  { nom: 'Riz blanc cuit', grammes: 150, confiance: 'haute' },
  { nom: 'Poulet rôti', grammes: 120, confiance: 'moyenne' },
  { nom: 'Haricots verts cuits', grammes: 100, confiance: 'basse' },
]
const kcalOf = (t) => Number((t.match(/≈ ([\d ]+) kcal/)?.[1] ?? '').replace(/\s/g, '')) || null
const usedToday = async (db) => (await db.query(
  `SELECT count(*)::int AS n FROM photo_analyses WHERE user_id = $1 AND created_at >= date_trunc('day', now() AT TIME ZONE 'Europe/Paris') AT TIME ZONE 'Europe/Paris'`, [ALICE])).rows[0].n

export default async function ({ browser, db, anthropic }) {
  // Bob n'est pas activé : ni bouton, ni analyse en appelant la route directement
  {
    const { ctx, page } = await newPage(browser, { user: BOB })
    await page.goto(B + '/journal'); await page.waitForLoadState('networkidle')
    check(await page.getByRole('button', { name: /Photo du repas/ }).count() === 0, 'sans accès : pas de bouton « Photo du repas »')
    const png = await page.screenshot()
    const res = await page.request.post(B + '/api/meal-photo', { multipart: { photo: { name: 'a.png', mimeType: 'image/png', buffer: png } } })
    check(res.status() === 403 && (await res.json()).code === 'no_access', `sans accès : la route refuse (${res.status()})`)
    check(anthropic.calls.length === 0, 'sans accès : aucun appel à Anthropic')
    await ctx.close()
  }

  const { ctx, page, errors } = await newPage(browser)
  await page.goto(B + '/journal'); await page.waitForLoadState('networkidle')
  check(await page.getByRole('button', { name: /Photo du repas/ }).count() === 0, 'Alice pas encore activée : pas de bouton')

  // Cheun active Alice dans le SQL Editor
  await db.query('INSERT INTO photo_access (user_id) VALUES ($1)', [ALICE])
  await page.reload(); await page.waitForLoadState('networkidle')
  const open = page.getByRole('button', { name: /Photo du repas/ })
  check(await open.count() === 1, 'activée : bouton visible')
  check((await textOf(open)).includes('Encore 3 photos aujourd\'hui'), 'photos restantes affichées (3)')

  // Accord à la première utilisation
  await open.click()
  const dlg = page.getByRole('dialog', { name: 'Photo du repas' })
  await dlg.waitFor()
  const consentText = await textOf(dlg)
  check(consentText.includes('Anthropic') && consentText.includes('supprimée') && consentText.includes('estimations à vérifier'), 'accord : envoi à Anthropic, suppression, estimations')
  await shot(page, 'photo-repas-accord')
  await dlg.getByRole('button', { name: 'J\'accepte' }).click()
  await dlg.getByRole('button', { name: 'Prendre la photo' }).waitFor()
  check((await db.query('SELECT consent_at FROM photo_access WHERE user_id = $1', [ALICE])).rows[0].consent_at != null, 'accord enregistré en base')

  // Analyse : la fausse API renvoie trois aliments
  anthropic.respond = () => fakeClaude(ASSIETTE)
  await dlg.getByRole('button', { name: 'Dîner', exact: true }).click()
  const photo = { name: 'assiette.png', mimeType: 'image/png', buffer: await page.screenshot() }
  await page.getByLabel('Choisir une photo').setInputFiles(photo)
  const rows = dlg.locator('ul[aria-label="Aliments du repas"] > li')
  await rows.first().waitFor({ timeout: 15000 })
  check(await rows.count() === 3, `3 aliments proposés (${await rows.count()})`)
  const call = anthropic.calls[0]
  check(call?.content.includes('image') && call?.model === 'claude-haiku-5-5' && call?.outputConfig?.format?.type === 'json_schema',
    `appel : image, modèle par défaut, sortie JSON imposée ${JSON.stringify(call)}`)
  const [riz, poulet] = [await textOf(rows.nth(0)), await textOf(rows.nth(1))]
  check(kcalOf(riz) && kcalOf(poulet), `riz et poulet reliés à la base (kcal calculées) : ${riz.replace(/\n/g, ' ')} | ${poulet.replace(/\n/g, ' ')}`)
  check(riz.includes('Vu : « Riz blanc cuit »'), 'ce que l\'IA a vu reste affiché')
  check((await textOf(dlg)).includes('Encore 2 photos aujourd\'hui'), 'il reste 2 photos')
  check(await usedToday(db) === 1, 'une analyse décomptée en base')
  await shot(page, 'photo-repas-verification', { fullPage: true })

  // Correction des grammes : kcal recalculées en direct
  const before = kcalOf(riz)
  const totalBefore = kcalOf(await textOf(dlg.getByLabel('Total du repas')))
  await rows.nth(0).getByRole('spinbutton').fill('300')
  const after = kcalOf(await textOf(rows.nth(0)))
  check(after === Math.round(before * 2) || Math.abs(after - before * 2) <= 1, `300 g au lieu de 150 : kcal doublées (${before} → ${after})`)
  check(kcalOf(await textOf(dlg.getByLabel('Total du repas'))) > totalBefore, 'total recalculé')

  // Retirer les haricots, ajouter une pomme à la main
  await rows.nth(2).getByRole('button', { name: /^Retirer / }).click()
  await dlg.getByRole('button', { name: 'Ajouter une ligne' }).click()
  const added = rows.nth(2)
  await added.getByRole('textbox').fill('pomme')
  await added.getByRole('option').first().click()
  await added.getByRole('spinbutton').fill('150')
  check(await rows.count() === 3 && kcalOf(await textOf(added)) > 0, 'ligne retirée, ligne ajoutée et reliée')
  await shot(page, 'photo-repas-corrige', { fullPage: true })

  await dlg.getByRole('button', { name: 'Ajouter au repas' }).click()
  await dlg.waitFor({ state: 'detached', timeout: 10000 })
  const logs = (await db.query(
    `SELECT l.label, l.meal, l.grams::int AS g, l.energy_kcal::int AS kcal, l.ciqual_code, round(c.energy_kcal * l.grams / 100)::int AS ciqual_kcal
     FROM food_logs l LEFT JOIN canonical_ingredients c ON c.ciqual_code = l.ciqual_code
     WHERE l.user_id = $1 AND l.meal = 'dinner' ORDER BY l.created_at`, [ALICE])).rows
  check(logs.length === 3 && logs.every((l) => l.meal === 'dinner'), `3 aliments ajoutés au dîner ${JSON.stringify(logs)}`)
  check(logs[0]?.g === 300, 'grammes corrigés enregistrés (300 g)')
  check(logs.every((l) => l.ciqual_code && Math.abs(l.kcal - l.ciqual_kcal) <= 1), 'kcal enregistrées = valeurs Ciqual, pas celles de l\'IA')
  // Échoue encore de temps en temps (Next 16 garde parfois l'ancienne page) : voir SUIVI.md
  check(await page.getByText(logs[0]?.label ?? '—').first().waitFor({ timeout: 8000 }).then(() => true, () => false), 'visible dans le journal')
  await shot(page, 'photo-repas-journal', { fullPage: true })

  // Panne de l'API : message clair, analyse non décomptée
  anthropic.respond = () => fakeClaude([], { status: 500 })
  await open.click(); await dlg.waitFor()
  await page.getByLabel('Choisir une photo').setInputFiles(photo)
  const alert = dlg.getByRole('alert')
  await alert.waitFor({ timeout: 15000 })
  check((await textOf(alert)).includes('pas décomptée'), 'panne : message « pas décomptée »')
  check(await usedToday(db) === 1, 'panne : toujours une seule analyse décomptée')
  await shot(page, 'photo-repas-panne')
  await dlg.getByRole('button', { name: 'Fermer' }).click()

  // Quota : deux autres analyses aujourd'hui → plus rien, même en appelant la route
  await db.query(`INSERT INTO photo_analyses (user_id, release_hash) VALUES ($1, 'e2e'), ($1, 'e2e')`, [ALICE])
  await page.reload(); await page.waitForLoadState('networkidle')
  check((await textOf(open)).includes('Plus de photo aujourd\'hui'), 'quota atteint : affiché sur le bouton')
  await open.click(); await dlg.waitFor()
  check(await dlg.getByRole('button', { name: 'Prendre la photo' }).isDisabled(), 'quota atteint : prise de photo désactivée')
  await shot(page, 'photo-repas-quota')
  const calls = anthropic.calls.length
  anthropic.respond = () => fakeClaude(ASSIETTE)
  const res = await page.request.post(B + '/api/meal-photo', { multipart: { photo } })
  check(res.status() === 429 && (await res.json()).code === 'quota', `quota atteint : la route refuse (${res.status()})`)
  check(anthropic.calls.length === calls, 'quota atteint : aucun appel à Anthropic')

  // Mes données : export (dates seulement) et retrait de l'accord
  const exp = await (await page.request.get(B + '/api/export')).json()
  check(exp.meal_photo?.analyses_count === 3 && exp.meal_photo?.access?.consent_at, `export : accès, accord et ${exp.meal_photo?.analyses_count} analyses`)
  await page.goto(B + '/profile/donnees'); await page.waitForLoadState('networkidle')
  const section = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Photo du repas' }) })
  check((await textOf(section)).includes('3 analyses'), 'Mes données : section photo avec le nombre d\'analyses')
  await shot(page, 'photo-repas-mes-donnees', { fullPage: true })
  await section.getByRole('button', { name: 'Retirer mon accord pour les photos' }).click()
  await page.waitForURL('**message=**', { timeout: 10000 })
  check((await db.query('SELECT consent_at FROM photo_access WHERE user_id = $1', [ALICE])).rows[0].consent_at == null, 'accord retiré en base')

  check(errors.length === 0, `aucune erreur JavaScript ${errors.join(' | ')}`)
  await ctx.close()
}
