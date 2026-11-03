// Page de connexion : le sens du nom en tête (entrée de dictionnaire), en clair et en sombre
import { B, check, newPage, shot, textOf } from '../helpers.mjs'

export default async function ({ browser }) {
  for (const theme of ['light', 'dark']) {
    const { ctx, page, errors } = await newPage(browser, { user: null, theme })
    await page.goto(B + '/login'); await page.waitForLoadState('networkidle')
    const head = page.locator('header').filter({ has: page.getByRole('heading', { name: 'Dignis', level: 1 }) })
    const t = await textOf(head)
    check(t.includes('du latin dignus') && t.includes('« digne »') && t.includes('Prends soin de ta valeur.'), `${theme} : nom, origine, sens et signature en tête`)
    check(await page.getByRole('button', { name: 'Se connecter' }).isVisible(), `${theme} : formulaire visible`)
    check(errors.length === 0, `${theme} : aucune erreur JavaScript ${errors.join(' | ')}`)
    await shot(page, `connexion-${theme}`, { fullPage: true })
    await ctx.close()
  }
}
