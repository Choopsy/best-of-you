/** Tests du rangement par rayon — npx tsx scripts/test-aisles.ts */
import assert from 'node:assert/strict'
import { aisleFor, groupByAisle, guessAisle, resolveOrder, DEFAULT_ORDER } from '../lib/aisles'

let n = 0
const test = (name: string, fn: () => void) => { fn(); n++; console.log('✓', name) }

test('Noms Ciqual du planning', () => {
  const cases: [string, string][] = [
    ['Courgette, pulpe et peau, crue', 'fruits_legumes'],
    ['Lait demi-écrémé, pasteurisé', 'cremerie'],
    ['Oeuf, cru', 'cremerie'],
    ['Farine de blé tendre ou froment T55 (pour pains)', 'epicerie_sucree'],
    ['Sucre blanc', 'epicerie_sucree'],
    ["Huile d'olive vierge extra", 'epicerie_salee'],
    ['Pâtes alimentaires, cuites', 'epicerie_salee'],
    ['Pomme de terre, cuite à la vapeur', 'fruits_legumes'],
    ['Poulet, filet, sans peau, cru', 'viande_poisson'],
    ['Yaourt nature', 'cremerie'],
    ['Jambon blanc', 'viande_poisson'],
  ]
  for (const [name, aisle] of cases) assert.equal(guessAisle(name), aisle, name)
})

test('Articles tapés à la main, pluriels et accents', () => {
  const cases: [string, string][] = [
    ['tomates', 'fruits_legumes'], ['Œufs', 'cremerie'], ['baguette', 'boulangerie'], ['pain de mie', 'boulangerie'],
    ['lessive', 'entretien'], ['liquide vaisselle', 'entretien'], ['gel douche', 'hygiene'], ['dentifrice', 'hygiene'],
    ['bières', 'boissons'], ['jus d orange', 'boissons'], ['crème fraîche', 'cremerie'], ['crème solaire', 'hygiene'],
    ['petits pois surgelés', 'surgeles'], ['petits pois', 'fruits_legumes'], ['café', 'epicerie_sucree'],
    ['pâte feuilletée', 'cremerie'], ['lait de coco', 'epicerie_salee'], ['lait d avoine', 'boissons'],
    ['frites', 'surgeles'], ['ampoule', 'autre'], ['', 'autre'],
  ]
  for (const [name, aisle] of cases) assert.equal(guessAisle(name), aisle, name)
})

test('« laitue » ne part pas en crèmerie (pas de recherche par début de mot)', () => {
  assert.equal(guessAisle('laitue'), 'fruits_legumes')
})

test('La correction du foyer passe avant la devinette', () => {
  assert.equal(aisleFor('Tofu fumé', {}), 'cremerie')
  assert.equal(aisleFor('Tofu fumé', { 'tofu fume': 'epicerie_salee' }), 'epicerie_salee')
  assert.equal(aisleFor('Tofu fumé', { 'tofu fume': 'n_importe_quoi' }), 'cremerie')
})

test('Ordre du magasin : complété et nettoyé', () => {
  assert.deepEqual(resolveOrder(null), DEFAULT_ORDER)
  const o = resolveOrder(['boissons', 'faux', 'cremerie'])
  assert.equal(o[0], 'boissons'); assert.equal(o[1], 'cremerie'); assert.equal(o.length, DEFAULT_ORDER.length)
})

test('Regroupement dans l\'ordre choisi, rayons vides omis, tri alphabétique', () => {
  const groups = groupByAisle([{ name: 'Lessive' }, { name: 'Tomates' }, { name: 'Carottes' }, { name: 'Lait' }], {},
    ['entretien', 'cremerie'])
  assert.deepEqual(groups.map((g) => g.aisle), ['entretien', 'cremerie', 'fruits_legumes'])
  assert.deepEqual(groups[2].items.map((i) => i.name), ['Carottes', 'Tomates'])
})

console.log(`\n${n} tests OK`)
