/**
 * Faux Supabase pour les tests dans le navigateur :
 * - Postgres jetable avec les migrations et des données de démo (tests/e2e/seed.sql) ;
 * - PostgREST (la vraie API REST de Supabase) branché dessus ;
 * - une petite passerelle sur :54321 qui imite le reste de Supabase (/rest/v1 vers
 *   PostgREST, /auth/v1/user, stockage, déconnexion).
 * Les utilisateurs sont « connectés » avec un jeton signé ici (voir tokenFor).
 */
import { spawn } from 'node:child_process'
import crypto from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { AUTHENTICATOR_PASSWORD, PG_PORT, ROOT, startDb } from '../support/db.mjs'

export const GATEWAY_PORT = 54321
const PGRST_PORT = Number(process.env.TEST_PGRST_PORT ?? 3001)
const SECRET = 'super-secret-jwt-token-with-at-least-32-characters'

export const USERS = {
  'aaaaaaaa-0000-0000-0000-000000000001': { email: 'alice@test.fr', name: 'Alice Martin' },
  'bbbbbbbb-0000-0000-0000-000000000002': { email: 'bob@test.fr', name: 'Bob Leroy' },
}
export const ALICE = 'aaaaaaaa-0000-0000-0000-000000000001'
export const BOB = 'bbbbbbbb-0000-0000-0000-000000000002'

const b64url = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
export function tokenFor(sub) {
  const h = b64url({ alg: 'HS256', typ: 'JWT' })
  const p = b64url({ sub, role: 'authenticated', aud: 'authenticated', email: USERS[sub].email, exp: Math.floor(Date.now() / 1000) + 86400 })
  return `${h}.${p}.${crypto.createHmac('sha256', SECRET).update(`${h}.${p}`).digest('base64url')}`
}

/** PostgREST : POSTGREST_BIN si fourni, sinon le binaire du paquet npm postgrest-dist (Windows, Linux, macOS Intel). */
function postgrestBin() {
  if (process.env.POSTGREST_BIN) return process.env.POSTGREST_BIN
  const exe = process.platform === 'win32' ? 'postgrest.exe' : 'postgrest'
  const bin = path.join(ROOT, 'node_modules', `postgrest-dist-${process.platform}-${process.arch}`, exe)
  if (!existsSync(bin)) {
    throw new Error(`PostgREST introuvable (${bin}). Sur Mac Apple Silicon : brew install postgrest, puis POSTGREST_BIN=$(which postgrest).`)
  }
  return bin
}

async function waitFor(url, ms = 20000) {
  const end = Date.now() + ms
  while (Date.now() < end) {
    try { const r = await fetch(url); if (r.status < 500) return } catch { /* pas encore prêt */ }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error(`Pas de réponse de ${url}`)
}

/** Démarre base + PostgREST + passerelle. Renvoie { db, stop } (db = client pg superutilisateur). */
export async function startStack({ latencyMs = 0 } = {}) {
  const { client: db, stop: stopDb } = await startDb({ log: () => {} })
  await db.query(readFileSync(path.join(ROOT, 'tests/e2e/seed.sql'), 'utf8'))

  const pgrst = spawn(postgrestBin(), [], {
    env: {
      ...process.env,
      PGRST_DB_URI: `postgres://authenticator:${AUTHENTICATOR_PASSWORD}@localhost:${PG_PORT}/app`,
      PGRST_DB_SCHEMAS: 'public', PGRST_DB_ANON_ROLE: 'anon', PGRST_JWT_SECRET: SECRET,
      PGRST_SERVER_PORT: String(PGRST_PORT), PGRST_LOG_LEVEL: 'error',
    },
    // Journal de PostgREST seulement avec E2E_VERBOSE=1
    stdio: ['ignore', 'ignore', process.env.E2E_VERBOSE ? 'inherit' : 'ignore'],
  })
  await waitFor(`http://localhost:${PGRST_PORT}/`)

  // Métadonnées de compte modifiées pendant le test (supabase.auth.updateUser)
  const metadata = new Map()
  const gateway = http.createServer(async (req, res) => {
    if (latencyMs) await new Promise((r) => setTimeout(r, latencyMs))
    const url = new URL(req.url, 'http://x')
    if (url.pathname.startsWith('/rest/v1/')) {
      const target = url.pathname.replace('/rest/v1', '') + url.search
      const p = http.request({ host: 'localhost', port: PGRST_PORT, path: target, method: req.method, headers: { ...req.headers, host: `localhost:${PGRST_PORT}` } },
        (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res) })
      p.on('error', () => { res.writeHead(502); res.end('{}') })
      req.pipe(p)
      return
    }
    if (url.pathname === '/auth/v1/user') {
      const tok = (req.headers.authorization ?? '').replace('Bearer ', '')
      let body = ''
      for await (const chunk of req) body += chunk
      try {
        const sub = JSON.parse(Buffer.from(tok.split('.')[1], 'base64url').toString()).sub
        const u = USERS[sub]
        if (!u) throw new Error()
        if (req.method === 'PUT') metadata.set(sub, { ...(metadata.get(sub) ?? {}), ...(JSON.parse(body || '{}').data ?? {}) })
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ id: sub, aud: 'authenticated', role: 'authenticated', email: u.email,
          user_metadata: { full_name: u.name, ...(metadata.get(sub) ?? {}) }, app_metadata: {}, created_at: new Date().toISOString() }))
      } catch { res.writeHead(401); res.end('{}') }
      return
    }
    if (url.pathname.startsWith('/storage/v1/object/')) { res.writeHead(200, { 'content-type': 'application/json' }); res.end('[]'); return }
    if (url.pathname === '/auth/v1/logout') { res.writeHead(204); res.end(); return }
    res.writeHead(404, { 'content-type': 'application/json' }); res.end('{"message":"non imité par tests/e2e/stack.mjs"}')
  })
  await new Promise((resolve) => gateway.listen(GATEWAY_PORT, resolve))

  const stop = async () => {
    await new Promise((r) => gateway.close(r))
    gateway.closeAllConnections?.()
    pgrst.kill()
    await new Promise((r) => (pgrst.exitCode !== null ? r() : pgrst.once('exit', r)))
    await stopDb()
  }
  return { db, metadata, stop }
}
