'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Plus, Refrigerator, MoreHorizontal, ArrowDownUp, CloudOff, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  addShoppingItem, clearChecked, deleteShoppingItem, storeCheckedInFridge, toggleShoppingItem,
} from '@/actions/shopping'
import { groupByAisle } from '@/lib/aisles'
import { applyOps, isNetworkError, pushOp, type ListItem, type Op } from '@/lib/offline-list'
import { ItemMenu } from './item-menu'
import { AisleOrderSheet } from './aisle-order-sheet'

export type ShoppingItem = ListItem

interface Props {
  items: ShoppingItem[]
  overrides: Record<string, string>
  order: string[] | null
  householdId: string
  /** Heure du rendu serveur : sert à savoir si la copie du téléphone est plus récente */
  renderedAt: number
}

interface Snapshot { renderedAt: number; items: ShoppingItem[]; overrides: Record<string, string>; order: string[] | null }

// Le stockage du navigateur peut être indisponible (navigation privée…) : jamais bloquant
const read = <T,>(key: string): T | null => {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : null } catch { return null }
}
const write = (key: string, value: unknown) => {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* rien */ }
}

const qty = (i: ShoppingItem) =>
  i.quantity != null ? `${Number(i.quantity).toLocaleString('fr-FR')}${i.unit && i.unit !== 'pièce' ? ` ${i.unit}` : ''}` : null

export function ShoppingList({ items, overrides, order, householdId, renderedAt }: Props) {
  const router = useRouter()
  const KEY_SNAP = `equilibre:courses:${householdId}:copie`
  const KEY_OPS = `equilibre:courses:${householdId}:attente`

  const [base, setBase] = useState<Snapshot>({ renderedAt, items, overrides, order })
  const [ops, setOps] = useState<Op[]>([])
  const [online, setOnline] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [text, setText] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [menuFor, setMenuFor] = useState<ShoppingItem | null>(null)
  const [ordering, setOrdering] = useState(false)
  const [pending, start] = useTransition()
  const opsRef = useRef<Op[]>([])
  const syncingRef = useRef(false)

  const saveOps = useCallback((next: Op[]) => { opsRef.current = next; setOps(next); write(KEY_OPS, next) }, [KEY_OPS])

  // Nouvelles données du serveur : on les garde aussi sur le téléphone
  useEffect(() => {
    const snap = read<Snapshot>(KEY_SNAP)
    // Page ouverte sans réseau depuis une copie plus ancienne : la copie du téléphone est plus fraîche
    const next = snap && snap.renderedAt > renderedAt ? snap : { renderedAt, items, overrides, order }
    setBase(next)
    if (next.renderedAt === renderedAt) write(KEY_SNAP, next)
  }, [items, overrides, order, renderedAt, KEY_SNAP])

  // Envoie les changements en attente, dans l'ordre ; s'arrête à la première coupure
  const flush = useCallback(async () => {
    if (syncingRef.current || opsRef.current.length === 0) return
    syncingRef.current = true; setSyncing(true)
    let sent = 0
    try {
      while (opsRef.current.length) {
        const op = opsRef.current[0]
        try {
          const res = op.kind === 'add' ? await addShoppingItem(op.name, op.id)
            : op.kind === 'toggle' ? await toggleShoppingItem(op.id, op.checked)
            : await deleteShoppingItem(op.id)
          if (res.error) setMessage(res.error) // refus du serveur : on n'insiste pas
          saveOps(opsRef.current.slice(1))
          sent++
        } catch (e) {
          if (isNetworkError(e)) { setOnline(false); break }
          saveOps(opsRef.current.slice(1))
        }
      }
    } finally {
      syncingRef.current = false; setSyncing(false)
      if (sent) router.refresh()
    }
  }, [router, saveOps])

  // Au démarrage : changements restés en attente, et état du réseau
  useEffect(() => {
    const saved = read<Op[]>(KEY_OPS) ?? []
    opsRef.current = saved; setOps(saved)
    setOnline(navigator.onLine)
    const goOnline = () => { setOnline(true); flush() }
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    if (navigator.onLine) flush()
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline) }
  }, [KEY_OPS, flush])

  const act = (op: Op) => {
    saveOps(pushOp(opsRef.current, op))
    if (navigator.onLine) flush()
    else setOnline(false)
  }

  const add = (e: React.FormEvent) => {
    e.preventDefault()
    const name = text.trim()
    if (!name) return
    if (name.length > 120) { setMessage('Article trop long.'); return }
    act({ kind: 'add', id: crypto.randomUUID(), name })
    setText('')
  }

  const view = useMemo(() => applyOps(base.items, ops), [base.items, ops])
  const todo = view.filter((i) => !i.checked)
  const done = view.filter((i) => i.checked).sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  const groups = useMemo(() => groupByAisle(todo, base.overrides, base.order), [todo, base.overrides, base.order])

  const Row = ({ i }: { i: ShoppingItem }) => (
    <li className="flex items-center gap-1 pl-2 pr-1 py-1">
      <button type="button" role="checkbox" aria-checked={i.checked}
        onClick={() => act({ kind: 'toggle', id: i.id, checked: !i.checked })}
        className="flex min-h-12 flex-1 items-center gap-3 rounded-xl px-2 text-left">
        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition-colors ${
          i.checked ? 'border-sage bg-sage text-primary-foreground' : 'border-input'}`}>
          {i.checked && <Check className="h-4 w-4" strokeWidth={3} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block text-[15px] font-bold ${i.checked ? 'line-through text-muted-foreground' : ''}`}>
            {i.name}{qty(i) && <span className="font-normal text-muted-foreground"> · {qty(i)}</span>}
          </span>
          {i.note && !i.checked && <span className="block text-xs text-muted-foreground">{i.note}</span>}
        </span>
      </button>
      <button type="button" aria-label={`Options pour ${i.name}`} onClick={() => setMenuFor(i)}
        className="h-11 w-11 shrink-0 flex items-center justify-center rounded-xl text-muted-foreground hover:bg-muted">
        <MoreHorizontal className="h-5 w-5" />
      </button>
    </li>
  )

  return (
    <div className="space-y-4">
      {(!online || ops.length > 0) && (
        <div role="status" className="flex items-start gap-2.5 rounded-2xl bg-muted px-4 py-3 text-sm">
          {online ? <RefreshCw className={`h-4 w-4 shrink-0 mt-0.5 ${syncing ? 'animate-spin' : ''}`} /> : <CloudOff className="h-4 w-4 shrink-0 mt-0.5" />}
          <p>
            {online
              ? `Envoi de ${ops.length} changement${ops.length > 1 ? 's' : ''}…`
              : <>Hors connexion. Tes coches sont gardées sur ce téléphone{ops.length ? ` (${ops.length} en attente)` : ''} et seront envoyées au retour du réseau.</>}
          </p>
        </div>
      )}

      <form onSubmit={add} className="flex gap-2">
        <label htmlFor="new-item" className="sr-only">Ajouter un article</label>
        <Input id="new-item" value={text} onChange={(e) => setText(e.target.value)} placeholder="Ajouter un article (pain, lessive…)" className="h-11 rounded-2xl" />
        <Button type="submit" size="icon" className="h-11 w-11 shrink-0 rounded-2xl" aria-label="Ajouter" disabled={!text.trim()}>
          <Plus className="h-5 w-5" />
        </Button>
      </form>

      {todo.length > 0 && (
        <div className="flex justify-end -mb-2">
          <button type="button" onClick={() => setOrdering(true)} disabled={!online}
            className="flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-bold text-muted-foreground disabled:opacity-50">
            <ArrowDownUp className="h-4 w-4" /> Ordre des rayons
          </button>
        </div>
      )}

      {groups.map((g) => (
        <section key={g.aisle} className="space-y-1.5" aria-label={g.label}>
          <h2 className="px-1 text-[13px] font-bold uppercase tracking-wide text-muted-foreground">
            {g.label} <span className="font-normal">· {g.items.length}</span>
          </h2>
          <ul className="rounded-3xl bg-card divide-y shadow-[0_1px_0_var(--border)]">
            {g.items.map((i) => <Row key={i.id} i={i} />)}
          </ul>
        </section>
      ))}

      {todo.length === 0 && done.length > 0 && (
        <p className="text-center text-sm text-muted-foreground py-2">Tout est dans le panier 🎉</p>
      )}

      {done.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-base text-muted-foreground">Dans le panier ({done.length})</h2>
          <ul className="rounded-3xl bg-card divide-y shadow-[0_1px_0_var(--border)]">
            {done.map((i) => <Row key={i.id} i={i} />)}
          </ul>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="rounded-2xl gap-1.5" disabled={pending || !online || ops.length > 0}
              onClick={() => start(async () => { await clearChecked(); router.refresh() })}>
              Retirer de la liste
            </Button>
            <Button className="rounded-2xl gap-1.5" disabled={pending || !online || ops.length > 0}
              onClick={() => start(async () => {
                const res = await storeCheckedInFridge()
                setMessage(res.error ?? `${res.count} article${(res.count ?? 0) > 1 ? 's' : ''} rangé${(res.count ?? 0) > 1 ? 's' : ''} au frigo. Pense à ajouter les dates.`)
                router.refresh()
              })}>
              <Refrigerator className="h-4 w-4" /> Ranger au frigo
            </Button>
          </div>
          {!online && <p className="text-xs text-muted-foreground text-center">Ranger au frigo sera possible au retour du réseau.</p>}
        </section>
      )}
      {message && <p className="text-sm text-muted-foreground text-center">{message}</p>}

      {menuFor && (
        <ItemMenu item={menuFor} overrides={base.overrides} online={online}
          onDelete={() => { act({ kind: 'delete', id: menuFor.id }); setMenuFor(null) }}
          onClose={() => setMenuFor(null)} />
      )}
      {ordering && <AisleOrderSheet order={base.order} onClose={() => setOrdering(false)} />}
    </div>
  )
}
