/**
 * Tests de la liste de courses — lancer avec : npx tsx scripts/test-shopping.ts
 */
import assert from 'node:assert/strict'
import { buildShoppingList, normalizeName, toBase, type FridgeLike, type PlannedRecipe } from '../lib/shopping'

let n = 0
function test(name: string, fn: () => void) { fn(); n++; console.log('✓', name) }

const TODAY = '2026-10-26'
const crepes: PlannedRecipe = {
  title: 'Crêpes', servings: 4, baseServings: 4,
  ingredients: [
    { name: 'Farine de blé', amount: 250, unit: 'g', ciqual_code: '9436' },
    { name: 'Lait demi-écrémé', amount: 50, unit: 'cl', ciqual_code: '19042' },
    { name: 'Oeuf cru', amount: 3, unit: 'pièce', ciqual_code: '22000' },
    { name: 'Sel', amount: null, unit: null, ciqual_code: null },
  ],
}
const quiche: PlannedRecipe = {
  title: 'Quiche', servings: 2, baseServings: 6,
  ingredients: [
    { name: 'Farine de blé', amount: 200, unit: 'g', ciqual_code: '9436' },
    { name: 'Oeuf cru', amount: 3, unit: '', ciqual_code: '22000' },
    { name: 'Crème fraîche', amount: 20, unit: 'cl', ciqual_code: null },
  ],
}
const none: FridgeLike[] = []
const find = (lines: ReturnType<typeof buildShoppingList>, name: string) => lines.find((l) => l.name.startsWith(name))

test('Normalisation des noms', () => {
  assert.equal(normalizeName('  Œufs  Frais '), 'oeufs frais')
  assert.equal(normalizeName('Oeuf, cru'), normalizeName('oeuf cru'))
  assert.deepEqual(toBase(50, 'cl'), { dim: 'volume', value: 500 })
  assert.deepEqual(toBase(1.5, 'kg'), { dim: 'mass', value: 1500 })
  assert.deepEqual(toBase(3, ''), { dim: 'count:pièce', value: 3 })
})

test('Frigo vide : tout est à acheter, quantités additionnées et adaptées aux portions', () => {
  const lines = buildShoppingList([crepes, quiche], none, TODAY)
  // Farine : 250 + 200 × 2/6 = 316,7 → arrondi au 5 g supérieur = 320 g
  assert.deepEqual([find(lines, 'Farine')!.quantity, find(lines, 'Farine')!.unit], [320, 'g'])
  // Œufs : 3 + 3 × 2/6 = 4 (« pièce » et unité vide = la même chose)
  assert.deepEqual([find(lines, 'Oeuf')!.quantity, find(lines, 'Oeuf')!.unit], [4, 'pièce'])
  assert.deepEqual(find(lines, 'Oeuf')!.recipes.sort(), ['Crêpes', 'Quiche'])
  // Lait : 50 cl = 500 ml
  assert.deepEqual([find(lines, 'Lait')!.quantity, find(lines, 'Lait')!.unit], [500, 'ml'])
  assert.equal(find(lines, 'Sel')!.quantity, null)
})

test('Le frigo couvre tout ou partie', () => {
  const fridge: FridgeLike[] = [
    { name: 'Farine T55', ciqual_code: '9436', quantity: 1, unit: 'kg', expires_on: null },
    { name: 'Lait', ciqual_code: '19042', quantity: 200, unit: 'ml', expires_on: '2026-10-30' },
    { name: 'sel', ciqual_code: null, quantity: null, unit: null, expires_on: null },
  ]
  const lines = buildShoppingList([crepes], fridge, TODAY)
  assert.equal(find(lines, 'Farine'), undefined, 'farine couverte par le kilo du frigo')
  assert.equal(find(lines, 'Sel'), undefined, 'sel déjà au frigo (reconnu par le nom)')
  assert.equal(find(lines, 'Lait')!.quantity, 300)
  assert.match(find(lines, 'Lait')!.note!, /Déjà au frigo : 200 ml/)
})

test('Un aliment périmé ne compte pas', () => {
  const fridge: FridgeLike[] = [{ name: 'Lait', ciqual_code: '19042', quantity: 1, unit: 'L', expires_on: '2026-10-20' }]
  assert.equal(find(buildShoppingList([crepes], fridge, TODAY), 'Lait')!.quantity, 500)
})

test('Unités qui ne se comparent pas : on garde la ligne avec une note', () => {
  const fridge: FridgeLike[] = [{ name: 'Oeuf cru', ciqual_code: '22000', quantity: 120, unit: 'g', expires_on: null }]
  const line = find(buildShoppingList([crepes], fridge, TODAY), 'Oeuf')!
  assert.equal(line.quantity, 3)
  assert.equal(line.note, 'Au frigo : 120 g')
})

test('Grandes quantités en kg et L', () => {
  const big: PlannedRecipe = { ...crepes, servings: 16 }
  const lines = buildShoppingList([big], none, TODAY)
  assert.deepEqual([find(lines, 'Farine')!.quantity, find(lines, 'Farine')!.unit], [1, 'kg'])
  assert.deepEqual([find(lines, 'Lait')!.quantity, find(lines, 'Lait')!.unit], [2, 'L'])
})

console.log(`\n${n} tests OK`)
