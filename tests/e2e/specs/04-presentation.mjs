// Présentation de l'appli au premier lancement, revisible depuis le Profil
import { ALICE, B, check, newPage, shot } from '../helpers.mjs'

export default async function ({ browser, metadata }) {
  const { page, errors } = await newPage(browser, { tourSeen: false })
  const tour = page.getByRole('dialog', { name: /Découvrir Dignis/ })
  await page.goto(B + '/'); await page.waitForLoadState('networkidle')
  check(await tour.waitFor({ timeout: 6000 }).then(() => true, () => false), 'premier lancement : la présentation s\'ouvre')
  await shot(page, 'presentation-1')
  let steps = 0
  while (await tour.getByRole('button', { name: /Suivant/ }).count()) {
    await tour.getByRole('button', { name: /Suivant/ }).click(); await page.waitForTimeout(450); steps++
  }
  check(steps === 7 && (await tour.innerText()).includes('8 / 8'), `8 cartes parcourues avec « Suivant » (${steps} appuis)`)
  await tour.getByRole('button', { name: 'C\'est parti' }).click()
  await page.waitForTimeout(800)
  check(await tour.count() === 0, '« C\'est parti » ferme la présentation')
  check(metadata.get(ALICE)?.tour_done === true, 'gardé dans le compte (pour les autres appareils)')
  await page.reload(); await page.waitForLoadState('networkidle'); await page.waitForTimeout(800)
  check(await tour.count() === 0, 'rechargement : elle ne revient pas')
  await page.goto(B + '/profile'); await page.getByRole('link', { name: /Revoir la présentation/ }).click()
  check(await tour.waitFor({ timeout: 6000 }).then(() => true, () => false), 'Profil > « Revoir la présentation » la rouvre')
  await tour.getByRole('button', { name: /Passer/ }).click(); await page.waitForTimeout(600)
  check(await tour.count() === 0 && !page.url().includes('tour='), '« Passer » ferme et nettoie l\'adresse')
  check(errors.length === 0, `aucune erreur JavaScript ${errors.join(' | ')}`)
}
