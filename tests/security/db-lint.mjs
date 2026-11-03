/**
 * Linter de sécurité de Supabase (splinter) sur une base jetable avec toutes les migrations :
 * les mêmes alertes que Supabase > Advisors > Security Advisor, mais avant la mise en ligne.
 *
 *   node tests/security/db-lint.mjs            (télécharge splinter.sql dans tests/.tmp)
 *
 * Chaque règle est lancée à part : si l'imitation de Supabase (tests/support/db.mjs) n'a pas ce
 * qu'une règle demande (graphql, statistiques…), elle est signalée « non vérifiable » sans tout arrêter.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { ROOT, startDb } from '../support/db.mjs'

const URL = 'https://raw.githubusercontent.com/supabase/splinter/main/splinter.sql'
const file = path.join(ROOT, 'tests/.tmp/splinter/splinter.sql')
if (!existsSync(file)) {
  mkdirSync(path.dirname(file), { recursive: true })
  const res = await fetch(URL)
  if (!res.ok) throw new Error(`Téléchargement de splinter impossible (${res.status})`)
  writeFileSync(file, await res.text())
}
const sql = readFileSync(file, 'utf8')

// Préambule (search_path, blocs do $$…$$) puis une requête par règle, séparées par « union all »
const start = sql.indexOf('\n(\n')
const preamble = sql.slice(0, start)
const rules = sql.slice(start).split(/\nunion all\n/).map((s) => s.trim()).filter(Boolean)

const db = await startDb({ log: () => {} })
const findings = []
const skipped = []
try {
  await db.client.query('begin')
  await db.client.query(preamble)
  for (const rule of rules) {
    const name = rule.match(/'([a-z_]+)' as name/)?.[1] ?? '?'
    await db.client.query('savepoint r')
    try {
      const { rows } = await db.client.query(rule)
      findings.push(...rows)
      await db.client.query('release savepoint r')
    } catch (e) {
      await db.client.query('rollback to savepoint r')
      skipped.push(`${name} (${e.message.split('\n')[0]})`)
    }
  }
  await db.client.query('rollback')
} finally {
  await db.stop()
}

const security = findings.filter((f) => (f.categories ?? []).includes('SECURITY'))
const other = findings.filter((f) => !(f.categories ?? []).includes('SECURITY'))
const line = (f) => `  [${f.level}] ${f.name} — ${f.detail}`
console.log(`${rules.length} règles, ${skipped.length} non vérifiables ici\n`)
console.log(`Sécurité : ${security.length} alerte(s)`)
for (const f of security) console.log(line(f))
console.log(`\nPerformance et autres : ${other.length} alerte(s)`)
const byName = Object.groupBy(other, (f) => f.name)
for (const [n, list] of Object.entries(byName)) console.log(`  ${n} : ${list.length}`)
if (skipped.length) console.log(`\nNon vérifiables ici :\n  ${skipped.join('\n  ')}`)
process.exit(security.some((f) => f.level === 'ERROR') ? 1 : 0)
