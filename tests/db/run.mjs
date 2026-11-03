/**
 * Tests des règles de sécurité de la base (RLS) : npm run test:db
 *
 * Applique toutes les migrations sur une base jetable, puis les fichiers de
 * supabase/tests dans l'ordre ci-dessous (chacun s'appuie sur les données du précédent).
 * Chaque vérification affiche « ok … » ; la première qui échoue arrête tout.
 */
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { ROOT, startDb } from '../support/db.mjs'

// rls_tests.sql crée les fonctions t_eq / t_fails et les premiers utilisateurs : toujours en premier
const ORDER = ['rls', 'foyer', 'sport', 'rgpd', 'rayons', 'portions', 'produits_recettes', 'frigo_journal', 'photo_repas', 'securite']

const dir = path.join(ROOT, 'supabase/tests')
const files = readdirSync(dir).filter((f) => f.endsWith('_tests.sql'))
const rank = (f) => { const i = ORDER.indexOf(f.replace(/_tests\.sql$/, '')); return i === -1 ? ORDER.length : i }
files.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
const unknown = files.filter((f) => rank(f) === ORDER.length)
if (unknown.length) console.log(`(à ajouter dans ORDER de tests/db/run.mjs : ${unknown.join(', ')} — lancés en dernier)`)

let db
let checks = 0
let failed = false
try {
  console.log('Base jetable et migrations…')
  db = await startDb()
  db.client.on('notice', (n) => { if (n.message.startsWith('ok ')) checks++; console.log('   ', n.message) })
  for (const f of files) {
    console.log(`\n${f}`)
    await db.client.query(readFileSync(path.join(dir, f), 'utf8'))
  }
  console.log(`\n✓ ${checks} vérifications réussies`)
} catch (e) {
  failed = true
  console.error('\n✗', e?.message ?? e, e?.where ?? '')
} finally {
  await db?.stop()
}
process.exit(failed ? 1 : 0)
