/** Tests des quantités en grammes ou en portions — npx tsx scripts/test-portions.ts */
import assert from 'node:assert/strict'
import { computeRecipeNutrition, type FoodValues, type Nutrients } from '../lib/nutrition'
import { canUseGrams, canUsePortions, checkQuantity, defaultUnit, eatenGrams, nutrientFactor, portionText } from '../lib/portions'

let n = 0
const test = (name: string, fn: () => void) => { fn(); n++; console.log('✓', name) }

const burger = { perPortion: true, portionGrams: null }        // valeurs Burger King par burger
const burgerPese = { perPortion: true, portionGrams: 310 }    // poids connu
const yaourt = { perPortion: false, portionGrams: 125 }       // étiquette pour 100 g, pot de 125 g
const riz = { perPortion: false, portionGrams: null }         // pour 100 g, sans portion

test('Burger par portion : 1 portion = les valeurs enregistrées, pas de grammes', () => {
  assert.equal(nutrientFactor(burger, 'portion', 1), 1)
  assert.equal(nutrientFactor(burger, 'portion', 2), 2)
  assert.equal(nutrientFactor(burger, 'g', 100), null)
  assert.equal(eatenGrams(burger, 'portion', 1), null)
  assert.equal(canUseGrams(burger), false); assert.equal(defaultUnit(burger), 'portion')
})

test('Burger avec poids connu : on peut aussi noter en grammes', () => {
  assert.equal(nutrientFactor(burgerPese, 'g', 155), 0.5)
  assert.equal(eatenGrams(burgerPese, 'portion', 1), 310)
})

test('Yaourt pour 100 g avec pot de 125 g : 2 pots = 250 g', () => {
  assert.equal(nutrientFactor(yaourt, 'portion', 2), 2.5)
  assert.equal(eatenGrams(yaourt, 'portion', 2), 250)
  assert.equal(nutrientFactor(yaourt, 'g', 50), 0.5)
  assert.equal(defaultUnit(yaourt), 'portion')
})

test('Riz pour 100 g sans portion : grammes seulement', () => {
  assert.equal(canUsePortions(riz), false); assert.equal(defaultUnit(riz), 'g')
  assert.equal(nutrientFactor(riz, 'portion', 1), null)
  assert.equal(nutrientFactor(riz, 'g', 180), 1.8)
})

test('Quantités refusées', () => {
  assert.match(checkQuantity(burger, 'g', 100)!, /portions/)
  assert.match(checkQuantity(riz, 'portion', 1)!, /grammes/)
  assert.ok(checkQuantity(burger, 'portion', 0))
  assert.ok(checkQuantity(burger, 'portion', 21))
  assert.ok(checkQuantity(riz, 'g', 6000))
  assert.equal(checkQuantity(burger, 'portion', 1.5), null)
  assert.equal(nutrientFactor(burger, 'portion', 0), null)
})

test('Texte : « 1 portion », « 1,5 portion », « 2 portions »', () => {
  assert.equal(portionText(1), '1 portion'); assert.equal(portionText(1.5), '1,5 portion'); assert.equal(portionText(2), '2 portions')
})

const vals = (kcal: number): Nutrients => ({ energy_kcal: kcal, proteins_g: 0, carbs_g: 0, sugars_g: 0, fat_g: 0, saturated_fat_g: 0, fiber_g: 0, salt_g: 0 })
const foods = new Map<string, FoodValues>([
  ['13054', { name: 'Farine', per100: vals(350) }],                                                        // Ciqual
  ['p-creme', { name: 'Crème', per100: vals(300), portion: { perPortion: false, portionGrams: 200 } }],     // pot de 20 cl
  ['p-pate', { name: 'Pâte brisée', per100: vals(1000), portion: { perPortion: true, portionGrams: null } }], // valeurs pour 1 rouleau
])
const ing = (o: Partial<{ amount: number; unit: string; ciqual_code: string; custom_food_id: string; weight_g: number }>) =>
  ({ name: 'x', amount: o.amount ?? null, unit: o.unit ?? null, ciqual_code: o.ciqual_code ?? null, custom_food_id: o.custom_food_id ?? null, weight_g: o.weight_g ?? null })

test('Recette : Ciqual en grammes + produits en portions', () => {
  const r = computeRecipeNutrition([
    ing({ amount: 200, unit: 'g', ciqual_code: '13054' }),          // 700
    ing({ amount: 1, unit: 'portion', custom_food_id: 'p-creme' }),  // 1 pot de 200 g → 600
    ing({ amount: 1, unit: 'pièce', custom_food_id: 'p-pate' }),     // 1 rouleau → 1000
  ], 2, foods)!
  assert.equal(r.counted, 3); assert.equal(r.perServing.energy_kcal, 1150)
})

test('Recette : produit « pour 100 g » noté en grammes', () => {
  const r = computeRecipeNutrition([ing({ amount: 100, unit: 'g', custom_food_id: 'p-creme' })], 1, foods)!
  assert.equal(r.perServing.energy_kcal, 300)
})

test('Recette : produit « par portion » sans poids, noté en grammes → non compté (quantité)', () => {
  const r = computeRecipeNutrition([ing({ amount: 100, unit: 'g', custom_food_id: 'p-pate' }), ing({ amount: 50, unit: 'g', ciqual_code: '13054' })], 1, foods)!
  assert.equal(r.counted, 1); assert.deepEqual(r.missing.map((m) => m.reason), ['no_quantity'])
})

test('Recette : produit supprimé (introuvable) → « non lié »', () => {
  const r = computeRecipeNutrition([ing({ amount: 1, custom_food_id: 'disparu' }), ing({ amount: 50, unit: 'g', ciqual_code: '13054' })], 1, foods)!
  assert.deepEqual(r.missing.map((m) => m.reason), ['not_linked'])
})

console.log(`\n${n} tests réussis`)
