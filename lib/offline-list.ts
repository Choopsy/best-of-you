/**
 * Liste de courses utilisable sans réseau : les changements sont appliqués tout de
 * suite sur le téléphone et gardés dans une file d'attente, envoyée au retour du réseau.
 * Module pur (testé par scripts/test-offline-list.ts).
 */

export interface ListItem {
  id: string
  name: string
  quantity: number | null
  unit: string | null
  note: string | null
  checked: boolean
}

export type Op =
  | { kind: 'add'; id: string; name: string }
  | { kind: 'toggle'; id: string; checked: boolean }
  | { kind: 'delete'; id: string }

/** La liste telle que l'utilisateur doit la voir : données du serveur + changements pas encore envoyés. */
export function applyOps(items: ListItem[], ops: Op[]): ListItem[] {
  let out = [...items]
  for (const op of ops) {
    if (op.kind === 'add') {
      if (!out.some((i) => i.id === op.id)) out.push({ id: op.id, name: op.name, quantity: null, unit: null, note: null, checked: false })
    } else if (op.kind === 'toggle') {
      out = out.map((i) => (i.id === op.id ? { ...i, checked: op.checked } : i))
    } else {
      out = out.filter((i) => i.id !== op.id)
    }
  }
  return out
}

/** Ajoute un changement à la file en la gardant courte (une seule coche par article, ajout puis suppression = rien). */
export function pushOp(ops: Op[], op: Op): Op[] {
  if (op.kind === 'toggle') {
    // Seule la dernière coche compte (cocher puis décocher = un seul envoi)
    return [...ops.filter((o) => !(o.kind === 'toggle' && o.id === op.id)), op]
  }
  if (op.kind === 'delete') {
    const wasLocalAdd = ops.some((o) => o.kind === 'add' && o.id === op.id)
    const rest = ops.filter((o) => o.id !== op.id)
    return wasLocalAdd ? rest : [...rest, op]
  }
  return [...ops, op]
}

/** Erreur réseau (pas de connexion) plutôt que refus du serveur : on garde le changement pour plus tard. */
export function isNetworkError(e: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true
  const msg = e instanceof Error ? e.message : String(e)
  return /fetch|network|load failed|connexion|offline/i.test(msg)
}
