'use client'

import { useOptimistic, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Plus, Trash2, Refrigerator } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { addShoppingItem, clearChecked, deleteShoppingItem, storeCheckedInFridge, toggleShoppingItem } from '@/actions/shopping'

export interface ShoppingItem {
  id: string
  name: string
  quantity: number | null
  unit: string | null
  note: string | null
  checked: boolean
}

const qty = (i: ShoppingItem) =>
  i.quantity != null ? `${Number(i.quantity).toLocaleString('fr-FR')}${i.unit && i.unit !== 'pièce' ? ` ${i.unit}` : ''}` : null

export function ShoppingList({ items }: { items: ShoppingItem[] }) {
  const router = useRouter()
  const [optimistic, setOptimistic] = useOptimistic(items, (state, change: { id: string; checked: boolean }) =>
    state.map((i) => (i.id === change.id ? { ...i, checked: change.checked } : i)))
  const [text, setText] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const toggle = (i: ShoppingItem) => start(async () => {
    setOptimistic({ id: i.id, checked: !i.checked })
    await toggleShoppingItem(i.id, !i.checked)
    router.refresh()
  })

  const add = (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    start(async () => {
      const res = await addShoppingItem(text)
      if (res.error) { setMessage(res.error); return }
      setText('')
      router.refresh()
    })
  }

  const todo = optimistic.filter((i) => !i.checked)
  const done = optimistic.filter((i) => i.checked)

  const Row = ({ i }: { i: ShoppingItem }) => (
    <li className="flex items-center gap-2 pl-2 pr-1 py-1.5">
      <button type="button" role="checkbox" aria-checked={i.checked} onClick={() => toggle(i)}
        className="flex min-h-11 flex-1 items-center gap-3 rounded-xl px-2 text-left">
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
      <button type="button" aria-label={`Supprimer ${i.name}`} onClick={() => start(async () => { await deleteShoppingItem(i.id); router.refresh() })}
        className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-destructive">
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  )

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="flex gap-2">
        <label htmlFor="new-item" className="sr-only">Ajouter un article</label>
        <Input id="new-item" value={text} onChange={(e) => setText(e.target.value)} placeholder="Ajouter un article (pain, lessive…)" className="h-11 rounded-2xl" />
        <Button type="submit" size="icon" className="h-11 w-11 shrink-0 rounded-2xl" aria-label="Ajouter" disabled={pending || !text.trim()}>
          <Plus className="h-5 w-5" />
        </Button>
      </form>

      {todo.length > 0 && (
        <ul className="rounded-3xl bg-card divide-y shadow-[0_1px_0_var(--border)]">
          {todo.map((i) => <Row key={i.id} i={i} />)}
        </ul>
      )}
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
            <Button variant="outline" className="rounded-2xl gap-1.5" disabled={pending}
              onClick={() => start(async () => { await clearChecked(); router.refresh() })}>
              Retirer de la liste
            </Button>
            <Button className="rounded-2xl gap-1.5" disabled={pending}
              onClick={() => start(async () => {
                const res = await storeCheckedInFridge()
                setMessage(res.error ?? `${res.count} article${(res.count ?? 0) > 1 ? 's' : ''} rangé${(res.count ?? 0) > 1 ? 's' : ''} au frigo. Pense à ajouter les dates.`)
                router.refresh()
              })}>
              <Refrigerator className="h-4 w-4" /> Ranger au frigo
            </Button>
          </div>
        </section>
      )}
      {message && <p className="text-sm text-muted-foreground text-center">{message}</p>}
    </div>
  )
}
