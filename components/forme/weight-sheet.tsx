'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Scale, X } from 'lucide-react'
import { Portal } from '@/components/ui/portal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { addWeight } from '@/actions/activities'

export function WeightSheet({ today, last, defaultOpen = false }: { today: string; last: number | null; defaultOpen?: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(defaultOpen)
  const [kg, setKg] = useState(last != null ? String(last).replace('.', ',') : '')
  const [date, setDate] = useState(today)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const close = () => { setOpen(false); setError(null) }
  const submit = () => start(async () => {
    const res = await addWeight({ date, kg: Number(kg.replace(',', '.')) })
    if (res.error) { setError(res.error); return }
    close()
    router.refresh()
  })

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <Scale className="h-4 w-4" /> Pesée
      </Button>
      {open && (
        <Portal>
          <div className="fixed inset-0 z-50 flex items-end sm:items-start sm:pt-20 justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={close} />
            <div role="dialog" aria-modal="true" aria-label="Noter mon poids"
              className="relative w-full sm:max-w-sm bg-card rounded-t-3xl sm:rounded-3xl shadow-xl">
              <form className="px-5 pt-5 pb-6 space-y-4" onSubmit={(e) => { e.preventDefault(); submit() }}>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg">Noter mon poids</h3>
                  <button type="button" onClick={close} className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-muted" aria-label="Fermer">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex gap-3">
                  <div className="space-y-2 flex-1">
                    <Label htmlFor="w-kg">Poids (kg)</Label>
                    <Input id="w-kg" inputMode="decimal" autoFocus value={kg} onChange={(e) => setKg(e.target.value)} className="text-lg font-bold tabular-nums" />
                  </div>
                  <div className="space-y-2 flex-1">
                    <Label htmlFor="w-date">Jour</Label>
                    <Input id="w-date" type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Astuce : pèse-toi le matin, au réveil, dans les mêmes conditions. Le poids varie d&apos;un jour à l&apos;autre
                  (eau, sel, digestion) : c&apos;est la tendance qui compte.
                </p>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <div className="flex gap-3">
                  <Button type="button" variant="outline" className="flex-1" onClick={close} disabled={pending}>Annuler</Button>
                  <Button type="submit" className="flex-1" disabled={pending}>{pending ? 'Ajout…' : 'Enregistrer'}</Button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}
    </>
  )
}
