// Connexion (logo, slogan, clair et sombre), pages légales sans compte, inscription réservée aux 18 ans et plus
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

  const { ctx, page, errors } = await newPage(browser, { user: null })
  // Pages légales lisibles sans compte, liées depuis la connexion
  await page.goto(B + '/login')
  await page.getByRole('navigation', { name: 'Informations légales' }).getByRole('link', { name: 'Mentions légales' }).click()
  await page.getByRole('heading', { name: 'Mentions légales', level: 1 }).waitFor()
  const notice = await textOf(page.locator('main'))
  check(notice.includes('Vercel Inc.') && notice.includes('Supabase Pte. Ltd.') && notice.includes('Directeur de la publication'), 'mentions légales : éditeur et hébergeurs, sans compte')
  await shot(page, 'mentions-legales', { fullPage: true })
  await page.goto(B + '/conditions')
  check(await page.getByRole('heading', { name: "Conditions d'utilisation", level: 1 }).isVisible(), "conditions d'utilisation sans compte")
  check((await textOf(page.locator('main'))).includes('Pas un avis médical'), 'conditions : pas un avis médical')
  await shot(page, 'conditions', { fullPage: true })

  // Inscription : sans la case « 18 ans ou plus », pas de création de compte
  await page.goto(B + '/register')
  await page.locator('#full_name').fill('Camille Test')
  await page.locator('#email').fill('camille@test.fr')
  await page.locator('#password').fill('Motdepasse1!')
  await page.locator('#confirm_password').fill('Motdepasse1!')
  await page.getByRole('checkbox', { name: /conditions d'utilisation/ }).check()
  const create = page.getByRole('button', { name: 'Créer mon compte' })
  check(await create.isDisabled(), "inscription : bouton désactivé sans la case d'âge")
  await page.getByRole('checkbox', { name: /18 ans ou plus/ }).check()
  check(await create.isEnabled(), "inscription : bouton actif avec l'âge et les conditions")
  await page.waitForTimeout(400) // fin de l'animation de couleur du bouton
  await shot(page, 'inscription', { fullPage: true })
  check(errors.length === 0, `pages légales et inscription : aucune erreur JavaScript ${errors.join(' | ')}`)
  await ctx.close()
}
