/**
 * Sonde HTTP de l'appli construite pour les tests (.next-e2e), servie en local sur une base jetable :
 * en-têtes de sécurité, accès sans compte, redirections, fuites d'informations.
 * Ne touche jamais le site en ligne.
 *
 *   node tests/security/http-probe.mjs            (construit l'appli si .next-e2e n'existe pas)
 *
 * « ✗ » = à corriger ; « · » = information (ce qui dépend de l'hébergeur, par exemple HSTS ajouté par Vercel).
 */
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { ROOT } from '../support/db.mjs'
import { ALICE, GATEWAY_PORT, startStack, tokenFor, USERS } from '../e2e/stack.mjs'

const B = 'http://localhost:3100'
const NEXT = path.join(ROOT, 'node_modules/next/dist/bin/next')
// Mêmes variables que tests/e2e/run.mjs : l'appli parle à la fausse passerelle Supabase
const env = {
  ...process.env, NEXT_DIST_DIR: '.next-e2e', NEXT_TELEMETRY_DISABLED: '1',
  NEXT_PUBLIC_SUPABASE_URL: `http://localhost:${GATEWAY_PORT}`, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'e2e',
  OPENFOODFACTS_URL: 'http://127.0.0.1:9', MEAL_IMPORT_USERS: ALICE,
  ANTHROPIC_API_KEY: 'e2e-cle-factice', ANTHROPIC_BASE_URL: `http://localhost:${GATEWAY_PORT}/anthropic`,
}
const run = (args) => new Promise((ok, ko) => spawn(process.execPath, args, { cwd: ROOT, env, stdio: 'inherit' })
  .on('exit', (c) => (c === 0 ? ok() : ko(new Error(`${args.join(' ')} : code ${c}`)))))

if (!existsSync(path.join(ROOT, '.next-e2e', 'BUILD_ID'))) await run([NEXT, 'build'])
const stack = await startStack()
const server = spawn(process.execPath, [NEXT, 'start', '-p', '3100'], { cwd: ROOT, env, stdio: 'ignore' })
for (let i = 0; i < 80; i++) { try { await fetch(B + '/login'); break } catch { await new Promise((r) => setTimeout(r, 250)) } }

const results = []
const ok = (cond, msg, info = false) => results.push({ mark: cond ? '✓' : info ? '·' : '✗', msg })
const get = (p, opts = {}) => fetch(B + p, { redirect: 'manual', ...opts })

// Cookie de session d'Alice (comme tests/e2e/helpers.mjs)
const token = tokenFor(ALICE)
const session = { access_token: token, token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400, refresh_token: 'x', user: { id: ALICE, email: USERS[ALICE].email } }
const alice = { cookie: `sb-localhost-auth-token=base64-${Buffer.from(JSON.stringify(session)).toString('base64url')}` }

try {
  // 1. En-têtes de sécurité (page publique et page connectée)
  for (const [label, p, headers] of [['connexion', '/login', {}], ['journal (connecté)', '/journal', alice]]) {
    const h = (await get(p, { headers })).headers
    const csp = h.get('content-security-policy') ?? ''
    ok(!!csp, `${label} : Content-Security-Policy présente`)
    ok(/frame-ancestors/.test(csp) || !!h.get('x-frame-options'), `${label} : affichage dans une iframe d'un autre site interdit (clickjacking)`)
    ok(h.get('x-content-type-options') === 'nosniff', `${label} : X-Content-Type-Options: nosniff`)
    ok(!!h.get('referrer-policy'), `${label} : Referrer-Policy`)
    ok(!!h.get('permissions-policy'), `${label} : Permissions-Policy (caméra limitée au site)`)
    ok(!h.get('x-powered-by'), `${label} : pas d'en-tête X-Powered-By (version du serveur cachée)`)
    ok(!!h.get('strict-transport-security'), `${label} : HSTS (ajouté par Vercel en ligne, absent en local)`, true)
  }

  // 2. Sans compte : pages et API fermées
  for (const p of ['/journal', '/profile/donnees', '/recipes', '/courses']) {
    const r = await get(p)
    ok(r.status >= 300 && r.status < 400 && /\/login/.test(r.headers.get('location') ?? ''), `sans compte : ${p} renvoie vers la connexion (${r.status})`)
  }
  for (const [method, p] of [['GET', '/api/export'], ['GET', '/api/products/3017620422003'], ['POST', '/api/meal-photo'], ['GET', '/api/ingredients/search?q=pomme&products=1']]) {
    const r = await get(p, { method })
    const body = await r.text()
    ok(r.status === 401 || (r.status >= 300 && r.status < 400), `sans compte : ${method} ${p} refusé (${r.status})`)
    ok(!/aaaaaaaa-|alice@/.test(body), `sans compte : ${p} ne renvoie aucune donnée d'utilisateur`)
  }
  for (const p of ['/confidentialite', '/conditions', '/mentions-legales']) {
    ok((await get(p)).status === 200, `sans compte : ${p} lisible`)
  }

  // 3. Redirection après email : jamais vers un autre site
  for (const next of ['https://exemple-pirate.fr', '//exemple-pirate.fr', '/\\exemple-pirate.fr', 'javascript:alert(1)']) {
    const r = await get(`/auth/callback?code=x&next=${encodeURIComponent(next)}`)
    const loc = new URL(r.headers.get('location') ?? '/', B)
    ok(loc.origin === B, `retour d'email : next=${next} reste sur le site (${loc.origin})`)
  }

  // 4. Photo du repas : taille et type vérifiés côté serveur (Alice n'a pas l'accès : refus avant tout appel)
  const big = new FormData(); big.append('photo', new Blob([new Uint8Array(2_100_000)], { type: 'image/jpeg' }), 'x.jpg')
  const rBig = await get('/api/meal-photo', { method: 'POST', body: big, headers: alice })
  ok(rBig.status === 413 || rBig.status === 400 || rBig.status === 403, `photo de plus de 2 Mo refusée (${rBig.status})`)
  const svg = new FormData(); svg.append('photo', new Blob(['<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'], { type: 'image/jpeg' }), 'x.jpg')
  ok((await get('/api/meal-photo', { method: 'POST', body: svg, headers: alice })).status === 415, 'fichier qui n\'est pas une photo refusé (415)')
  ok(stack.anthropic.calls.length === 0, 'aucun appel à Anthropic pendant la sonde')

  // 5. Erreurs : pas de détails techniques renvoyés
  // Connecté (sans compte, toute page inconnue renvoie vers la connexion). Avec le chargement
  // progressif (loading.tsx), le code 200 part avant notFound() : on vérifie le contenu
  const r404 = await get('/une-page-qui-nexiste-pas', { headers: alice })
  const t404 = await r404.text()
  ok(/introuvable/i.test(t404) && !/at \w+ \(|node_modules|\.tsx?:\d+/.test(t404), `page introuvable sans trace technique (${r404.status})`)
  const rBad = await get('/api/products/abc', { headers: alice })
  ok(rBad.status === 400 && !/stack|node_modules/.test(await rBad.text()), 'code-barres invalide : erreur courte (400)')

  // 6. Cookie de session (posé par Supabase, lu par le navigateur : HttpOnly impossible)
  ok(false, 'cookie de session sans HttpOnly : voulu par Supabase (le navigateur le lit) ; la protection repose sur la CSP et la RLS', true)
} finally {
  server.kill()
  await stack.stop()
}

for (const r of results) console.log(` ${r.mark} ${r.msg}`)
const ko = results.filter((r) => r.mark === '✗').length
console.log(`\n${results.filter((r) => r.mark === '✓').length} réussis, ${ko} à corriger, ${results.filter((r) => r.mark === '·').length} pour information`)
process.exit(ko ? 1 : 0)
