/**
 * Tests des suggestions et du sport — lancer avec : npx tsx scripts/test-suggest.ts
 */
import assert from 'node:assert/strict'
import { suggestRecipes, isStaple } from '../lib/suggest'
import { netKcal, weekSummary, intensityOf } from '../lib/activities'
import { weightTrend, weeklyRate } from '../lib/weight'

let n = 0
function test(name: string, fn: () => void) { fn(); n++; console.log('✓', name) }
const TODAY = '2026-10-26'

test('Placard de base ignoré', () => {
  assert.ok(isStaple('Sel fin'))
  assert.ok(isStaple("Huile d'olive"))
  assert.ok(!isStaple('Selle d\'agneau'))
})

test('Suggestions : la recette qui sauve un aliment qui périme passe devant', () => {
  const recipes = [
    { id: 'a', title: 'Pâtes', ingredients: [{ name: 'Pâtes', ciqual_code: '1' }, { name: 'Tomate', ciqual_code: '2' }, { name: 'Sel', ciqual_code: null }] },
    { id: 'b', title: 'Crêpes', ingredients: [{ name: 'Farine', ciqual_code: '3' }, { name: 'Lait', ciqual_code: '4' }, { name: 'Oeuf', ciqual_code: '5' }] },
    { id: 'c', title: 'Salade', ingredients: [{ name: 'Laitue', ciqual_code: '6' }] },
  ]
  const fridge = [
    { name: 'Pâtes', ciqual_code: '1', expires_on: null },
    { name: 'Tomates', ciqual_code: '2', expires_on: '2026-11-20' },
    { name: 'Lait', ciqual_code: '4', expires_on: '2026-10-27' },  // demain
    { name: 'Farine', ciqual_code: '3', expires_on: null },
    { name: 'Laitue', ciqual_code: '6', expires_on: '2026-10-20' }, // périmée : ne compte pas
  ]
  const s = suggestRecipes(recipes, fridge, TODAY)
  // Pâtes : 2/2 = 100 ; Crêpes : 2/3 ≈ 67 + bonus lait (demain : (3+1-1)×10 = 30) = 97
  assert.deepEqual(s.map((x) => x.id), ['a', 'b'])
  assert.equal(s[0].total, 2, 'le sel ne compte pas')
  assert.deepEqual(s[1].saves, [{ name: 'Lait', days: 1 }])
  assert.deepEqual(s[1].missing, ['Oeuf'])
  assert.equal(s.find((x) => x.id === 'c'), undefined, 'laitue périmée : pas de suggestion')
})

test('Dépense nette d\'une séance (Compendium 2024, correction par le métabolisme)', () => {
  // Course 8,5 MET, 30 min, métabolisme 1 680 kcal/j : (8,5 − 1) × 70 × 0,5 = 262,5 → 265
  assert.equal(netKcal(8.5, 30, 1680), 265)
  // Yoga 2,3 MET, 60 min, 1 440 kcal/j : 1,3 × 60 × 1 = 78 → 80
  assert.equal(netKcal(2.3, 60, 1440), 80)
})

test('Bilan OMS de la semaine', () => {
  assert.equal(intensityOf(2.3), 'light')
  assert.equal(intensityOf(4.8), 'moderate')
  assert.equal(intensityOf(8.5), 'vigorous')
  const w = weekSummary([
    { done_on: '2026-10-20', duration_min: 30, met: 8.5, activity_key: 'run_8' },   // 30 × 2 = 60
    { done_on: '2026-10-21', duration_min: 45, met: 4.8, activity_key: 'walk_brisk' }, // 45
    { done_on: '2026-10-22', duration_min: 60, met: 3.5, activity_key: 'strength' }, // 60 + renfo
    { done_on: '2026-10-23', duration_min: 60, met: 2.3, activity_key: 'yoga' },     // léger : 0
  ])
  assert.deepEqual(w, { sessions: 4, moderateEquivalent: 165, strengthDays: 1 })
})

test('Tendance du poids : lissée et interpolée', () => {
  const pts = weightTrend([
    { logged_on: '2026-10-01', weight_kg: 70 },
    { logged_on: '2026-10-03', weight_kg: 72 },
  ])
  assert.equal(pts.length, 3)
  assert.equal(pts[1].weight, null, 'jour sans pesée')
  // jour 2 : interpolé 71 → 70 + 0,1 × 1 = 70,1 ; jour 3 : 70,1 + 0,1 × 1,9 = 70,29
  assert.equal(pts[1].trend, 70.1)
  assert.equal(pts[2].trend, 70.29)
  assert.equal(weeklyRate(pts), null, 'pas assez de recul')
})

console.log(`\n${n} tests OK`)
