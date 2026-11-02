/** Outils communs aux scénarios de tests/e2e/specs. */
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { ROOT } from '../support/db.mjs'
import { ALICE, tokenFor, USERS } from './stack.mjs'

export const B = 'http://localhost:3100'
export const CAPTURES = path.join(ROOT, 'tests/e2e/captures')
export { ALICE, BOB } from './stack.mjs'

const results = { ok: 0, ko: [] }
export const results_ = results

/** Vérification : affiche ✓ ou ✗ et compte les échecs (le lanceur renvoie une erreur s'il y en a). */
export function check(cond, msg) {
  if (cond) { results.ok++; console.log('  ✓', msg) } else { results.ko.push(msg); console.log('  ✗', msg) }
}

/** Texte d'un élément, espaces insécables normalisés (les nombres français en contiennent). */
export const textOf = async (locator) => (await locator.innerText()).replace(/ | /g, ' ')

export async function shot(page, name, opts = {}) {
  mkdirSync(CAPTURES, { recursive: true })
  await page.screenshot({ path: path.join(CAPTURES, `${name}.png`), ...opts })
}

/**
 * Nouvel onglet de téléphone (390 × 844) connecté avec `user` (null = visiteur).
 * Par défaut : animation d'ouverture et présentation déjà vues, pour ne pas gêner les clics.
 */
export async function newPage(browser, { user = ALICE, tourSeen = true, theme, downloads = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, acceptDownloads: downloads })
  const cookies = []
  if (user) {
    const token = tokenFor(user)
    const exp = JSON.parse(Buffer.from(token.split('.')[1], 'base64url')).exp
    const session = { access_token: token, token_type: 'bearer', expires_in: 86400, expires_at: exp, refresh_token: 'x', user: { id: user, email: USERS[user].email } }
    cookies.push({ name: 'sb-localhost-auth-token', value: 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url'), domain: 'localhost', path: '/' })
  }
  if (theme) cookies.push({ name: 'theme', value: theme, domain: 'localhost', path: '/' })
  if (cookies.length) await ctx.addCookies(cookies)
  await ctx.addInitScript(([uid, seen]) => {
    try {
      sessionStorage.setItem('eq-splash', '1')
      if (seen && uid) localStorage.setItem(`dignis:tour:${uid}`, '1')
    } catch { /* stockage indisponible */ }
  }, [user, tourSeen])
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  return { ctx, page, errors }
}

/**
 * Faux Open Food Facts : `respond(code)` renvoie le produit (format OFF), null (inconnu),
 * 'busy' (503) ou 'down' (réseau coupé). Compte les appels.
 */
export async function mockOff(page, respond) {
  const calls = { n: 0 }
  await page.route('https://world.openfoodfacts.org/**', async (route) => {
    calls.n++
    const code = route.request().url().match(/product\/(\d+)/)?.[1]
    const r = await respond(code, calls.n)
    if (r === 'down') return route.abort('failed')
    if (r === 'busy') return route.fulfill({ status: 503, headers: { 'access-control-allow-origin': '*' }, body: '<html>busy</html>' })
    return route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' },
      body: JSON.stringify(r ? { status: 1, product: r } : { status: 0 }) })
  })
  return calls
}

export const SKYR = {
  product_name_fr: 'Skyr nature', brands: 'Siggi', serving_quantity: 150,
  nutriments: { 'energy-kcal_100g': 63, proteins_100g: 11, carbohydrates_100g: 4, sugars_100g: 4, fat_100g: 0.2, 'saturated-fat_100g': 0.1, fiber_100g: 0, salt_100g: 0.1 },
}

/** Journal → Ajouter → Un repas → onglet Aliment */
export async function openAddFood(page) {
  await page.goto(B + '/journal'); await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Ajouter', exact: true }).first().click()
  await page.waitForTimeout(400)
  if (await page.getByRole('button', { name: /Un repas/ }).count()) await page.getByRole('button', { name: /Un repas/ }).click()
  const dlg = page.getByRole('dialog', { name: 'Ajouter au journal' })
  await dlg.waitFor({ timeout: 8000 })
  await dlg.getByRole('tab', { name: 'Aliment' }).click()
  return dlg
}

/** Scanner : la caméra n'existe pas dans le navigateur de test, on tape le code. */
export async function typeBarcode(page, code) {
  await page.locator('#manual-code').waitFor({ timeout: 6000 }).catch(async () => { await page.getByText('Saisir le code à la main').click() })
  await page.locator('#manual-code').fill(code)
  await page.getByRole('button', { name: 'OK', exact: true }).click()
}
