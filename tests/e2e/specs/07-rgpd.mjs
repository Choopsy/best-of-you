// Données et vie privée : politique, accord santé, export, retrait de l'accord, suppression du compte
import { readFileSync } from 'node:fs'
import { ALICE, B, BOB, check, newPage } from '../helpers.mjs'

export default async function ({ browser, db }) {
  const one = async (sql, p = []) => (await db.query(sql, p)).rows[0]
  const errors = []
  const ctxFor = async (user) => {
    const r = await newPage(browser, { user, downloads: true })
    r.page.on('pageerror', (e) => errors.push(e.message))
    return r
  }
  // 0. Visiteur : politique lisible, inscription avec case
  {
    const { page } = await ctxFor(null)
    await page.goto(B + '/confidentialite')
    await page.getByRole('heading', { name: 'Tes données et ta vie privée' }).waitFor(); check(true, 'Politique lisible sans compte')
    await page.goto(B + '/register')
    await page.locator('#full_name').fill('Test'); await page.locator('#email').fill('t@t.fr')
    await page.locator('#password').fill('Abcdef1!'); await page.locator('#confirm_password').fill('Abcdef1!')
    const before = await page.getByRole('button', { name: 'Créer mon compte' }).isDisabled()
    await page.locator('input[name=privacy]').check()
    const after = await page.getByRole('button', { name: 'Créer mon compte' }).isDisabled()
    check(before && !after, "Inscription bloquée tant que la case n'est pas cochée")
  }

  // 1. Alice : profil existant sans accord → page d'accord
  await db.query(`UPDATE health_profiles SET health_consent_at = NULL WHERE user_id = '${ALICE}'`)
  const alice = await ctxFor(ALICE)
  {
    const { page } = alice
    await page.goto(B + '/journal')
    await page.waitForURL('**/consentement'); check(true, 'Profil sans accord → demande d\'accord')
    check(await page.getByRole('button', { name: 'Donner mon accord' }).isDisabled(), 'Bouton désactivé tant que non coché')
    await page.locator('input[name=health_consent]').check()
    await page.getByRole('button', { name: 'Donner mon accord' }).click()
    await page.waitForURL(B + '/'); check(true, 'Accord donné → accueil')
    const r = await one(`SELECT health_consent_at FROM health_profiles WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000001'`)
    check(!!r.health_consent_at, "Date d'accord enregistrée")

    // 2. Export
    await page.goto(B + '/profile/donnees')
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('link', { name: 'Télécharger (JSON)' }).click()])
    const json = JSON.parse(readFileSync(await dl.path(), 'utf8'))
    console.log('    export :', dl.suggestedFilename(), '| sections', Object.keys(json).join(', '),
      '| recettes', json.kitchen.recipes.length, '| frigo', json.household.fridge.length, '| pesées', json.health.weights.length,
      '| ingrédients 1re recette', json.kitchen.recipes[0]?.ingredient_groups?.[0]?.ingredients?.length)
    check(json.kitchen.recipes.length > 0 && json.health.weights.length > 0 && dl.suggestedFilename().startsWith('dignis-mes-donnees-'), 'export JSON : recettes, santé, nom du fichier')

    // 3. Retrait de l'accord
    await page.getByRole('button', { name: 'Retirer mon accord' }).click()
    await page.getByRole('button', { name: 'Effacer' }).click()
    await page.getByText('Tes données de santé ont été effacées').waitFor(); check(true, 'Retrait confirmé')
    const c = await one(`SELECT (SELECT count(*) FROM health_profiles WHERE user_id = $1) h, (SELECT count(*) FROM weight_logs WHERE user_id = $1) w, (SELECT count(*) FROM food_logs WHERE user_id = $1) f, (SELECT count(*) FROM recipes WHERE author_id = $1) r`, ['aaaaaaaa-0000-0000-0000-000000000001'])
    check(c.h == 0 && c.w == 0 && c.f == 0 && c.r > 0, 'Santé effacée, recettes gardées')
    await page.goto(B + '/')
    await page.waitForURL('**/onboarding')
    check(await page.locator('input[name=health_consent]').count() > 0, "Le profil santé redemande l'accord")
  }

  // 4. Bob supprime son compte
  {
    const { page } = await ctxFor(BOB)
    await page.goto(B + '/profile/donnees')
    check(await page.getByRole('button', { name: 'Supprimer définitivement mon compte' }).isDisabled(), 'Suppression bloquée sans SUPPRIMER')
    await page.locator('#confirm-delete').fill('supprimer')
    await page.getByRole('button', { name: 'Supprimer définitivement mon compte' }).click()
    await page.waitForURL('**/login**'); check(true, 'Compte supprimé → page de connexion')
    // L'adresse change avant que la page soit affichée : on attend le message
    check(await page.getByText('Ton compte et toutes tes données ont été supprimés').waitFor({ timeout: 10000 }).then(() => true, () => false), 'Message de confirmation')
    const b = await one(`SELECT (SELECT count(*) FROM auth.users WHERE id = $1) u, (SELECT count(*) FROM profiles WHERE id = $1) p`, ['bbbbbbbb-0000-0000-0000-000000000002'])
    check(b.u == 0 && b.p == 0, 'Bob effacé de la base')
  }

  check(errors.length === 0, `aucune erreur JavaScript ${errors.join(' | ')}`)
}
