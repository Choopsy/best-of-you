/**
 * Import d'un repas depuis un fichier JSON (Profil > Mes données > Importer un repas).
 *
 * Le fichier est lu sur le téléphone pour l'aperçu, puis relu ici côté serveur avant
 * l'enregistrement : on ne fait jamais confiance au contenu déjà « vérifié » par le navigateur.
 * Le champ `type` prépare l'import de recettes : seul « repas » est accepté pour l'instant.
 *
 * Format :
 * {
 *   "type": "repas",
 *   "date": "2026-11-02",            facultatif (sinon : choisi à l'import)
 *   "repas": "dejeuner",             facultatif : petit-dejeuner, dejeuner, diner, collation
 *   "plats": [
 *     { "nom": "Burger frites", "grammes": 450, "portions": 1,
 *       "nutriments": { "kcal": 1150, "proteines": 45, "glucides": 110, "sucres": 12,
 *                       "lipides": 58, "satures": 20, "fibres": 7, "sel": 3.2 } }
 *   ]
 * }
 * Un seul plat peut aussi être écrit directement à la racine (nom + nutriments, sans « plats »).
 */
import { isISODate } from './dates'
import { NUTRIENT_KEYS, roundNutrients, type Nutrients } from './nutrition'
import type { Meal } from './types'

export const MAX_IMPORT_BYTES = 50_000
export const MAX_IMPORT_ITEMS = 20

export interface ImportedItem {
  label: string
  grams: number | null
  servings: number | null
  nutrients: Nutrients
}

export type MealImport =
  | { ok: true; type: 'repas'; date: string | null; meal: Meal | null; items: ImportedItem[] }
  | { ok: false; error: string }

// Noms français du fichier → colonnes de l'appli (les noms de l'appli sont acceptés aussi)
const NUTRIENT_NAMES: Record<string, keyof Nutrients> = {
  kcal: 'energy_kcal', calories: 'energy_kcal', energie: 'energy_kcal',
  proteines: 'proteins_g',
  glucides: 'carbs_g',
  sucres: 'sugars_g',
  lipides: 'fat_g',
  satures: 'saturated_fat_g', acides_gras_satures: 'saturated_fat_g',
  fibres: 'fiber_g',
  sel: 'salt_g',
}

// Plafonds par plat : au-delà, c'est presque sûrement une erreur de saisie (unité, virgule…)
const LIMITS: Record<keyof Nutrients, number> = {
  energy_kcal: 5000, proteins_g: 500, carbs_g: 1000, sugars_g: 1000,
  fat_g: 500, saturated_fat_g: 300, fiber_g: 200, salt_g: 50,
}

const MEAL_NAMES: Record<string, Meal> = {
  'petit-dejeuner': 'breakfast', petit_dejeuner: 'breakfast', breakfast: 'breakfast', matin: 'breakfast',
  dejeuner: 'lunch', lunch: 'lunch', midi: 'lunch',
  diner: 'dinner', dinner: 'dinner', soir: 'dinner',
  collation: 'snack', snack: 'snack', gouter: 'snack', 'en-cas': 'snack',
}

/** « Déjeuner », « dejeuner », « DÉJEUNER » → même clé */
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

function readNumber(v: unknown, what: string, max: number): number | string {
  // « 3,2 » écrit en texte : on accepte la virgule française
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : v
  if (typeof n !== 'number' || !Number.isFinite(n)) return `${what} : ce n'est pas un nombre.`
  if (n < 0) return `${what} : la valeur ne peut pas être négative.`
  if (n > max) return `${what} : ${n} paraît trop élevé (maximum ${max}).`
  return n
}

function readItem(raw: unknown, index: number): ImportedItem | string {
  const where = `Plat ${index + 1}`
  if (!isObject(raw)) return `${where} : format non reconnu.`
  const label = typeof raw.nom === 'string' ? raw.nom.trim() : ''
  if (!label) return `${where} : il manque le nom (« nom »).`
  if (label.length > 120) return `${where} : nom trop long (120 caractères maximum).`

  const values = isObject(raw.nutriments) ? raw.nutriments : null
  if (!values) return `${label} : il manque les valeurs (« nutriments »).`
  const nutrients = Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, 0])) as Nutrients
  let hasKcal = false
  for (const [key, v] of Object.entries(values)) {
    const col = NUTRIENT_NAMES[norm(key)] ?? (NUTRIENT_KEYS as readonly string[]).find((k) => k === key) as keyof Nutrients | undefined
    if (!col) return `${label} : valeur inconnue « ${key} ».`
    const n = readNumber(v, `${label}, ${key}`, LIMITS[col])
    if (typeof n === 'string') return n
    nutrients[col] = n
    if (col === 'energy_kcal') hasKcal = true
  }
  if (!hasKcal) return `${label} : il manque les calories (« kcal »).`

  let grams: number | null = null
  if (raw.grammes != null) {
    const g = readNumber(raw.grammes, `${label}, grammes`, 5000)
    if (typeof g === 'string') return g
    grams = g > 0 ? g : null
  }
  let servings: number | null = null
  if (raw.portions != null) {
    const p = readNumber(raw.portions, `${label}, portions`, 20)
    if (typeof p === 'string') return p
    servings = p > 0 ? p : null
  }
  return { label, grams, servings, nutrients: roundNutrients(nutrients) }
}

/** Lit et vérifie le texte d'un fichier d'import. Ne lève jamais d'exception. */
export function parseMealImport(text: string): MealImport {
  if (text.length > MAX_IMPORT_BYTES) return { ok: false, error: 'Fichier trop gros (50 Ko maximum).' }
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: 'Ce fichier n\'est pas du JSON valide.' }
  }
  if (!isObject(data)) return { ok: false, error: 'Format non reconnu : le fichier doit commencer par « { ».' }

  const type = typeof data.type === 'string' ? norm(data.type) : 'repas'
  if (type === 'recette') return { ok: false, error: 'L\'import de recettes n\'est pas encore possible : seulement « repas » pour l\'instant.' }
  if (type !== 'repas') return { ok: false, error: `Type « ${String(data.type)} » inconnu : utilise « repas ».` }

  let date: string | null = null
  if (data.date != null) {
    if (typeof data.date !== 'string' || !isISODate(data.date)) return { ok: false, error: 'Date invalide : écris-la sous la forme 2026-11-02.' }
    date = data.date
  }
  let meal: Meal | null = null
  if (data.repas != null) {
    meal = typeof data.repas === 'string' ? MEAL_NAMES[norm(data.repas)] ?? null : null
    if (!meal) return { ok: false, error: 'Repas inconnu : petit-dejeuner, dejeuner, diner ou collation.' }
  }

  const rawItems = Array.isArray(data.plats) ? data.plats : 'nom' in data ? [data] : null
  if (!rawItems || rawItems.length === 0) return { ok: false, error: 'Aucun plat trouvé (« plats »).' }
  if (rawItems.length > MAX_IMPORT_ITEMS) return { ok: false, error: `Trop de plats (${MAX_IMPORT_ITEMS} maximum).` }

  const items: ImportedItem[] = []
  for (const [i, raw] of rawItems.entries()) {
    const item = readItem(raw, i)
    if (typeof item === 'string') return { ok: false, error: item }
    items.push(item)
  }
  return { ok: true, type: 'repas', date, meal, items }
}

/** Exemple affiché sur la page d'import (et vérifié par les tests) */
export const MEAL_IMPORT_EXAMPLE = `{
  "type": "repas",
  "repas": "dejeuner",
  "plats": [
    {
      "nom": "Burger frites, brasserie",
      "grammes": 450,
      "nutriments": { "kcal": 1150, "proteines": 45, "glucides": 110, "sucres": 12,
                      "lipides": 58, "satures": 20, "fibres": 7, "sel": 3.2 }
    }
  ]
}`
