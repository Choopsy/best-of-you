/**
 * Le frigo suit ce qui est mangé : quand un aliment ou une recette est ajouté au journal,
 * l'appli propose de le retirer du frigo (coché par défaut, la personne confirme) ;
 * si l'entrée est supprimée, le retrait est annulé (migration 009 : food_logs.fridge_moves).
 *
 * Logique pure (testée dans scripts/test-fridge-use.ts) : correspondance, unités, restes.
 */
import { toGrams } from './nutrition'

export interface FridgeStock {
  id: string
  name: string
  ciqual_code: string | null
  custom_food_id: string | null
  quantity: number | null
  unit: string | null
  expires_on: string | null
}

/** Ce qui a été mangé : un aliment, ou un ingrédient d'une recette (déjà ramené à la part mangée) */
export interface Consumed {
  name: string
  ciqualCode?: string | null
  customFoodId?: string | null
  grams?: number | null
  /** Nombre de pièces / pots / portions */
  count?: number | null
  /** Poids d'une pièce ou portion, s'il est connu (produit enregistré) */
  portionGrams?: number | null
}

/** Proposition affichée sous l'ajout : « Yaourt nature, 4 pot → il en restera 3 » */
export interface FridgeProposal {
  itemId: string
  name: string
  unit: string | null
  quantity: number | null
  /** Quantité retirée, dans l'unité de l'article ; null = on ne sait pas convertir (on demande) */
  amount: number | null
  left: number | null
  /** Conversion volume ↔ poids (densité ≈ 1) */
  approx: boolean
  /** Ce qui a été mangé (utile pour une recette à plusieurs ingrédients) */
  consumed: string
}

/** Choix confirmé à l'écran pour un article */
export interface FridgeUse {
  itemId: string
  /** Quantité à retirer (unité de l'article) ; null avec finish = false : rien ne change */
  amount: number | null
  /** « C'est fini » : l'article quitte le frigo */
  finish: boolean
}

/** Gardé dans food_logs.fridge_moves pour remettre le frigo si l'entrée est supprimée */
export interface FridgeMove {
  item_id: string
  name: string
  ciqual_code: string | null
  custom_food_id: string | null
  unit: string | null
  expires_on: string | null
  amount: number | null
  before: number | null
  removed: boolean
}

const WEIGHT: Record<string, number> = { g: 1, kg: 1000 }
const VOLUME: Record<string, number> = { ml: 1, cl: 10, l: 1000 }
// Unités « à la pièce » du frigo et des recettes : une portion mangée = une pièce
const COUNT = new Set(['pièce', 'piece', 'tranche', 'sachet', 'boîte', 'boite', 'pot', 'bouteille', 'yaourt', 'portion', 'botte', 'gousse', 'feuille'])
// Mots trop courants pour décider qu'un article du frigo correspond
const STOP = new Set(['les', 'des', 'aux', 'avec', 'sans', 'pour', 'cuit', 'cuite', 'cru', 'crue', 'frais', 'fraiche', 'nature', 'entier', 'entiere', 'bio'])

const unitKey = (u: string | null | undefined) => (u ?? '').trim().toLowerCase()
export const isCountUnit = (u: string | null | undefined) => COUNT.has(unitKey(u))

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/œ/g, 'oe').replace(/[^a-z0-9]+/g, ' ').trim()
/** Mots significatifs, au singulier approximatif (« tomates » = « tomate ») */
const words = (s: string) => norm(s).split(' ').filter((w) => w.length >= 3 && !STOP.has(w)).map((w) => w.replace(/(s|x)$/, ''))

/** 100 : même produit ; 90 : même aliment Ciqual ; 50 : le mot principal de l'un est dans l'autre ; 0 : rien */
export function matchScore(item: FridgeStock, c: Consumed): number {
  if (c.customFoodId && item.custom_food_id === c.customFoodId) return 100
  if (c.ciqualCode && item.ciqual_code === c.ciqualCode) return 90
  const a = words(item.name), b = words(c.name)
  if (!a.length || !b.length) return 0
  return b.includes(a[0]) || a.includes(b[0]) ? 50 : 0
}

/** Meilleur article pour ce qui a été mangé ; à égalité, celui qui périme le plus tôt */
export function bestMatch(items: FridgeStock[], c: Consumed, taken: Set<string> = new Set()): FridgeStock | null {
  let best: FridgeStock | null = null
  let bestScore = 0
  for (const item of items) {
    if (taken.has(item.id)) continue
    const s = matchScore(item, c)
    const sooner = best && (item.expires_on ?? '9999') < (best.expires_on ?? '9999')
    if (s > bestScore || (s === bestScore && s > 0 && sooner)) { best = item; bestScore = s }
  }
  return best
}

const round = (v: number) => Math.round(v * 100) / 100

/** Quantité à retirer, dans l'unité de l'article ; null si on ne sait pas convertir */
export function amountFor(item: FridgeStock, c: Consumed): { amount: number; approx: boolean } | null {
  if (item.quantity == null) return null
  const u = unitKey(item.unit)
  const grams = c.grams ?? (c.count != null && c.portionGrams ? c.count * c.portionGrams : null)
  if (u in WEIGHT && grams != null) return { amount: round(grams / WEIGHT[u]), approx: false }
  if (u in VOLUME && grams != null) return { amount: round(grams / VOLUME[u]), approx: true }
  if (COUNT.has(u)) {
    const count = c.count ?? (grams != null && c.portionGrams ? grams / c.portionGrams : null)
    if (count != null) return { amount: round(count), approx: false }
  }
  return null
}

/** Une proposition par chose mangée, chaque article n'étant proposé qu'une fois */
export function propose(items: FridgeStock[], consumed: Consumed[]): FridgeProposal[] {
  const taken = new Set<string>()
  const out: FridgeProposal[] = []
  for (const c of consumed) {
    const item = bestMatch(items, c, taken)
    if (!item) continue
    taken.add(item.id)
    const a = amountFor(item, c)
    out.push({
      itemId: item.id, name: item.name, unit: item.unit, quantity: item.quantity,
      amount: a?.amount ?? null,
      left: a && item.quantity != null ? Math.max(0, round(item.quantity - a.amount)) : null,
      approx: a?.approx ?? false,
      consumed: c.name,
    })
  }
  return out
}

/** Effet d'un choix confirmé sur un article : nouvelle quantité, suppression, et ce qu'il faut garder pour annuler */
export function applyUse(item: FridgeStock, use: FridgeUse): { quantity: number | null; remove: boolean; move: FridgeMove } | null {
  const base = {
    item_id: item.id, name: item.name, ciqual_code: item.ciqual_code, custom_food_id: item.custom_food_id,
    unit: item.unit, expires_on: item.expires_on, before: item.quantity,
  }
  if (use.finish) return { quantity: null, remove: true, move: { ...base, amount: item.quantity, removed: true } }
  if (use.amount == null || !(use.amount > 0) || item.quantity == null) return null
  const left = round(item.quantity - use.amount)
  if (left <= 0) return { quantity: null, remove: true, move: { ...base, amount: item.quantity, removed: true } }
  return { quantity: left, remove: false, move: { ...base, amount: round(use.amount), removed: false } }
}

/**
 * Annulation d'un retrait (entrée supprimée) : on rend la quantité à l'article s'il existe encore,
 * sinon on le remet au frigo tel qu'il était.
 */
export function restoreMove(move: FridgeMove, current: { quantity: number | null } | null):
  { update: number } | { insert: Omit<FridgeStock, 'id'> } | null {
  if (current) {
    if (current.quantity == null || move.amount == null) return null
    return { update: round(current.quantity + (move.removed ? (move.before ?? move.amount) : move.amount)) }
  }
  const quantity = move.removed ? move.before : move.amount
  return {
    insert: {
      name: move.name, ciqual_code: move.ciqual_code, custom_food_id: move.custom_food_id,
      quantity: quantity != null && quantity > 0 ? quantity : null, unit: quantity != null ? move.unit : null, expires_on: move.expires_on,
    },
  }
}

/** Ingrédients d'une recette ramenés à la part mangée (portions mangées / portions de la recette) */
export function recipeConsumed(
  ingredients: { name: string; amount: number | null; unit: string | null; weight_g: number | null; ciqual_code: string | null; custom_food_id?: string | null }[],
  eatenServings: number, baseServings: number,
): Consumed[] {
  const share = baseServings > 0 ? eatenServings / baseServings : 1
  return ingredients.map((i) => {
    const g = toGrams(i.amount, i.unit, i.weight_g)
    return {
      name: i.name, ciqualCode: i.ciqual_code, customFoodId: i.custom_food_id ?? null,
      grams: g ? round(g.grams * share) : null,
      count: isCountUnit(i.unit) && i.amount != null ? round(i.amount * share) : null,
    }
  })
}

/** Texte de la proposition, au format français : « 500 g → il en restera 440 g » */
export function proposalText(p: FridgeProposal): string {
  const n = (v: number) => v.toLocaleString('fr-FR', { maximumFractionDigits: 2 })
  const u = p.unit ? ` ${p.unit}` : ''
  if (p.amount == null || p.quantity == null) return 'Quantité inconnue : il en reste ?'
  if (!p.left) return `${n(p.quantity)}${u} → il n'en restera plus`
  return `${n(p.quantity)}${u} → il en restera ${p.approx ? '≈ ' : ''}${n(p.left)}${u}`
}
