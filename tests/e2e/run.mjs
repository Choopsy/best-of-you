/**
 * Tests dans un vrai navigateur (Chromium, format téléphone) : npm run test:e2e
 *
 *   npm run test:e2e                      tout (construit l'appli, ~3-4 min)
 *   npm run test:e2e -- courses bilan     seulement ces scénarios
 *   npm run test:e2e -- --no-build        sans reconstruire (appli inchangée depuis le dernier build)
 *   E2E_VERBOSE=1 npm run test:e2e        avec le journal du serveur et de PostgREST
 *
 * Pour chaque scénario de tests/e2e/specs : base neuve (migrations + seed.sql), PostgREST
 * et passerelle Supabase (stack.mjs), puis le scénario pilote l'appli construite dans
 * .next-e2e et servie sur :3100. Captures d'écran dans tests/e2e/captures.
 * Première fois : npx playwright install chromium
 */
import { spawn } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium } from 'playwright'
import { ROOT } from '../support/db.mjs'
import { ALICE, GATEWAY_PORT, startStack } from './stack.mjs'
import { B, results_ as results } from './helpers.mjs'

const args = process.argv.slice(2)
const noBuild = args.includes('--no-build')
const only = args.filter((a) => !a.startsWith('--'))

const DIST = '.next-e2e'
const NEXT = path.join(ROOT, 'node_modules/next/dist/bin/next')
// Les variables NEXT_PUBLIC_* sont figées au build : l'appli de test parle à la fausse passerelle
const env = {
  ...process.env,
  NEXT_DIST_DIR: DIST,
  NEXT_PUBLIC_SUPABASE_URL: `http://localhost:${GATEWAY_PORT}`,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'e2e',
  // Le secours côté serveur ne doit jamais joindre le vrai Open Food Facts : adresse injoignable,
  // le navigateur seul est simulé par mockOff (sinon une « panne » trouve quand même le produit)
  OPENFOODFACTS_URL: 'http://127.0.0.1:9',
  // Import de repas réservé : Alice oui, Bob non (voir lib/features.ts)
  MEAL_IMPORT_USERS: ALICE,
  // Photo du repas : fausse API Anthropic dans la passerelle (stack.mjs), jamais la vraie
  ANTHROPIC_API_KEY: 'e2e-cle-factice',
  ANTHROPIC_BASE_URL: `http://localhost:${GATEWAY_PORT}/anthropic`,
  ANTHROPIC_MODEL: '',
  NEXT_TELEMETRY_DISABLED: '1',
}

const run = (argv, opts = {}) => new Promise((resolve, reject) => {
  const p = spawn(process.execPath, argv, { cwd: ROOT, env, stdio: 'inherit', ...opts })
  p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${argv.join(' ')} : code ${code}`))))
})

const specsDir = path.join(ROOT, 'tests/e2e/specs')
const specs = readdirSync(specsDir).filter((f) => f.endsWith('.mjs')).sort()
  .filter((f) => !only.length || only.some((o) => f.includes(o)))
if (!specs.length) { console.error(`Aucun scénario pour : ${only.join(', ')}`); process.exit(1) }

if (!noBuild || !existsSync(path.join(ROOT, DIST, 'BUILD_ID'))) {
  console.log('Construction de l\'appli de test (.next-e2e)…')
  await run([NEXT, 'build'])
}

// Le journal du serveur (requêtes coupées entre deux scénarios…) seulement avec E2E_VERBOSE=1
const server = spawn(process.execPath, [NEXT, 'start', '-p', '3100'], { cwd: ROOT, env, stdio: ['ignore', 'ignore', process.env.E2E_VERBOSE ? 'inherit' : 'ignore'] })
const stopServer = () => { if (server.exitCode === null) server.kill() }
process.on('exit', stopServer)
for (let i = 0; i < 80; i++) {
  try { await fetch(B + '/login'); break } catch { await new Promise((r) => setTimeout(r, 250)) }
}

const browser = await chromium.launch()
const crashed = []
for (const f of specs) {
  console.log(`\n▶ ${f.replace('.mjs', '')}`)
  const stack = await startStack()
  try {
    const spec = await import(pathToFileURL(path.join(specsDir, f)).href)
    await spec.default({ browser, db: stack.db, metadata: stack.metadata, anthropic: stack.anthropic })
  } catch (e) {
    crashed.push(f)
    console.log(`  ✗ arrêt du scénario : ${e.message.split('\n')[0]}`)
  } finally {
    await stack.stop()
  }
}
await browser.close()
stopServer()

const ko = results.ko.length + crashed.length
console.log(`\n${results.ok} vérifications réussies, ${ko} échec${ko > 1 ? 's' : ''}` + (ko ? ` :\n - ${[...results.ko, ...crashed.map((c) => `${c} interrompu`)].join('\n - ')}` : ''))
console.log(`Captures : ${path.relative(ROOT, path.join(ROOT, 'tests/e2e/captures'))}`)
process.exit(ko ? 1 : 0)
