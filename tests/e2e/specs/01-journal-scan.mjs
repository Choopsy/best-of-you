// Scan d'un code-barres depuis le journal : Open Food Facts lent ou en panne, produit gardé pour la suite
import { SKYR, check, mockOff, newPage, openAddFood, shot, typeBarcode } from '../helpers.mjs'

export default async function ({ browser }) {
  const { page, errors } = await newPage(browser)
  let mode = 'busy-then-ok'
  const calls = await mockOff(page, (code, n) => {
    if (mode === 'down') return 'down'
    if (mode === 'busy-then-ok' && n === 1) return 'busy'
    return code === '1234567890128' ? null : SKYR
  })
  const dlg = page.getByRole('dialog', { name: 'Ajouter au journal' })
  const scan = async (code) => {
    await openAddFood(page)
    await dlg.getByRole('button', { name: /Scanner/ }).first().click()
    await typeBarcode(page, code)
  }

  await scan('5690527000014')
  check(await dlg.getByText('Skyr nature').first().waitFor({ timeout: 15000 }).then(() => true, () => false),
    `trouvé malgré un premier refus d'Open Food Facts (${calls.n} appels)`)
  check(await dlg.getByText('150 g · ≈ 95 kcal').count() === 1, 'portion de 150 g reprise d\'Open Food Facts, proposée par défaut')
  await dlg.getByRole('button', { name: 'Ajouter', exact: true }).click()
  await dlg.waitFor({ state: 'hidden', timeout: 8000 })

  calls.n = 0; mode = 'down'
  await scan('5690527000014')
  check(await dlg.getByText('Skyr nature').first().waitFor({ timeout: 8000 }).then(() => calls.n === 0, () => false),
    're-scan : retrouvé dans les produits du foyer, sans appeler Open Food Facts')

  await scan('3017620422003')
  check(await page.getByText(/ne répond pas/).waitFor({ timeout: 25000 }).then(() => true, () => false),
    'panne : « Open Food Facts ne répond pas » (et non « produit inconnu »)')
  mode = 'ok'
  await page.getByRole('button', { name: 'Réessayer' }).click()
  check(await dlg.getByText('Skyr nature').first().waitFor({ timeout: 10000 }).then(() => true, () => false), 'Réessayer : trouvé')

  await scan('1234567890128')
  check(await page.getByText('Code lu').waitFor({ timeout: 10000 }).then(() => true, () => false), 'produit inconnu : le code lu est affiché')
  await shot(page, 'journal-scan-inconnu')
  check(errors.length === 0, `aucune erreur JavaScript ${errors.join(' | ')}`)
}
