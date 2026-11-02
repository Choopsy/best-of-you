// Produits du foyer comme ingrédients : créé à la main, scanné, retrouvé par la recherche ; nutrition comptée
import { B, SKYR, check, mockOff, newPage, shot, textOf, typeBarcode } from '../helpers.mjs'

export default async function ({ browser }) {
  const { page, errors } = await newPage(browser)
  await mockOff(page, () => SKYR)
  const section = page.locator('section:has(h2:text("Ingrédients"))')
  const names = () => section.locator('input[autocomplete="off"]').evaluateAll((els) => els.map((e) => e.value))

  await page.goto(B + '/recipes/new'); await page.waitForLoadState('networkidle')
  await page.locator('#title').fill('Panna cotta skyr')
  await page.locator('#servings').fill('4')
  await page.getByText('Choisir...').click(); await page.getByRole('option').first().click()

  // Créé à la main, pot de 200 g
  await section.getByRole('button', { name: 'Créer un produit' }).first().click()
  const sheet = page.getByRole('dialog', { name: 'Créer un produit' })
  await sheet.locator('#pn').fill('Crème Isigny'); await sheet.locator('#n-energy_kcal').fill('300'); await sheet.locator('#pg').fill('200')
  check(await sheet.locator('#sg').count() === 0, 'mode recette : pas de quantité « mangée »')
  await sheet.getByRole('button', { name: 'Utiliser ce produit' }).click()
  await sheet.waitFor({ state: 'hidden', timeout: 6000 })
  check((await names()).includes('Crème Isigny'), 'produit créé : ajouté comme ingrédient')
  check(await page.getByText('Compté en portions du produit (1 = 200 g)').count() === 1, 'indication « 1 = 200 g »')

  // Scanné
  await section.getByRole('button', { name: 'Scanner un produit' }).first().click()
  await typeBarcode(page, '5690527000014')
  const scanSheet = page.getByRole('dialog', { name: 'Produit pour la recette' })
  await scanSheet.getByText('Skyr nature').first().waitFor({ timeout: 10000 })
  await scanSheet.getByRole('button', { name: 'Utiliser ce produit' }).click()
  await scanSheet.waitFor({ state: 'hidden', timeout: 6000 })
  check((await names()).includes('Skyr nature (Siggi)'), 'produit scanné : ajouté comme ingrédient')

  // Recherche : « Mes produits »
  await section.getByRole('button', { name: 'Ajouter un ingrédient' }).first().click()
  await section.locator('input[autocomplete="off"]').last().fill('Isigny')
  const opt = page.getByRole('option', { name: /Mes produits.*Crème Isigny/ }).first()
  check(await opt.waitFor({ timeout: 5000 }).then(() => true, () => false), 'recherche d\'ingrédient : « Mes produits » proposés')
  await opt.click()
  const amounts = section.locator('input[type="number"][placeholder="200"]')
  check(await amounts.last().inputValue() === '1', 'choisi dans la liste : 1 portion proposée')
  await amounts.last().fill('0.5')
  await shot(page, 'recette-produits-formulaire', { fullPage: true })

  await page.getByRole('button', { name: 'Créer la recette' }).click()
  await page.waitForURL(/\/recipes\/[0-9a-f-]{36}$/, { timeout: 15000 }); await page.waitForLoadState('networkidle')
  // 200 g × 3 + 150 g × 0,63 + 100 g × 3 = 994,5 kcal pour 4 → 249
  const txt = await textOf(page.locator('body'))
  check(/249 kcal/.test(txt), 'nutrition avec les produits : 249 kcal par portion')
  check(!/pas choisi dans la liste/.test(txt), 'tous les ingrédients comptés')

  await page.goto(page.url() + '/edit'); await page.waitForLoadState('networkidle')
  check((await names()).filter((n) => /Isigny|Skyr/.test(n)).length === 3, 'modification : les 3 produits sont toujours là')
  await page.getByRole('button', { name: 'Enregistrer les modifications' }).click()
  await page.waitForURL(/\/recipes\/[0-9a-f-]{36}$/, { timeout: 15000 }); await page.waitForLoadState('networkidle')
  check(/249 kcal/.test(await textOf(page.locator('body'))), 'après enregistrement : toujours 249 kcal')
  check(errors.length === 0, `aucune erreur JavaScript ${errors.join(' | ')}`)
}
