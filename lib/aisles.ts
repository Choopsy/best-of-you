/**
 * Rayons du magasin et rangement automatique des articles de courses.
 * Module pur (testé par scripts/test-aisles.ts).
 *
 * Principe : on cherche d'abord des expressions de plusieurs mots (« pomme de terre »,
 * « crème solaire »), puis le premier mot reconnu du nom (« Courgette, pulpe et peau »
 * → courgette). Une correction faite par le foyer passe toujours avant.
 */
import { normalizeName } from './shopping'

export const AISLES = [
  { key: 'fruits_legumes', label: 'Fruits et légumes' },
  { key: 'boulangerie', label: 'Boulangerie' },
  { key: 'viande_poisson', label: 'Viande, poisson et charcuterie' },
  { key: 'cremerie', label: 'Crèmerie et œufs' },
  { key: 'epicerie_salee', label: 'Épicerie salée' },
  { key: 'epicerie_sucree', label: 'Épicerie sucrée' },
  { key: 'boissons', label: 'Boissons' },
  { key: 'surgeles', label: 'Surgelés' },
  { key: 'hygiene', label: 'Hygiène et beauté' },
  { key: 'entretien', label: 'Entretien' },
  { key: 'autre', label: 'Autre' },
] as const

export type AisleKey = (typeof AISLES)[number]['key']
export const AISLE_KEYS = AISLES.map((a) => a.key) as AisleKey[]
export const DEFAULT_ORDER: AisleKey[] = [...AISLE_KEYS]
export const aisleLabel = (k: AisleKey) => AISLES.find((a) => a.key === k)?.label ?? 'Autre'
export const isAisleKey = (k: unknown): k is AisleKey => typeof k === 'string' && (AISLE_KEYS as string[]).includes(k)

/** Expressions de plusieurs mots, testées en premier (sous forme normalisée). */
const PHRASES: [string, AisleKey][] = [
  ['pomme de terre', 'fruits_legumes'], ['patate douce', 'fruits_legumes'], ['haricot vert', 'fruits_legumes'],
  ['petit pois', 'fruits_legumes'], ['chou fleur', 'fruits_legumes'], ['fines herbes', 'fruits_legumes'],
  ['pain de mie', 'boulangerie'], ['pain complet', 'boulangerie'],
  ['fromage blanc', 'cremerie'], ['petit suisse', 'cremerie'], ['creme fraiche', 'cremerie'], ['creme liquide', 'cremerie'],
  ['pate feuilletee', 'cremerie'], ['pate brisee', 'cremerie'], ['pate sablee', 'cremerie'], ['pate a pizza', 'cremerie'],
  ['lait de coco', 'epicerie_salee'], ['sauce soja', 'epicerie_salee'], ['pois chiche', 'epicerie_salee'],
  ['coulis de tomate', 'epicerie_salee'], ['concentre de tomate', 'epicerie_salee'], ['biscuit aperitif', 'epicerie_salee'],
  ['pate a tartiner', 'epicerie_sucree'], ['beurre de cacahuete', 'epicerie_sucree'], ['flocon d avoine', 'epicerie_sucree'],
  ['flocons d avoine', 'epicerie_sucree'], ['fruits secs', 'epicerie_sucree'], ['raisin sec', 'epicerie_sucree'],
  ['raisins secs', 'epicerie_sucree'], ['sucre glace', 'epicerie_sucree'], ['poudre d amande', 'epicerie_sucree'],
  ['lait d amande', 'boissons'], ['lait d avoine', 'boissons'], ['lait de soja', 'boissons'], ['eau gazeuse', 'boissons'],
  ['gel douche', 'hygiene'], ['brosse a dent', 'hygiene'], ['brosse a dents', 'hygiene'], ['papier toilette', 'hygiene'],
  ['creme solaire', 'hygiene'], ['creme hydratante', 'hygiene'], ['serviette hygienique', 'hygiene'],
  ['liquide vaisselle', 'entretien'], ['sac poubelle', 'entretien'], ['sacs poubelle', 'entretien'],
  ['essuie tout', 'entretien'], ['papier aluminium', 'entretien'], ['film alimentaire', 'entretien'],
  ['lave vaisselle', 'entretien'], ['produit menager', 'entretien'],
]

const WORDS: Record<AisleKey, string[]> = {
  fruits_legumes: ['pomme', 'poire', 'banane', 'orange', 'citron', 'clementine', 'mandarine', 'pamplemousse', 'kiwi',
    'fraise', 'framboise', 'myrtille', 'cerise', 'abricot', 'peche', 'nectarine', 'prune', 'raisin', 'melon', 'pasteque',
    'ananas', 'mangue', 'avocat', 'tomate', 'courgette', 'aubergine', 'poivron', 'concombre', 'carotte', 'oignon',
    'echalote', 'ail', 'poireau', 'celeri', 'fenouil', 'brocoli', 'chou', 'epinard', 'salade', 'laitue', 'mache',
    'roquette', 'endive', 'radis', 'betterave', 'navet', 'panais', 'potiron', 'potimarron', 'courge', 'butternut',
    'champignon', 'patate', 'gingembre', 'persil', 'basilic', 'coriandre', 'ciboulette', 'menthe', 'thym', 'romarin',
    'aneth', 'estragon', 'legume', 'fruit', 'asperge', 'artichaut', 'citronnelle', 'figue', 'grenade', 'litchi'],
  boulangerie: ['pain', 'baguette', 'brioche', 'croissant', 'viennoiserie', 'ficelle', 'fougasse'],
  viande_poisson: ['poulet', 'dinde', 'boeuf', 'veau', 'porc', 'agneau', 'canard', 'lapin', 'viande', 'steak', 'escalope',
    'roti', 'saucisse', 'merguez', 'chipolata', 'lardon', 'jambon', 'bacon', 'chorizo', 'saucisson', 'salami', 'rillette',
    'poisson', 'saumon', 'cabillaud', 'colin', 'merlu', 'truite', 'crevette', 'moule', 'lieu', 'dorade', 'maquereau',
    'surimi', 'gambas', 'hache', 'filet', 'blanc', 'aiguillette', 'cuisse'],
  cremerie: ['lait', 'beurre', 'creme', 'yaourt', 'yogourt', 'fromage', 'emmental', 'comte', 'mozzarella', 'parmesan',
    'feta', 'chevre', 'camembert', 'brie', 'roquefort', 'raclette', 'ricotta', 'mascarpone', 'skyr', 'oeuf', 'margarine',
    'kefir', 'faisselle', 'gruyere', 'cheddar', 'reblochon', 'burrata', 'tofu', 'tzatziki', 'houmous'],
  epicerie_salee: ['pate', 'riz', 'semoule', 'quinoa', 'boulgour', 'lentille', 'haricot', 'huile', 'vinaigre', 'sel',
    'poivre', 'epice', 'curry', 'paprika', 'cumin', 'moutarde', 'mayonnaise', 'ketchup', 'sauce', 'bouillon', 'conserve',
    'thon', 'sardine', 'mais', 'olive', 'cornichon', 'soupe', 'chips', 'cracker', 'nouille', 'vermicelle', 'couscous',
    'polenta', 'tortilla', 'wrap', 'spaghetti', 'tagliatelle', 'penne', 'fusilli', 'lasagne', 'puree', 'gnocchi', 'pesto'],
  epicerie_sucree: ['sucre', 'farine', 'levure', 'chocolat', 'cacao', 'confiture', 'miel', 'cereale', 'muesli', 'granola',
    'flocon', 'biscuit', 'gateau', 'compote', 'cafe', 'the', 'tisane', 'infusion', 'biscotte', 'nutella', 'vanille',
    'bonbon', 'amande', 'noisette', 'noix', 'cannelle', 'maizena', 'madeleine', 'crepe'],
  boissons: ['eau', 'jus', 'soda', 'coca', 'limonade', 'biere', 'vin', 'cidre', 'champagne', 'sirop', 'boisson', 'smoothie'],
  surgeles: ['surgele', 'glace', 'sorbet', 'frite', 'esquimau'],
  hygiene: ['savon', 'shampoing', 'shampooing', 'apres shampoing', 'dentifrice', 'deodorant', 'mouchoir', 'coton', 'rasoir',
    'tampon', 'couche', 'lingette', 'maquillage', 'demaquillant'],
  entretien: ['lessive', 'adoucissant', 'vaisselle', 'eponge', 'javel', 'nettoyant', 'poubelle', 'sopalin', 'desinfectant',
    'detartrant', 'pastille', 'serpillere'],
  autre: [],
}

// Index mot → rayon
const WORD_INDEX = new Map<string, AisleKey>()
for (const [aisle, words] of Object.entries(WORDS) as [AisleKey, string[]][]) {
  for (const w of words) if (!WORD_INDEX.has(w)) WORD_INDEX.set(w, aisle)
}

/** Mots qui finissent par s ou x au singulier. */
const INVARIANT = new Set(['pois', 'mais', 'frais', 'gras', 'noix', 'anchois', 'radis', 'ananas', 'cassis', 'jus', 'couscous', 'riz'])

/** Formes à essayer pour un mot : tel quel, puis sans pluriel (s, x). */
function forms(token: string) {
  const out = [token]
  if (!INVARIANT.has(token) && token.length > 3 && (token.endsWith('s') || token.endsWith('x'))) out.push(token.slice(0, -1))
  return out
}
const singular = (token: string) => forms(token).at(-1)!

/** Rayon deviné à partir du nom seul. */
export function guessAisle(name: string): AisleKey {
  const n = normalizeName(name)
  if (!n) return 'autre'
  const tokens = n.split(' ')
  // « surgelé » n'importe où l'emporte : des petits pois surgelés vont aux surgelés
  if (tokens.some((t) => forms(t).includes('surgele'))) return 'surgeles'
  // Expressions, au pluriel comme au singulier (« petits pois » = « petit pois »)
  const variants = [` ${n} `, ` ${tokens.map(singular).join(' ')} `]
  for (const [phrase, aisle] of PHRASES) if (variants.some((v) => v.includes(` ${phrase} `))) return aisle
  for (const t of tokens) {
    for (const f of forms(t)) {
      const a = WORD_INDEX.get(f)
      if (a) return a
    }
  }
  return 'autre'
}

/** Rayon d'un article : correction du foyer d'abord, sinon devinette. */
export function aisleFor(name: string, overrides: Record<string, string> = {}): AisleKey {
  const o = overrides[normalizeName(name)]
  return isAisleKey(o) ? o : guessAisle(name)
}

/** Ordre du foyer, complété par les rayons manquants (nouveaux rayons, ordre ancien). */
export function resolveOrder(order: readonly string[] | null | undefined): AisleKey[] {
  const valid = (order ?? []).filter(isAisleKey)
  const seen = new Set(valid)
  return [...valid, ...DEFAULT_ORDER.filter((k) => !seen.has(k))]
}

/** Regroupe des articles par rayon, dans l'ordre du magasin ; rayons vides omis. */
export function groupByAisle<T extends { name: string }>(
  items: T[], overrides: Record<string, string>, order: readonly string[] | null | undefined,
): { aisle: AisleKey; label: string; items: T[] }[] {
  const byAisle = new Map<AisleKey, T[]>()
  for (const it of items) {
    const a = aisleFor(it.name, overrides)
    byAisle.set(a, [...(byAisle.get(a) ?? []), it])
  }
  return resolveOrder(order)
    .filter((a) => byAisle.has(a))
    .map((a) => ({
      aisle: a,
      label: aisleLabel(a),
      items: byAisle.get(a)!.sort((x, y) => x.name.localeCompare(y.name, 'fr')),
    }))
}
