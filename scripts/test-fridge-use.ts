/** Tests du frigo qui suit le journal — npx tsx scripts/test-fridge-use.ts */
import assert from 'node:assert/strict'
import { amountFor, applyUse, bestMatch, matchScore, propose, proposalText, recipeConsumed, restoreMove, type FridgeStock } from '../lib/fridge-use'

let n = 0
const test = (name: string, fn: () => void) => { fn(); n++; console.log('✓', name) }
const item = (o: Partial<FridgeStock>): FridgeStock => ({
  id: 'x', name: '', ciqual_code: null, custom_food_id: null, quantity: null, unit: null, expires_on: null, ...o,
})

const muesli = item({ id: 'm', name: 'Muesli croustillant (Jordans)', custom_food_id: 'p1', quantity: 500, unit: 'g' })
const yaourts = item({ id: 'y', name: 'Yaourt nature', ciqual_code: '19024', quantity: 4, unit: 'pot', expires_on: '2026-11-05' })
const yaourts2 = item({ id: 'y2', name: 'Yaourts nature', quantity: 4, unit: 'pot', expires_on: '2026-11-03' })
const lait = item({ id: 'l', name: 'Lait demi-écrémé', quantity: 1, unit: 'L' })
const tomates = item({ id: 't', name: 'Tomates', quantity: 6, unit: 'pièce' })
const fromage = item({ id: 'f', name: 'Comté', quantity: null, unit: null })

test('Correspondance : même produit > même aliment Ciqual > nom proche', () => {
  assert.equal(matchScore(muesli, { name: 'autre nom', customFoodId: 'p1' }), 100)
  assert.equal(matchScore(yaourts, { name: 'Yaourt au lait entier, nature', ciqualCode: '19024' }), 90)
  assert.equal(matchScore(tomates, { name: 'Tomate, crue' }), 50)
  assert.equal(matchScore(lait, { name: 'Lait de coco' }), 50) // proche : la personne confirme
  assert.equal(matchScore(tomates, { name: 'Courgette' }), 0)
  assert.equal(matchScore(yaourts, { name: 'Nature' }), 0)        // mot trop courant
})

test('À égalité, on propose l\'article qui périme le plus tôt', () => {
  assert.equal(bestMatch([yaourts, yaourts2], { name: 'Yaourt' })?.id, 'y2')
  assert.equal(bestMatch([yaourts, yaourts2], { name: 'Yaourt', ciqualCode: '19024' })?.id, 'y')
})

test('Unités : grammes, kilos, litres (≈), pièces, portion avec poids connu', () => {
  assert.deepEqual(amountFor(muesli, { name: 'm', grams: 60 }), { amount: 60, approx: false })
  assert.deepEqual(amountFor(item({ quantity: 1, unit: 'kg' }), { name: 'x', grams: 250 }), { amount: 0.25, approx: false })
  assert.deepEqual(amountFor(lait, { name: 'l', grams: 200 }), { amount: 0.2, approx: true })
  assert.deepEqual(amountFor(yaourts, { name: 'y', count: 1 }), { amount: 1, approx: false })
  assert.deepEqual(amountFor(yaourts, { name: 'y', grams: 250, portionGrams: 125 }), { amount: 2, approx: false })
  assert.deepEqual(amountFor(muesli, { name: 'm', count: 1, portionGrams: 45 }), { amount: 45, approx: false })
  assert.equal(amountFor(yaourts, { name: 'y', grams: 250 }), null)   // pot sans poids connu : on demande
  assert.equal(amountFor(fromage, { name: 'c', grams: 30 }), null)    // pas de quantité au frigo
})

test('Propositions et texte', () => {
  const [p] = propose([muesli, tomates], [{ name: 'Muesli', customFoodId: 'p1', grams: 60 }])
  assert.equal(p.left, 440)
  assert.equal(proposalText(p).replace(/ /g, ' '), '500 g → il en restera 440 g')
  const [q] = propose([fromage], [{ name: 'Comté', grams: 30 }])
  assert.equal(q.amount, null); assert.match(proposalText(q), /il en reste/)
  const [r] = propose([tomates], [{ name: 'Tomates', count: 6 }])
  assert.equal(proposalText(r), '6 pièce → il n\'en restera plus')
  assert.equal(propose([tomates], [{ name: 'Tomate', count: 1 }, { name: 'Tomates cerises', count: 2 }]).length, 1) // un article, une fois
})

test('Retrait puis annulation : quantité rendue, ou article remis tel quel', () => {
  const a = applyUse(muesli, { itemId: 'm', amount: 60, finish: false })!
  assert.equal(a.quantity, 440); assert.equal(a.remove, false)
  assert.deepEqual(restoreMove(a.move, { quantity: 440 }), { update: 500 })

  const b = applyUse(tomates, { itemId: 't', amount: 8, finish: false })!   // plus que ce qu'il y a
  assert.equal(b.remove, true); assert.equal(b.move.amount, 6)
  const back = restoreMove(b.move, null)
  assert.ok(back && 'insert' in back); assert.equal(back.insert.quantity, 6); assert.equal(back.insert.unit, 'pièce')

  const c = applyUse(fromage, { itemId: 'f', amount: null, finish: true })!  // « C'est fini »
  assert.equal(c.remove, true)
  const back2 = restoreMove(c.move, null)
  assert.ok(back2 && 'insert' in back2); assert.equal(back2.insert.name, 'Comté'); assert.equal(back2.insert.quantity, null)

  assert.equal(applyUse(fromage, { itemId: 'f', amount: null, finish: false }), null) // « Il en reste » : rien ne change
})

test('Recette : ingrédients ramenés à la part mangée', () => {
  const ings = [
    { name: 'Riz', amount: 300, unit: 'g', weight_g: null, ciqual_code: '9100' },
    { name: 'Œufs', amount: 4, unit: 'pièce', weight_g: 200, ciqual_code: null },
    { name: 'Sel', amount: null, unit: '', weight_g: null, ciqual_code: null },
  ]
  const [riz, oeufs, sel] = recipeConsumed(ings, 1, 4)
  assert.equal(riz.grams, 75)
  assert.equal(oeufs.count, 1); assert.equal(oeufs.grams, 50)
  assert.equal(sel.grams, null); assert.equal(sel.count, null)
})

console.log(`\n${n} tests réussis`)
