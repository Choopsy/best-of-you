/** Tests de la liste hors connexion — npx tsx scripts/test-offline-list.ts */
import assert from 'node:assert/strict'
import { applyOps, pushOp, type ListItem, type Op } from '../lib/offline-list'

let n = 0
const test = (name: string, fn: () => void) => { fn(); n++; console.log('✓', name) }
const item = (id: string, name: string, checked = false): ListItem => ({ id, name, quantity: null, unit: null, note: null, checked })

test('Les coches hors ligne s\'appliquent sur la liste du serveur', () => {
  const list = applyOps([item('a', 'Pain'), item('b', 'Lait')], [{ kind: 'toggle', id: 'a', checked: true }])
  assert.equal(list.find((i) => i.id === 'a')!.checked, true)
  assert.equal(list.find((i) => i.id === 'b')!.checked, false)
})

test('Cocher puis décocher = un seul changement en attente', () => {
  let ops: Op[] = []
  ops = pushOp(ops, { kind: 'toggle', id: 'a', checked: true })
  ops = pushOp(ops, { kind: 'toggle', id: 'a', checked: false })
  assert.deepEqual(ops, [{ kind: 'toggle', id: 'a', checked: false }])
})

test('Article ajouté hors ligne, coché, puis supprimé : rien à envoyer', () => {
  let ops: Op[] = []
  ops = pushOp(ops, { kind: 'add', id: 'x', name: 'Beurre' })
  ops = pushOp(ops, { kind: 'toggle', id: 'x', checked: true })
  assert.equal(applyOps([], ops)[0].checked, true)
  ops = pushOp(ops, { kind: 'delete', id: 'x' })
  assert.deepEqual(ops, [])
})

test('Ajout hors ligne : l\'article apparaît une seule fois, même après la synchronisation', () => {
  const ops: Op[] = [{ kind: 'add', id: 'x', name: 'Beurre' }]
  assert.equal(applyOps([], ops).length, 1)
  // le serveur a reçu l'article mais la file n'est pas encore vidée
  assert.equal(applyOps([item('x', 'Beurre')], ops).length, 1)
})

test('Suppression d\'un article du serveur', () => {
  const ops = pushOp([], { kind: 'delete', id: 'a' })
  assert.deepEqual(applyOps([item('a', 'Pain'), item('b', 'Lait')], ops).map((i) => i.id), ['b'])
})

console.log(`\n${n} tests OK`)
