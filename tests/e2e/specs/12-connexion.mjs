// Page de connexion : logo, nom et slogan, en clair et en sombre
import { B, check, newPage, shot, textOf } from '../helpers.mjs'

export default async function ({ browser }) {
  for (const theme of ['light', 'dark']) {
    const { ctx, page, errors } = await newPage(browser, { user: null, theme })
    await page.goto(B + '/login'); await page.waitForLoadState('networkidle')
    check(await page.getByRole('heading', { name: 'Dignis', level: 1 }).isVisible(), `${theme} : nom en titre`)
    check((await textOf(page.locator('body'))).includes('Digne de soin, chaque jour.'), `${theme} : slogan affiché`)
    check(await page.getByRole('button', { name: 'Se connecter' }).isVisible(), `${theme} : formulaire visible`)
    check(errors.length === 0, `${theme} : aucune erreur JavaScript ${errors.join(' | ')}`)
    await shot(page, `connexion-${theme}`, { fullPage: true })
    await ctx.close()
  }
}
