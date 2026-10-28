/** Tests des quantités en grammes ou en portions — npx tsx scripts/test-portions.ts */
import assert from 'node:assert/strict'
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

console.log(`\n${n} tests réussis`)
