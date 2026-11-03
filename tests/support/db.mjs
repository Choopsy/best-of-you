/**
 * Base Postgres jetable pour les tests (Windows, macOS, Linux) : embedded-postgres
 * télécharge Postgres via npm, rien à installer. On y recrée ce que Supabase fournit
 * (rôles anon / authenticated, auth.uid(), schéma storage) puis on applique toutes
 * les migrations de supabase/migrations dans l'ordre.
 */
import EmbeddedPostgres from 'embedded-postgres'
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = fileURLToPath(new URL('../..', import.meta.url))
export const PG_PORT = Number(process.env.TEST_PG_PORT ?? 54329)
export const AUTHENTICATOR_PASSWORD = 'authenticator'

// Imitation minimale de Supabase : seulement ce que les migrations et les règles utilisent
const SUPABASE_STUBS = `
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE authenticator LOGIN NOINHERIT PASSWORD '${AUTHENTICATOR_PASSWORD}';
GRANT anon, authenticated TO authenticator;
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb DEFAULT '{}'::jsonb);
-- Supabase lit l'utilisateur dans le jeton : PostgREST le met dans request.jwt.claims,
-- les tests SQL le mettent directement dans request.jwt.claim.sub
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''),
                  (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'))::uuid $$;
CREATE SCHEMA storage;
CREATE TABLE storage.buckets (id text PRIMARY KEY, name text, public boolean);
CREATE TABLE storage.objects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text, name text);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql IMMUTABLE AS
  $$ SELECT (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
GRANT USAGE ON SCHEMA auth, storage, public TO authenticated, anon;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, anon;
-- Comme Supabase : les visiteurs ont aussi les droits, seules les règles (RLS) filtrent
GRANT ALL ON storage.objects TO authenticated, anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated, anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated, anon;
`

export const migrationFiles = () =>
  readdirSync(path.join(ROOT, 'supabase/migrations')).filter((f) => /^\d{3}_.*\.sql$/.test(f)).sort()

/** Démarre une base vide avec les migrations appliquées. Renvoie { client, stop }. */
export async function startDb({ quiet = true, log = console.log } = {}) {
  // Dans le dépôt (ignoré par git) : le dossier temporaire du système n'est pas toujours
  // accessible à l'utilisateur « postgres » quand on tourne en root
  mkdirSync(path.join(ROOT, 'tests/.tmp'), { recursive: true })
  const dir = mkdtempSync(path.join(ROOT, 'tests/.tmp', 'pg-'))
  const pg = new EmbeddedPostgres({
    databaseDir: dir, port: PG_PORT, user: 'postgres', password: 'postgres', persistent: false,
    // Postgres refuse de tourner en root (Linux, conteneurs) : un utilisateur « postgres » est créé
    createPostgresUser: process.getuid?.() === 0,
    // Locale « C » : existe sur tous les systèmes (en_US.UTF-8 manque dans certains conteneurs)
    initdbFlags: ['--locale=C', '--lc-messages=C', '--encoding=UTF8'],
    onLog: quiet ? () => {} : log, onError: quiet ? () => {} : log,
  })
  await pg.initialise()
  await pg.start()
  await pg.createDatabase('app')
  const client = pg.getPgClient('app', 'localhost')
  await client.connect()
  await client.query(SUPABASE_STUBS)
  for (const f of migrationFiles()) {
    await client.query(readFileSync(path.join(ROOT, 'supabase/migrations', f), 'utf8'))
    log(`  migration ${f}`)
  }
  const stop = async () => {
    await client.end().catch(() => {})
    await pg.stop().catch(() => {})
    rmSync(dir, { recursive: true, force: true })
  }
  return { client, stop }
}
