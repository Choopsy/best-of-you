/**
 * Tests du calcul des objectifs — lancer avec : npx tsx scripts/test-targets.ts
 * Les valeurs attendues sont recalculées à la main à partir des formules publiées.
 */
import assert from 'node:assert/strict'
import { bmrMifflin, computeTargets, ageFromBirthDate } from '../lib/targets'

let n = 0
function test(name: string, fn: () => void) {
  fn()
  n++
  console.log('✓', name)
}

test('Mifflin-St Jeor, homme et femme', () => {
  // 10×70 + 6,25×175 − 5×30 + 5 = 1648,75
  assert.equal(bmrMifflin('male', 70, 175, 30), 1648.75)
  // 10×60 + 6,25×165 − 5×30 − 161 = 1320,25
  assert.equal(bmrMifflin('female', 60, 165, 30), 1320.25)
})

test('Âge à partir de la date de naissance', () => {
  assert.equal(ageFromBirthDate('2000-10-27', new Date('2026-10-26T12:00:00')), 25)
  assert.equal(ageFromBirthDate('2000-10-26', new Date('2026-10-26T12:00:00')), 26)
})

test('Homme 30 ans, 70 kg, 175 cm, modérément actif, maintien', () => {
  const t = computeTargets({ sex: 'male', ageYears: 30, heightCm: 175, weightKg: 70, activity: 'moderate', goal: 'maintain' })
  // 1648,75 × 1,6 = 2638 → arrondi à 2640
  assert.equal(t.tdee, 2638)
  assert.equal(t.energyKcal, 2640)
  // 0,83 × 70 = 58,1 ; plancher 10 % = 264 kcal / 4 = 66 g → 66
  assert.equal(t.proteinsG, 66)
  // 35 % × 2640 / 9 = 102,7 → 103
  assert.equal(t.fatG, 103)
  // (2640 − 66×4 − 103×9) / 4 = 362,25 → 362
  assert.equal(t.carbsG, 362)
  assert.equal(t.warnings.length, 0)
})

test('Femme 28 ans, 65 kg, 165 cm, peu active, perte 0,5 kg/sem', () => {
  const t = computeTargets({ sex: 'female', ageYears: 28, heightCm: 165, weightKg: 65, activity: 'sedentary', goal: 'lose', lossRateKgWeek: 0.5 })
  // BMR = 650 + 1031,25 − 140 − 161 = 1380,25 ; × 1,4 = 1932,35 ; − 550 = 1382 → plancher BMR 1380,25 non atteint
  assert.equal(t.energyKcal, 1380)
  // IMC 23,9 → poids réel ; 1,2 × 65 = 78
  assert.equal(t.proteinsG, 78)
  assert.equal(t.effectiveGoal, 'lose')
})

test('Plancher appliqué si le déficit est trop fort', () => {
  const t = computeTargets({ sex: 'female', ageYears: 40, heightCm: 158, weightKg: 55, activity: 'sedentary', goal: 'lose', lossRateKgWeek: 0.75 })
  // BMR = 550 + 987,5 − 200 − 161 = 1176,5 → plancher = max(1176,5 ; 1200) = 1200
  assert.equal(t.energyKcal, 1200)
  assert.equal(t.warnings.length, 1)
})

test('Pas de perte de poids sous un IMC de 18,5', () => {
  const t = computeTargets({ sex: 'female', ageYears: 25, heightCm: 170, weightKg: 52, activity: 'moderate', goal: 'lose' })
  assert.equal(t.effectiveGoal, 'maintain')
  assert.ok(t.warnings[0].includes('18,5'))
})

test('Prise de muscle : +10 % et 1,6 g/kg', () => {
  const t = computeTargets({ sex: 'male', ageYears: 22, heightCm: 180, weightKg: 75, activity: 'active', goal: 'gain_muscle' })
  // BMR = 750 + 1125 − 110 + 5 = 1770 ; × 1,8 = 3186 ; × 1,1 = 3504,6 → 3500
  assert.equal(t.energyKcal, 3500)
  assert.equal(t.proteinsG, 120) // 1,6 × 75
})

test('IMC > 25 : protéines sur le poids à IMC 25', () => {
  const t = computeTargets({ sex: 'male', ageYears: 45, heightCm: 180, weightKg: 100, activity: 'moderate', goal: 'lose', lossRateKgWeek: 0.5 })
  // poids de référence = 25 × 1,8² = 81 kg → 1,2 × 81 = 97,2 → 97
  assert.equal(t.proteinsG, 97)
})

test('Plus de 70 ans : protéines au moins 15 % de l\'énergie', () => {
  const t = computeTargets({ sex: 'female', ageYears: 75, heightCm: 160, weightKg: 60, activity: 'sedentary', goal: 'maintain' })
  // BMR = 600 + 1000 − 375 − 161 = 1064 ; × 1,4 = 1489,6 → 1490 ; 15 % = 55,9 g > 0,83 × 60 = 49,8
  assert.equal(t.energyKcal, 1490)
  assert.equal(t.proteinsG, 56)
})

test('Refus en dessous de 18 ans', () => {
  assert.throws(() => computeTargets({ sex: 'male', ageYears: 16, heightCm: 175, weightKg: 60, activity: 'moderate', goal: 'maintain' }))
})

test('Les macros retombent sur l\'énergie totale (± arrondis)', () => {
  for (const goal of ['lose', 'maintain', 'gain_muscle'] as const) {
    const t = computeTargets({ sex: 'female', ageYears: 35, heightCm: 168, weightKg: 62, activity: 'active', goal })
    const kcal = t.proteinsG * 4 + t.fatG * 9 + t.carbsG * 4
    assert.ok(Math.abs(kcal - t.energyKcal) <= 10, `${goal}: ${kcal} vs ${t.energyKcal}`)
  }
})

console.log(`\n${n} tests OK`)
