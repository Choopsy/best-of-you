// Créer un aliment sans code-barres : pour 100 g ou pour 1 portion (fast-food), poids de portion
import { B, check, newPage, openAddFood, shot, textOf } from '../helpers.mjs'

export default async function ({ browser }) {
  const { page, errors } = await newPage(browser)
  const dlg = page.getByRole('dialog', { name: 'Ajouter au journal' })
  const create = async (name) => {
    await openAddFood(page)
    await dlg.getByPlaceholder(/yaourt nature/).fill(name)
    await page.keyboard.press('Escape')
    await dlg.getByRole('button', { name: 'Pas dans la liste ? Créer un aliment' }).click()
  }
  const addBtn = () => dlg.getByRole('button', { name: 'Ajouter', exact: true })
  const journal = async () => { await page.waitForTimeout(800); return textOf(page.locator('main')) }

  // Pour 100 g (salade traiteur)
  await create('Salade du pêcheur')
  check(await dlg.locator('#pn').inputValue() === 'Salade du pêcheur', 'nom prérempli avec la recherche')
  check(await dlg.getByText('Code lu').count() === 0, 'pas de « Code lu » sans code-barres')
  await dlg.locator('#n-energy_kcal').fill('125'); await dlg.locator('#n-proteins_g').fill('6.7')
  await addBtn().click(); await dlg.waitFor({ state: 'hidden', timeout: 8000 })
  check((await journal()).includes('Salade du pêcheur'), 'ajouté au journal')

  // Pour 1 portion (menu fast-food)
  await create('Menu Chicken Louisiane')
  await dlg.getByRole('radio', { name: '1 portion' }).click()
  await dlg.locator('#n-energy_kcal').fill('1264'); await dlg.locator('#n-proteins_g').fill('43')
  check(await dlg.locator('label[for="sg"]').innerText() === 'Portions', '« 1 portion » : la quantité passe en portions')
  check((await textOf(dlg)).includes('≈ 1 264 kcal'), 'aperçu ≈ 1 264 kcal')
  check(await dlg.getByRole('radio', { name: 'Grammes' }).count() === 0, 'pas de « Grammes » sans poids connu')
  await shot(page, 'aliment-portion')
  await addBtn().click(); await dlg.waitFor({ state: 'hidden', timeout: 8000 })
  const j = await journal()
  check(/Menu Chicken Louisiane[\s\S]{0,40}1 portion/.test(j) && j.includes('1 264 kcal'), 'journal : « 1 portion », 1 264 kcal')

  // Retrouvé dans la recherche, demi-portion
  await openAddFood(page)
  await dlg.getByPlaceholder(/yaourt nature/).fill('Louisiane')
  check(await dlg.getByText('kcal/portion').first().waitFor({ timeout: 5000 }).then(() => true, () => false), 'recherche : « kcal/portion »')
  await dlg.getByRole('option', { name: /Menu Chicken Louisiane/ }).first().click()
  await dlg.locator('#grams').fill('0.5')
  check((await textOf(dlg)).includes('≈ 632 kcal'), 'demi-portion : ≈ 632 kcal')
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Fermer' }).first().click().catch(() => {})

  // Pour 100 g avec un pot de 125 g
  await page.goto(B + '/journal')
  await create('Yaourt brebis')
  await dlg.locator('#n-energy_kcal').fill('60'); await dlg.locator('#pg').fill('125')
  await dlg.getByRole('radio', { name: 'Portions' }).click()
  await dlg.locator('#sg').fill('2')
  check((await textOf(dlg)).includes('250 g · ≈ 150 kcal'), '2 pots de 125 g : 250 g · ≈ 150 kcal')
  await addBtn().click(); await dlg.waitFor({ state: 'hidden', timeout: 8000 })
  check((await journal()).includes('2 portions (250 g)'), 'journal : « 2 portions (250 g) »')

  // Valeurs de portion saisies « pour 100 g »
  await create('Pizza entière')
  await dlg.locator('#n-energy_kcal').fill('2100')
  await addBtn().click()
  check(await dlg.getByText(/Choisis « 1 portion »/).waitFor({ timeout: 6000 }).then(() => true, () => false), '2 100 kcal « pour 100 g » : propose « 1 portion »')
  check(errors.length === 0, `aucune erreur JavaScript ${errors.join(' | ')}`)
}
