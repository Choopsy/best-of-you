// Liste de courses : rangée par rayon, corrections et ordre du foyer, utilisable sans réseau
import { B, check, newPage, shot } from '../helpers.mjs'

export default async function ({ browser, db }) {
  const { ctx, page, errors } = await newPage(browser)
  const headings = () => page.locator('main section[aria-label] h2').allInnerTexts()

  // 1. Ajout de quelques articles → rangés par rayon
  await page.goto(B + '/courses'); await page.waitForLoadState('networkidle')
  for (const a of ['Tomates', 'Lessive', 'Lait', 'Pain de mie', 'Petits pois surgelés', 'Ampoule']) {
    await page.locator('#new-item').fill(a); await page.locator('#new-item').press('Enter'); await page.waitForTimeout(500)
  }
  await page.waitForTimeout(1500)
  console.log('    rayons :', (await headings()).map((h) => h.split(' ·')[0]).join(' | '))
  check((await headings()).length >= 5, 'Articles groupés par rayon')
  await shot(page, 'courses-rayons', { fullPage: true })

  // 2. Changer le rayon du lait → Boissons, mémorisé
  await page.getByRole('button', { name: 'Options pour Lait' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Boissons' }).click()
  const lait = await page.locator('section[aria-label="Boissons"]').getByText('Lait', { exact: true }).waitFor({ timeout: 6000 }).then(() => 1, () => 0)
  check(lait === 1, 'Lait déplacé en Boissons')
  const ov = (await db.query(`SELECT name_norm, aisle FROM aisle_overrides`)).rows
  check(ov.some((r) => r.name_norm === 'lait' && r.aisle === 'boissons'), `Correction mémorisée pour le foyer ${JSON.stringify(ov)}`)

  // 3. Ordre du magasin : Entretien en premier
  await page.getByRole('button', { name: 'Ordre des rayons' }).click()
  for (let i = 0; i < 12; i++) {
    const up = page.getByRole('button', { name: 'Monter Entretien' })
    if (await up.isDisabled()) break
    await up.click()
  }
  await page.getByRole('button', { name: 'Enregistrer' }).click(); await page.waitForTimeout(1500)
  check((await headings())[0]?.toLowerCase().startsWith('entretien'), 'Entretien en premier après réglage')

  // 4. Le service worker est installé et a gardé une copie
  await page.reload(); await page.waitForLoadState('networkidle'); await page.waitForTimeout(2500)
  const sw = await page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration()))
  const cached = await page.evaluate(async () => !!(await caches.match('/courses')))
  check(sw && cached, `Service worker installé (${sw}) et liste gardée (${cached})`)

  // 5. Hors connexion : coche + ajout
  await ctx.setOffline(true)
  await page.getByRole('checkbox', { name: /Tomates/ }).click()
  await page.locator('#new-item').fill('Beurre'); await page.locator('#new-item').press('Enter')
  await page.waitForTimeout(800)
  check(await page.getByText(/Hors connexion/).count() > 0, 'Bandeau hors connexion affiché')

  // 6. Rouvrir la page sans réseau (comme en magasin)
  await page.goto(B + '/courses').catch((e) => console.log('  goto:', e.message))
  await page.waitForTimeout(2000)
  const beurre = await page.getByText('Beurre', { exact: true }).count()
  const tomChecked = await page.getByRole('checkbox', { name: /Tomates/ }).getAttribute('aria-checked').catch(() => null)
  check(beurre > 0 && tomChecked === 'true', `Page rouverte sans réseau, changements conservés (beurre ${beurre}, tomates cochées ${tomChecked})`)
  // coche encore hors ligne après réouverture → l'appli est bien interactive
  await page.getByRole('checkbox', { name: /Lessive/ }).click(); await page.waitForTimeout(300)
  check((await page.getByRole('checkbox', { name: /Lessive/ }).getAttribute('aria-checked')) === 'true', 'Toujours utilisable après réouverture hors ligne')
  await page.goto(B + '/').catch(() => {}); await page.waitForTimeout(1000)
  check(await page.getByText('Ouvrir ma liste de courses').count() > 0, 'Autre page hors ligne → page « Pas de connexion »')
  await page.getByText('Ouvrir ma liste de courses').click(); await page.waitForTimeout(1500)

  // 7. Retour du réseau → envoi
  await ctx.setOffline(false)
  await page.waitForTimeout(4000)
  const rows = (await db.query(`SELECT name, checked FROM shopping_items ORDER BY name`)).rows
  console.log('    en base :', rows.map((r) => `${r.name}${r.checked ? ' ✓' : ''}`).join(', '))
  check(rows.find((r) => r.name === 'Tomates')?.checked && rows.find((r) => r.name === 'Lessive')?.checked && rows.some((r) => r.name === 'Beurre'),
    'Au retour du réseau, coches et ajout envoyés')
  check(await page.getByText(/Hors connexion|Envoi de/).count() === 0, 'Bandeau disparu')

  // 8. Déconnexion → copie effacée
  await page.goto(B + '/login').catch(() => {})
  await ctx.clearCookies(); await page.goto(B + '/login'); await page.waitForTimeout(1500)
  const left = await page.evaluate(async () => ({ cache: !!(await caches.match('/courses')), ls: Object.keys(localStorage).filter((k) => k.startsWith('dignis:courses:')).length }))
  check(!left.cache && left.ls === 0, `Copie effacée à la déconnexion ${JSON.stringify(left)}`)

  check(errors.length === 0, `aucune erreur JavaScript ${errors.slice(0, 3).join(' | ')}`)
}
