// Aperçu des écrans principaux en clair et en sombre : captures pour comparer avec les maquettes (design/)
import { B, check, newPage, shot } from '../helpers.mjs'

const SCREENS = [
  ['accueil', '/'],
  ['journal', '/journal'],
  ['courses', '/courses'],
  ['forme', '/forme'],
]

export default async function ({ browser }) {
  for (const theme of ['light', 'dark']) {
    const { ctx, page, errors } = await newPage(browser, { theme })
    for (const [name, url] of SCREENS) {
      await page.goto(B + url)
      await page.locator('main').first().waitFor()
      await page.waitForLoadState('networkidle')
      // Sinon la capture peut partir avant les polices (texte de secours)
      await page.evaluate(() => document.fonts.ready)
      await shot(page, `apercu-${name}-${theme}`, { fullPage: true })
    }
    // Feuille « Que veux-tu ajouter ? » ouverte depuis le bouton + de la barre du bas
    await page.goto(B + '/')
    await page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('button', { name: 'Ajouter' }).click()
    await page.getByText('Que veux-tu ajouter ?').waitFor()
    await page.waitForTimeout(400)
    await shot(page, `apercu-ajouter-${theme}`)
    check(errors.length === 0, `${theme === 'dark' ? 'thème sombre' : 'thème clair'} : aucune erreur JavaScript ${errors.join(' | ')}`)
    await ctx.close()
  }
}
