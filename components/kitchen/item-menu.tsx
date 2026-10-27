'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Trash2, X } from 'lucide-react'
import { Portal } from '@/components/ui/portal'
import { setItemAisle } from '@/actions/shopping'
import { AISLES, aisleFor, guessAisle } from '@/lib/aisles'
import { normalizeName } from '@/lib/shopping'
import type { ListItem } from '@/lib/offline-list'

/** Options d'un article : changer de rayon (mémorisé pour le foyer) ou le supprimer. */
export function ItemMenu({ item, overrides, online, onDelete, onClose }: {
  item: ListItem; overrides: Record<string, string>; online: boolean; onDelete: () => void; onClose: () => void
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const current = aisleFor(item.name, overrides)
  const isOverride = !!overrides[normalizeName(item.name)]
  const guessed = guessAisle(item.name)

  const choose = (aisle: string) => start(async () => {
    setError(null)
    // Choisir le rayon deviné revient à supprimer la correction
    const res = await setItemAisle(item.name, aisle === guessed ? 'auto' : aisle)
    if (res.error) { setError(res.error); return }
    router.refresh()
    onClose()
  })

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-end sm:items-start sm:pt-20 justify-center">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div role="dialog" aria-modal="true" aria-label={`Options pour ${item.name}`}
          className="relative w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-3xl shadow-xl max-h-[90svh] overflow-y-auto">
          <div className="px-5 pt-5 pb-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg leading-snug">{item.name}</h3>
              <button type="button" onClick={onClose} className="h-10 w-10 shrink-0 flex items-center justify-center rounded-full hover:bg-muted" aria-label="Fermer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-bold">Rayon</p>
              {!online && <p className="text-xs text-muted-foreground">Changer de rayon demande une connexion.</p>}
              <div className="grid grid-cols-2 gap-1.5">
                {AISLES.map((a) => {
                  const on = a.key === current
                  return (
                    <button key={a.key} type="button" disabled={pending || !online} aria-pressed={on} onClick={() => choose(a.key)}
                      className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 text-left text-sm font-bold disabled:opacity-50 ${
                        on ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'hover:bg-muted'}`}>
                      <span className="flex-1">{a.label}</span>
                      {on && <Check className="h-4 w-4 text-primary" />}
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                {isOverride ? 'Rayon choisi par ton foyer, retenu pour les prochaines fois.' : 'Rayon deviné automatiquement. Ton choix sera retenu pour tout le foyer.'}
              </p>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <button type="button" onClick={onDelete}
              className="flex w-full min-h-11 items-center justify-center gap-2 rounded-xl border border-destructive/30 text-sm font-bold text-destructive hover:bg-destructive/5">
              <Trash2 className="h-4 w-4" /> Supprimer de la liste
            </button>
          </div>
        </div>
      </div>
    </Portal>
  )
}
