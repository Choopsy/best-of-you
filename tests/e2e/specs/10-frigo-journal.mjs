// Le frigo suit le journal : produit scanné relié et cherchable, retrait à l'ajout, remise à la suppression
import { ALICE, B, SKYR, check, mockOff, newPage, openAddFood, shot, textOf, typeBarcode } from '../helpers.mjs'

let HH = null
const qty = async (db, name) => (await db.query(`SELECT quantity::float AS q FROM fridge_items WHERE household_id = $1 AND name = $2`, [HH, name])).rows[0]?.q ?? null
const count = async (db, name) => Number((await db.query(`SELECT count(*) AS n FROM fridge_items WHERE household_id = $1 AND name = $2`, [HH, name])).rows[0].n)

export default async function ({ browser, db }) {
  HH = (await db.query(`SELECT household_id FROM household_members WHERE user_id = $1`, [ALICE])).rows[0].household_id
  const { page, errors } = await newPage(browser)
  await mockOff(page, () => SKYR)

  // 1. Scan au frigo : le produit rejoint « Mes produits » et reste relié à l'article
  await page.goto(B + '/frigo?add=1')
  const sheet = page.getByRole('dialog', { name: 'Ajouter au frigo' })
  await sheet.waitFor()
  await sheet.getByRole('button', { name: 'Scanner le code-barres' }).click()
  await typeBarcode(page, '5690527000014')
  await sheet.getByText('Produit enregistré dans « Mes produits ».').waitFor({ timeout: 10000 })
  await sheet.locator('#fq').fill('500'); await sheet.locator('#fu').selectOption('g')
  await sheet.getByRole('button', { name: /^Ajouter|Enregistrer/ }).last().click()
  await sheet.waitFor({ state: 'hidden', timeout: 8000 })
  const linked = (await db.query(`SELECT f.name, f.custom_food_id IS NOT NULL AS linked FROM fridge_items f WHERE f.household_id = $1 AND f.name LIKE 'Skyr nature%'`, [HH])).rows
  check(linked.length === 1 && linked[0].linked, `frigo : produit scanné relié (${JSON.stringify(linked)})`)
  const skyr = linked[0]?.name

  // 2. Journal : le produit est cherchable, 1 portion (150 g) proposée en retrait, cochée par défaut
  const dlg = await openAddFood(page)
  await dlg.getByPlaceholder(/yaourt nature/).fill('Skyr')
  await dlg.getByRole('option', { name: /Skyr nature/ }).first().click().catch(async () => { await dlg.getByText(/Skyr nature/).first().click() })
  // Le Skyr a une portion connue (150 g) : « 1 portion » est proposé par défaut
  const panel = dlg.getByRole('region', { name: 'Pris dans le frigo' })
  check(await panel.waitFor({ timeout: 8000 }).then(() => true, () => false), 'proposition « Pris dans le frigo » affichée')
  const t = await textOf(panel)
  check(/500 g → il en restera 350 g/.test(t), `retrait calculé : ${t.replace(/\s+/g, ' ')}`)
  check(await panel.getByRole('checkbox').first().getAttribute('aria-checked') === 'true', 'coché par défaut')
  await shot(page, 'frigo-journal-proposition')
  await dlg.getByRole('button', { name: 'Ajouter', exact: true }).click()
  await dlg.waitFor({ state: 'hidden', timeout: 8000 })
  check(await qty(db, skyr) === 350, `frigo : 500 g → 350 g (${await qty(db, skyr)})`)

  // 3. Suppression de l'entrée : l'effet inverse
  // Pas de rechargement : l'adresse garde ?add=1 et la fenêtre d'ajout se rouvrirait
  await page.goto(B + '/journal'); await page.waitForLoadState('networkidle')
  await page.getByRole('listitem').filter({ hasText: 'Skyr nature' }).getByRole('button', { name: 'Supprimer' }).first().click()
  await page.waitForTimeout(1500)
  check(await qty(db, skyr) === 500, `suppression : le frigo revient à 500 g (${await qty(db, skyr)})`)

  // 4. Article sans quantité : « C'est fini » le retire, la suppression le remet
  await db.query(`INSERT INTO fridge_items (household_id, name) VALUES ($1, 'Skyr maison')`, [HH])
  await db.query(`DELETE FROM fridge_items WHERE household_id = $1 AND name = $2`, [HH, skyr])
  const dlg2 = await openAddFood(page)
  await dlg2.getByPlaceholder(/yaourt nature/).fill('Skyr')
  await dlg2.getByRole('option', { name: /Skyr nature/ }).first().click().catch(async () => { await dlg2.getByText(/Skyr nature/).first().click() })
  const panel2 = dlg2.getByRole('region', { name: 'Pris dans le frigo' })
  await panel2.waitFor({ timeout: 8000 })
  check((await textOf(panel2)).includes('Il en reste ?'), 'quantité inconnue : on demande s\'il en reste')
  await panel2.getByRole('radio', { name: 'C\'est fini' }).click()
  await dlg2.getByRole('button', { name: 'Ajouter', exact: true }).click()
  await dlg2.waitFor({ state: 'hidden', timeout: 8000 })
  check(await count(db, 'Skyr maison') === 0, '« C\'est fini » : retiré du frigo')
  // Pas de rechargement : l'adresse garde ?add=1 et la fenêtre d'ajout se rouvrirait
  await page.goto(B + '/journal'); await page.waitForLoadState('networkidle')
  await page.getByRole('listitem').filter({ hasText: 'Skyr nature' }).getByRole('button', { name: 'Supprimer' }).first().click()
  await page.waitForTimeout(1500)
  check(await count(db, 'Skyr maison') === 1, 'suppression : l\'article revient au frigo')

  // 5. Recette : les ingrédients (farine, lait) sont retirés pour la part mangée, et rendus à la suppression
  const FARINE = 'Farine de blé tendre ou froment T55 (pour pains)', LAIT = 'Lait demi-écrémé, pasteurisé'
  const before = { farine: await qty(db, FARINE), lait: await qty(db, LAIT) }
  await openAddFood(page)
  const dlg3 = page.getByRole('dialog', { name: 'Ajouter au journal' })
  await dlg3.getByRole('tab', { name: 'Recette' }).click()
  await dlg3.getByRole('button', { name: 'Crêpes protéinées' }).click()
  const panel3 = dlg3.getByRole('region', { name: 'Pris dans le frigo' })
  await panel3.waitFor({ timeout: 8000 })
  const t3 = await textOf(panel3)
  check(t3.includes('Farine') && t3.includes('Lait'), `recette : farine et lait proposés (${t3.replace(/\s+/g, ' ')})`)
  await shot(page, 'frigo-journal-recette')
  await dlg3.getByRole('button', { name: 'Ajouter', exact: true }).click()
  await dlg3.waitFor({ state: 'hidden', timeout: 8000 })
  const after = { farine: await qty(db, FARINE), lait: await qty(db, LAIT) }
  check(after.farine < before.farine && (after.lait ?? 0) < before.lait, `recette : frigo diminué ${JSON.stringify(before)} → ${JSON.stringify(after)}`)
  await page.goto(B + '/journal'); await page.waitForLoadState('networkidle')
  await page.getByRole('listitem').filter({ hasText: 'Crêpes protéinées' }).getByRole('button', { name: 'Supprimer' }).first().click()
  await page.waitForTimeout(1500)
  const back = { farine: await qty(db, FARINE), lait: await qty(db, LAIT) }
  check(back.farine === before.farine && back.lait === before.lait, `recette supprimée : frigo rendu ${JSON.stringify(back)}`)

  check(errors.length === 0, `aucune erreur JavaScript ${errors.join(' | ')}`)
}
