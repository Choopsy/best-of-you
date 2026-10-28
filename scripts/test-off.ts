/** Tests de la recherche Open Food Facts — npx tsx scripts/test-off.ts */
import assert from 'node:assert/strict'
import { fetchOff, parseOff } from '../lib/off'

let n = 0
const test = async (name: string, fn: () => Promise<void> | void) => { await fn(); n++; console.log('✓', name) }
const product = { status: 1, product: { product_name_fr: 'Skyr nature', brands: 'Siggi\'s,Autre', nutriments: { 'energy-kcal_100g': 63, proteins_100g: 11, carbohydrates_100g: 4, fat_100g: 0.2, sugars_100g: 4, 'saturated-fat_100g': 0.1, fiber_100g: 0, salt_100g: 0.1 } } }
const respond = (status: number, body: unknown) => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status })
function mockFetch(...steps: (() => Response)[]) {
  let i = 0
  globalThis.fetch = (async () => { const s = steps[Math.min(i++, steps.length - 1)]; return s() }) as typeof fetch
  return () => i
}

async function main() {
await test('Lecture d\'un produit trouvé', () => {
  const p = parseOff(product, '5690527000014')
  assert.equal(p.found, true); assert.equal(p.name, 'Skyr nature'); assert.equal(p.brand, 'Siggi\'s'); assert.equal(p.per100?.proteins_g, 11)
  assert.equal(p.incomplete, false)
})

await test('Poids d\'une portion repris d\'Open Food Facts (serving_quantity)', () => {
  const p = parseOff({ ...product, product: { ...product.product, serving_quantity: '125' } }, '5690527000014')
  assert.equal(p.portionGrams, 125); assert.equal(p.perPortion, false)
  assert.equal(parseOff(product, '5690527000014').portionGrams, null)
})

await test('Produit absent : « inconnu », sans erreur ni nouvel essai', async () => {
  const calls = mockFetch(() => respond(404, { status: 0 }))
  const p = await fetchOff('1234567890128')
  assert.equal(p.found, false); assert.equal(p.error, undefined); assert.equal(calls(), 1)
})

await test('Service saturé (503) puis réponse : trouvé au 2e essai', async () => {
  const calls = mockFetch(() => respond(503, '<html>busy</html>'), () => respond(200, product))
  const p = await fetchOff('5690527000014')
  assert.equal(p.found, true); assert.equal(calls(), 2)
})

await test('Pas de réseau : erreur signalée (on proposera de réessayer)', async () => {
  globalThis.fetch = (async () => { throw new TypeError('fetch failed') }) as typeof fetch
  const p = await fetchOff('5690527000014')
  assert.equal(p.found, false); assert.equal(p.error, true)
})

  console.log(`\n${n} tests OK`)
}
main().catch((e) => { console.error(e); process.exit(1) })
