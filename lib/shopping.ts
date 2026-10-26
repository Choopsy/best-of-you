/**
 * Liste de courses : ingrédients des recettes planifiées, moins ce qu'il y a au frigo.
 * Module « pur » (sans base de données), testé par scripts/test-shopping.ts.
 */

export interface PlannedRecipe {
  title: string
  /** Portions prévues */
  servings: number
  /** Portions de la recette d'origine */
  baseServings: number
  ingredients: { name: string; amount: number | null; unit: string | null; ciqual_code: string | null }[]
}

export interface FridgeLike {
  name: string
  ciqual_code: string | null
  quantity: number | null
  unit: string | null
  expires_on: string | null
}

export interface ShoppingLine {
  name: string
  ciqual_code: string | null
  quantity: number | null
  unit: string | null
  /** Ex. « Au frigo : 1 pièce » quand les unités ne se comparent pas */
  note: string | null
  recipes: string[]
}

type Dim = 'mass' | 'volume' | `count:${string}`

const MASS: Record<string, number> = { g: 1, kg: 1000, mg: 0.001 }
const VOLUME: Record<string, number> = { ml: 1, cl: 10, dl: 100, l: 1000 }

export function normalizeName(s: string) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[œŒ]/g, 'oe')
    .replace(/[æÆ]/g, 'ae')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')  // ponctuation : « Oeuf, cru » = « oeuf cru »
    .trim()
}

/** Quantité ramenée à une unité de base (g, ml, ou nombre de « pièces »/cuillères…) */
export function toBase(amount: number | null, unit: string | null): { dim: Dim; value: number | null } {
  const u = (unit ?? '').toLowerCase().trim()
  if (u in MASS) return { dim: 'mass', value: amount != null ? amount * MASS[u] : null }
  if (u in VOLUME) return { dim: 'volume', value: amount != null ? amount * VOLUME[u] : null }
  const label = u === '' ? 'pièce' : u
  return { dim: `count:${label}`, value: amount }
}

function fromBase(dim: Dim, value: number): { quantity: number; unit: string } {
  const r1 = (v: number) => Math.round(v * 10) / 10
  if (dim === 'mass') {
    if (value >= 1000) return { quantity: r1(value / 1000), unit: 'kg' }
    return { quantity: value >= 50 ? Math.ceil(value / 5) * 5 : Math.ceil(value), unit: 'g' }
  }
  if (dim === 'volume') {
    if (value >= 1000) return { quantity: r1(value / 1000), unit: 'L' }
    return { quantity: value >= 50 ? Math.ceil(value / 5) * 5 : Math.ceil(value), unit: 'ml' }
  }
  const label = dim.slice('count:'.length)
  // On achète des œufs, des oignons… entiers ; les cuillères gardent une décimale
  const whole = !['c.s', 'c.c', 'pincée', 'tasse', 'verre'].includes(label)
  return { quantity: whole ? Math.ceil(value - 1e-9) : r1(value), unit: label === 'pièce' ? 'pièce' : label }
}

function describe(dim: Dim, value: number | null) {
  if (value == null) return 'quantité non précisée'
  const { quantity, unit } = fromBase(dim, value)
  return `${quantity.toLocaleString('fr-FR')} ${unit}`
}

const keyOf = (name: string, code: string | null) => (code ? `c:${code}` : `n:${normalizeName(name)}`)

export function buildShoppingList(plan: PlannedRecipe[], fridge: FridgeLike[], today: string): ShoppingLine[] {
  // 1. Besoins, regroupés par aliment et par type d'unité
  const needs = new Map<string, {
    name: string; code: string | null; dim: Dim; value: number | null; hasUnknown: boolean; recipes: Set<string>; altKey: string
  }>()
  for (const r of plan) {
    const ratio = r.baseServings > 0 ? r.servings / r.baseServings : 1
    for (const ing of r.ingredients) {
      if (!ing.name?.trim()) continue
      const { dim, value } = toBase(ing.amount != null ? ing.amount * ratio : null, ing.unit)
      const id = `${keyOf(ing.name, ing.ciqual_code)}|${dim}`
      const cur = needs.get(id)
      if (cur) {
        if (value != null) cur.value = (cur.value ?? 0) + value
        else cur.hasUnknown = true
        cur.recipes.add(r.title)
      } else {
        needs.set(id, {
          name: ing.name.trim(), code: ing.ciqual_code, dim, value, hasUnknown: value == null,
          recipes: new Set([r.title]), altKey: `n:${normalizeName(ing.name)}`,
        })
      }
    }
  }

  // 2. Frigo : seulement ce qui n'est pas périmé, indexé par code Ciqual et par nom
  const usable = fridge.filter((f) => !f.expires_on || f.expires_on >= today)
  const fridgeFor = (code: string | null, name: string) =>
    usable.filter((f) =>
      (code && f.ciqual_code === code) || normalizeName(f.name) === normalizeName(name))

  // 3. Soustraction
  const lines: ShoppingLine[] = []
  for (const n of needs.values()) {
    const have = fridgeFor(n.code, n.name)
    let remaining = n.value
    const others: string[] = []
    let haveUnknown = false
    for (const f of have) {
      const fb = toBase(f.quantity, f.unit)
      if (fb.dim === n.dim && fb.value != null && remaining != null) remaining -= fb.value
      else if (fb.value == null) haveUnknown = true
      else others.push(describe(fb.dim, fb.value))
    }

    // Quantité inconnue dans la recette (« sel », « poivre ») : on n'achète que s'il n'y en a pas
    if (n.value == null) {
      if (have.length > 0) continue
      lines.push({ name: n.name, ciqual_code: n.code, quantity: null, unit: null, note: null, recipes: [...n.recipes] })
      continue
    }
    if (remaining != null && remaining <= 0.0001) continue

    const { quantity, unit } = fromBase(n.dim, remaining ?? n.value)
    const notes: string[] = []
    if (others.length) notes.push(`Au frigo : ${others.join(', ')}`)
    if (haveUnknown) notes.push('Au frigo (quantité non précisée)')
    if (remaining != null && remaining < n.value && !others.length) {
      notes.push(`Déjà au frigo : ${describe(n.dim, n.value - remaining)}`)
    }
    lines.push({
      name: n.name, ciqual_code: n.code, quantity, unit,
      note: notes.length ? notes.join(' · ') : null,
      recipes: [...n.recipes],
    })
  }

  return lines.sort((a, b) => normalizeName(a.name).localeCompare(normalizeName(b.name), 'fr'))
}
