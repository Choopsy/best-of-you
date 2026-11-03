/** Tests de la photo du repas (réponse de l'IA, type d'image, motifs de recherche) — npx tsx scripts/test-meal-photo.ts */
import assert from 'node:assert/strict'
import { MAX_PHOTO_ITEMS, PHOTO_SCHEMA, parsePhotoAnalysis, remainingText, sniffImageType } from '../lib/meal-photo'
import { matchPatterns } from '../lib/food-search'

let n = 0
const test = (name: string, fn: () => void) => { fn(); n++; console.log('✓', name) }
const ok = (data: unknown) => { const r = parsePhotoAnalysis(typeof data === 'string' ? data : JSON.stringify(data)); assert.ok(r.ok); return r.items }

test('Réponse attendue : noms, grammes arrondis, confiance', () => {
  const items = ok({ aliments: [
    { nom: 'Riz blanc cuit', grammes: 152.4, confiance: 'haute' },
    { nom: 'Poulet rôti', grammes: 120, confiance: 'moyenne' },
  ] })
  assert.deepEqual(items, [
    { name: 'Riz blanc cuit', grams: 152, confidence: 'haute' },
    { name: 'Poulet rôti', grams: 120, confidence: 'moyenne' },
  ])
})

test('Le schéma demandé à Claude ne contient aucun nutriment', () => {
  const props = Object.keys(PHOTO_SCHEMA.properties.aliments.items.properties)
  assert.deepEqual(props.sort(), ['confiance', 'grammes', 'nom'])
})

test('Liste vide : pas une erreur (photo sans nourriture)', () => {
  assert.deepEqual(ok({ aliments: [] }), [])
})

test('Grammes hors limites (0, négatif, plus de 2 000) : ligne écartée', () => {
  const items = ok({ aliments: [
    { nom: 'Pâtes', grammes: 0, confiance: 'haute' },
    { nom: 'Sauce', grammes: -20, confiance: 'haute' },
    { nom: 'Pastèque', grammes: 2500, confiance: 'haute' },
    { nom: 'Pomme', grammes: 2000, confiance: 'haute' },
    { nom: 'Sel', grammes: 0.6, confiance: 'basse' }, // arrondi à 1 g
  ] })
  assert.deepEqual(items.map((i) => [i.name, i.grams]), [['Pomme', 2000], ['Sel', 1]])
})

test('Nom vide, trop long ou absent : ligne écartée ; espaces et caractères de contrôle nettoyés', () => {
  const items = ok({ aliments: [
    { nom: '', grammes: 50, confiance: 'haute' },
    { nom: 'x'.repeat(61), grammes: 50, confiance: 'haute' },
    { grammes: 50, confiance: 'haute' },
    { nom: 42, grammes: 50, confiance: 'haute' },
    { nom: '  Haricots \n verts\t ', grammes: 80, confiance: 'haute' },
    { nom: '<b>Frites</b>', grammes: 100, confiance: 'haute' },
  ] })
  assert.deepEqual(items.map((i) => i.name), ['Haricots verts', 'b Frites /b'])
})

test('Grammes en texte (« 120,5 ») acceptés, texte non numérique écarté', () => {
  const items = ok({ aliments: [{ nom: 'Yaourt', grammes: '120,5', confiance: 'haute' }, { nom: 'Pain', grammes: 'beaucoup', confiance: 'haute' }] })
  assert.deepEqual(items.map((i) => [i.name, i.grams]), [['Yaourt', 121]])
})

test('Confiance inconnue : « moyenne »', () => {
  assert.equal(ok({ aliments: [{ nom: 'Salade', grammes: 40, confiance: 'certaine' }] })[0].confidence, 'moyenne')
})

test(`Au-delà de ${MAX_PHOTO_ITEMS} aliments : les ${MAX_PHOTO_ITEMS} premiers`, () => {
  const items = ok({ aliments: Array.from({ length: 30 }, (_, i) => ({ nom: `Aliment ${i + 1}`, grammes: 10, confiance: 'basse' })) })
  assert.equal(items.length, MAX_PHOTO_ITEMS)
  assert.equal(items[19].name, 'Aliment 20')
})

test('Liste directe sans enveloppe acceptée', () => {
  assert.equal(ok([{ nom: 'Banane', grammes: 120, confiance: 'haute' }]).length, 1)
})

test('Réponse illisible ou sans liste : erreur', () => {
  for (const text of ['', 'Voici les aliments : riz', '{"aliments": "riz"}', '{"plats": []}', 'null', '42']) {
    assert.equal(parsePhotoAnalysis(text).ok, false, text)
  }
})

test('Champs en trop (nutriments inventés) ignorés', () => {
  const [item] = ok({ aliments: [{ nom: 'Steak', grammes: 150, confiance: 'haute', kcal: 9999, proteines: 40 }] })
  assert.deepEqual(Object.keys(item).sort(), ['confidence', 'grams', 'name'])
})

test("Type d'image d'après les premiers octets", () => {
  assert.equal(sniffImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0])), 'image/jpeg')
  assert.equal(sniffImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), 'image/png')
  assert.equal(sniffImageType(new Uint8Array([...Buffer.from('RIFF'), 0, 0, 0, 0, ...Buffer.from('WEBP')])), 'image/webp')
  assert.equal(sniffImageType(new Uint8Array(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg">'))), null)
  assert.equal(sniffImageType(new Uint8Array([])), null)
})

test('Photos restantes : singulier, pluriel, plus rien', () => {
  assert.equal(remainingText(3), 'Encore 3 photos aujourd\'hui')
  assert.equal(remainingText(1), 'Encore 1 photo aujourd\'hui')
  assert.match(remainingText(0), /Plus de photo/)
})

test('Motifs de recherche : nom entier, mots au singulier dans l\'ordre, puis de moins en moins de mots', () => {
  assert.deepEqual(matchPatterns('Riz blanc cuit'), ['riz blanc cuit', 'riz%blanc%cuit', 'riz%blanc', 'riz'])
  assert.deepEqual(matchPatterns('Pâtes'), ['pates', 'pate'])
  assert.deepEqual(matchPatterns('Haricots verts cuits'), ['haricots verts cuits', 'haricot%vert%cuit', 'haricot%vert', 'haricot'])
  assert.deepEqual(matchPatterns("Pomme de terre sautée à l'huile").length, 4)
})

console.log(`\n${n} tests réussis`)
