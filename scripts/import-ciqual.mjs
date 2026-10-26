/**
 * Import CIQUAL 2025 → canonical_ingredients
 *
 * Usage : node scripts/import-ciqual.mjs
 * Génère : scripts/ciqual_migration.sql (à coller dans Supabase SQL Editor)
 */

import { readFileSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

// ── Nutriments retenus ──────────────────────────────────────────────────────
const NUTRIENTS = {
  328:   'energy_kcal',
  25000: 'proteins_g',
  31000: 'carbs_g',
  32000: 'sugars_g',
  34100: 'fiber_g',
  40000: 'fat_g',
  40302: 'saturated_fat_g',
  10004: 'salt_g',
  10200: 'calcium_mg',
  10260: 'iron_mg',
  55100: 'vitamin_c_mg',
}

const FILE_IDS = {
  alim:  '666252',
  compo: '666249',
}

// ── Téléchargement ──────────────────────────────────────────────────────────
async function download(fileId, dest) {
  const url = `https://entrepot.recherche.data.gouv.fr/api/access/datafile/${fileId}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} pour ${url}`)
  const buf = await res.arrayBuffer()
  writeFileSync(dest, Buffer.from(buf))
}

// ── Parser XML léger ────────────────────────────────────────────────────────
function extractTag(xml, tag) {
  const re = new RegExp(`<${tag}>\\s*([^<]*?)\\s*<\\/${tag}>`, 'g')
  const results = []
  let m
  while ((m = re.exec(xml)) !== null) results.push(m[1].trim())
  return results
}

function parseAlim(xml) {
  const map = new Map() // alim_code → { name_fr, name_en, search_name }
  const blocks = xml.split('<ALIM>')
  for (const block of blocks.slice(1)) {
    const code    = block.match(/<alim_code>\s*(\d+)\s*<\/alim_code>/)?.[1]?.trim()
    const rawFr   = block.match(/<alim_nom_fr>\s*([^<]+)\s*<\/alim_nom_fr>/)?.[1]?.trim()
    const rawEn   = block.match(/<alim_nom_eng>\s*([^<]+)\s*<\/alim_nom_eng>/)?.[1]?.trim()
    if (code && rawFr) {
      const name_fr = decodeEntities(rawFr)
      map.set(code, {
        name_fr,
        name_en: rawEn ? decodeEntities(rawEn) : null,
        search_name: normalizeSearch(rawFr),
      })
    }
  }
  return map
}

function parseCompo(xml, wantedCodes) {
  // compo_code[alim_code][const_code] = teneur
  const data = new Map()
  const blocks = xml.split('<COMPO>')
  for (const block of blocks.slice(1)) {
    const alim  = block.match(/<alim_code>\s*(\d+)\s*<\/alim_code>/)?.[1]?.trim()
    const cst   = block.match(/<const_code>\s*(\d+)\s*<\/const_code>/)?.[1]?.trim()
    const val   = block.match(/<teneur>\s*([^<]+)\s*<\/teneur>/)?.[1]?.trim()
    if (!alim || !cst || !wantedCodes.has(cst)) continue
    if (!data.has(alim)) data.set(alim, {})
    const parsed = parseFloat(val)
    data.get(alim)[cst] = isNaN(parsed) ? null : parsed
  }
  return data
}

// ── Nettoyage des noms ───────────────────────────────────────────────────────
const XML_ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&apos;': "'", '&quot;': '"' }
function decodeEntities(s) {
  return s.replace(/&(?:amp|lt|gt|apos|quot);/g, (m) => XML_ENTITIES[m])
}

function normalizeSearch(s) {
  return decodeEntities(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // retire les diacritiques
    .replace(/[œŒ]/g, 'oe')          // ligatures françaises
    .replace(/[æÆ]/g, 'ae')
    .toLowerCase()
}

// ── SQL helpers ─────────────────────────────────────────────────────────────
function esc(v) {
  if (v === null || v === undefined) return 'NULL'
  if (typeof v === 'number') return v.toString()
  return `'${String(v).replace(/'/g, "''")}'`
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const tmp = tmpdir()
  const alimPath  = join(tmp, 'ciqual_alim.xml')
  const compoPath = join(tmp, 'ciqual_compo.xml')

  console.log('⬇  Téléchargement alim.xml…')
  await download(FILE_IDS.alim, alimPath)
  console.log('⬇  Téléchargement compo.xml (gros fichier, ~30s)…')
  await download(FILE_IDS.compo, compoPath)

  console.log('🔍 Parsing…')
  const alimXml  = readFileSync(alimPath, 'utf8')
  const compoXml = readFileSync(compoPath, 'utf8')

  const foods    = parseAlim(alimXml)
  const wantedCodes = new Set(Object.keys(NUTRIENTS))
  const compo    = parseCompo(compoXml, wantedCodes)

  // ── Génération SQL ─────────────────────────────────────────────────────────
  const nutrientCols = Object.values(NUTRIENTS)
  const createTable = `
-- ============================================================
-- Migration CIQUAL 2025 — table canonical_ingredients
-- À coller dans Supabase > SQL Editor > New query
-- ============================================================

create table if not exists public.canonical_ingredients (
  id            serial primary key,
  ciqual_code   text unique not null,
  name_fr       text not null,
  name_en       text,
  search_name   text not null,
  ${nutrientCols.map(c => `${c.padEnd(20)} numeric`).join(',\n  ')}
);

create index if not exists canonical_ingredients_search_idx
  on public.canonical_ingredients (search_name text_pattern_ops);

-- Index pour la recherche par nom
create index if not exists canonical_ingredients_name_fr_idx
  on public.canonical_ingredients using gin(to_tsvector('french', name_fr));

-- RLS : lecture publique pour les utilisateurs authentifiés, pas d'écriture
alter table public.canonical_ingredients enable row level security;

create policy "Lecture authenticated"
  on public.canonical_ingredients for select
  to authenticated using (true);

-- ── Données ──────────────────────────────────────────────────────────────────
insert into public.canonical_ingredients
  (ciqual_code, name_fr, name_en, search_name, ${nutrientCols.join(', ')})
values
`

  const rows = []
  for (const [code, food] of foods) {
    const nutr = compo.get(code) ?? {}
    const vals = [
      esc(code),
      esc(food.name_fr),
      esc(food.name_en),
      esc(food.search_name),
      ...Object.keys(NUTRIENTS).map(k => esc(nutr[k] ?? null)),
    ]
    rows.push(`  (${vals.join(', ')})`)
  }

  const sql = createTable + rows.join(',\n') + '\non conflict (ciqual_code) do nothing;\n'

  const outPath = 'scripts/ciqual_migration.sql'
  writeFileSync(outPath, sql, 'utf8')

  console.log(`✅ ${rows.length} aliments exportés → ${outPath}`)
  console.log('   Colle ce fichier dans Supabase > SQL Editor > New query et exécute-le.')
}

main().catch(console.error)
