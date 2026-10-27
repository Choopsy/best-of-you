'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp, X } from 'lucide-react'
import { Portal } from '@/components/ui/portal'
import { Button } from '@/components/ui/button'
import { setAisleOrder } from '@/actions/shopping'
import { DEFAULT_ORDER, aisleLabel, resolveOrder, type AisleKey } from '@/lib/aisles'

/** Ordre des rayons dans ton magasin : flèches haut / bas, enregistré pour le foyer. */
export function AisleOrderSheet({ order, onClose }: { order: string[] | null; onClose: () => void }) {
  const router = useRouter()
  const [list, setList] = useState<AisleKey[]>(resolveOrder(order))
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const move = (i: number, d: -1 | 1) => setList((l) => {
    const j = i + d
    if (j < 0 || j >= l.length) return l
    const next = [...l]; [next[i], next[j]] = [next[j], next[i]]
    return next
  })

  const save = () => start(async () => {
    const res = await setAisleOrder(list)
    if (res.error) { setError(res.error); return }
    router.refresh()
    onClose()
  })

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-end sm:items-start sm:pt-16 justify-center">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div role="dialog" aria-modal="true" aria-label="Ordre des rayons"
          className="relative w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-3xl shadow-xl max-h-[92svh] overflow-y-auto">
          <div className="px-5 pt-5 pb-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg">Ordre des rayons</h3>
              <button type="button" onClick={onClose} className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-muted" aria-label="Fermer">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">Range les rayons dans l&apos;ordre où tu passes dans ton magasin. C&apos;est enregistré pour tout le foyer.</p>
            <ol className="rounded-2xl bg-background divide-y">
              {list.map((k, i) => (
                <li key={k} className="flex items-center gap-2 pl-4 pr-1 py-1">
                  <span className="w-5 text-xs font-bold text-muted-foreground tabular-nums">{i + 1}</span>
                  <span className="flex-1 text-sm font-bold">{aisleLabel(k)}</span>
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Monter ${aisleLabel(k)}`}
                    className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-muted disabled:opacity-30">
                    <ChevronUp className="h-5 w-5" />
                  </button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === list.length - 1} aria-label={`Descendre ${aisleLabel(k)}`}
                    className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-muted disabled:opacity-30">
                    <ChevronDown className="h-5 w-5" />
                  </button>
                </li>
              ))}
            </ol>
            <button type="button" onClick={() => setList([...DEFAULT_ORDER])} className="text-sm text-muted-foreground underline underline-offset-2">
              Revenir à l&apos;ordre par défaut
            </button>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <div className="flex gap-3 px-5 pb-6">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={pending}>Annuler</Button>
            <Button className="flex-1" onClick={save} disabled={pending}>{pending ? 'Enregistrement…' : 'Enregistrer'}</Button>
          </div>
        </div>
      </div>
    </Portal>
  )
}
