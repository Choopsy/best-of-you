/** Tests de l'import d'un repas en JSON — npx tsx scripts/test-meal-import.ts */
import assert from 'node:assert/strict'
import { MEAL_IMPORT_EXAMPLE, parseMealImport } from '../lib/meal-import'

let n = 0
const test = (name: string, fn: () => void) => { fn(); n++; console.log('✓', name) }
const err = (text: string) => { const r = parseMealImport(text); assert.equal(r.ok, false); return r.ok ? '' : r.error }

test("L'exemple de la page est valide", () => {
  const r = parseMealImport(MEAL_IMPORT_EXAMPLE)
  assert.ok(r.ok)
  assert.equal(r.meal, 'lunch')
  assert.equal(r.items.length, 1)
  assert.equal(r.items[0].nutrients.energy_kcal, 1150)
  assert.equal(r.items[0].nutrients.saturated_fat_g, 20)
  assert.equal(r.items[0].grams, 450)
})

test('Un seul plat à la racine, sans « type » ni « plats »', () => {
  const r = parseMealImport('{ "nom": "Salade niçoise", "nutriments": { "kcal": 480, "proteines": 22 } }')
  assert.ok(r.ok)
  assert.equal(r.items[0].label, 'Salade niçoise')
  assert.equal(r.items[0].nutrients.fat_g, 0) // absent = 0
  assert.equal(r.date, null); assert.equal(r.meal, null)
})

test('Plusieurs plats, date, repas écrit avec accents et majuscules', () => {
  const r = parseMealImport(JSON.stringify({
    type: 'Repas', date: '2026-10-30', repas: 'Dîner',
    plats: [{ nom: 'Entrée', nutriments: { kcal: 200 } }, { nom: 'Dessert', portions: 1, nutriments: { kcal: 350, sucres: 30 } }],
  }))
  assert.ok(r.ok)
  assert.equal(r.meal, 'dinner'); assert.equal(r.date, '2026-10-30')
  assert.equal(r.items.length, 2); assert.equal(r.items[1].servings, 1)
})

test("Noms de l'appli et nombres « à la française » acceptés, valeurs arrondies", () => {
  const r = parseMealImport('{ "nom": "Soupe", "nutriments": { "energy_kcal": 152.6, "sel": "1,234" } }')
  assert.ok(r.ok)
  assert.equal(r.items[0].nutrients.energy_kcal, 153)
  assert.equal(r.items[0].nutrients.salt_g, 1.2)
})

test('Erreurs claires', () => {
  assert.match(err('pas du json'), /JSON valide/)
  assert.match(err('[1, 2]'), /commencer par/)
  assert.match(err('{ "type": "recette", "nom": "x" }'), /recettes/)
  assert.match(err('{ "type": "photo" }'), /inconnu/)
  assert.match(err('{ "plats": [] }'), /Aucun plat/)
  assert.match(err('{ "nom": "Pizza" }'), /nutriments/)
  assert.match(err('{ "nom": "Pizza", "nutriments": { "proteines": 30 } }'), /calories/)
  assert.match(err('{ "nom": "Pizza", "nutriments": { "kcal": 99999 } }'), /trop élevé/)
  assert.match(err('{ "nom": "Pizza", "nutriments": { "kcal": -5 } }'), /négative/)
  assert.match(err('{ "nom": "Pizza", "nutriments": { "kcal": 800, "vitamine": 2 } }'), /inconnue/)
  assert.match(err('{ "date": "02/11/2026", "nom": "x", "nutriments": { "kcal": 1 } }'), /Date invalide/)
  assert.match(err('{ "repas": "brunch", "nom": "x", "nutriments": { "kcal": 1 } }'), /Repas inconnu/)
  assert.match(err(JSON.stringify({ plats: Array.from({ length: 21 }, () => ({ nom: 'x', nutriments: { kcal: 1 } })) })), /Trop de plats/)
  assert.match(err(' '.repeat(60_000)), /trop gros/)
})

console.log(`\n${n} tests réussis`)
