'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Search, CalendarPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Portal } from '@/components/ui/portal'
import { addToPlan } from '@/actions/plan'
import { MEALS, MEAL_LABELS, type Meal, type PickableRecipe } from '@/lib/types'

interface Props {
  date: string
  recipes: PickableRecipe[]
  /** Recette déjà choisie (bouton « Prévoir » d'une page recette) */
  recipe?: PickableRecipe
  defaultServings?: number
  trigger?: 'icon' | 'wide'
  label?: string
}

export function PlanSheet({ date, recipes, recipe, defaultServings = 2, trigger = 'icon', label }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [day, setDay] = useState(date)
  const [meal, setMeal] = useState<Meal>('dinner')
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<PickableRecipe | null>(recipe ?? null)
  const [servings, setServings] = useState(String(defaultServings))
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [pending, start] = useTransition()

  const close = () => { setOpen(false); setError(null); setDone(false); if (!recipe) { setPicked(null); setQuery('') } }

  const submit = () => start(async () => {
    if (!picked) { setError('Choisis une recette.'); return }
    const res = await addToPlan({ date: day, meal, recipeId: picked.id, servings: Number(servings.replace(',', '.')) })
    if (res.error) { setError(res.error); return }
    if (recipe) { setDone(true); return }
    close()
    router.refresh()
  })

  const filtered = recipes.filter((r) => r.title.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 40)

  return (
    <>
      {trigger === 'wide' ? (
        <Button variant="outline" className="w-full gap-2" onClick={() => setOpen(true)}>
          <CalendarPlus className="h-4 w-4" /> {label ?? 'Prévoir dans ma semaine'}
        </Button>
      ) : (
        <button type="button" onClick={() => setOpen(true)} aria-label={label ?? 'Prévoir une recette'}
          className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl text-primary hover:bg-muted">
          <Plus className="h-5 w-5" />
        </button>
      )}

      {open && (
        <Portal>
          <div className="fixed inset-0 z-50 flex items-end sm:items-start sm:pt-20 justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={close} />
            <div role="dialog" aria-modal="true" aria-label="Prévoir une recette"
              className="relative w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-3xl shadow-xl max-h-[90svh] overflow-y-auto">
              <div className="px-5 pt-5 pb-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg">Prévoir une recette</h3>
                  <button type="button" onClick={close} className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-muted" aria-label="Fermer">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {done ? (
                  <p className="rounded-2xl bg-sage/15 px-4 py-3 text-sm">
                    C&apos;est noté dans ta semaine. Tu pourras générer la liste de courses depuis l&apos;onglet Courses.
                  </p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="pd">Jour</Label>
                        <Input id="pd" type="date" value={day} onChange={(e) => setDay(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ps">Portions</Label>
                        <Input id="ps" type="number" inputMode="decimal" min={0.5} max={50} step="0.5" value={servings}
                          onChange={(e) => setServings(e.target.value)} />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {MEALS.map((m) => (
                        <button key={m} type="button" onClick={() => setMeal(m)} aria-pressed={meal === m}
                          className={`rounded-xl border px-1 py-2 text-[11px] font-bold transition-colors ${
                            meal === m ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'hover:bg-muted'}`}>
                          {MEAL_LABELS[m]}
                        </button>
                      ))}
                    </div>

                    {picked ? (
                      <div className="flex items-center gap-3 rounded-2xl bg-muted px-3 py-2.5">
                        <p className="flex-1 text-sm font-bold">{picked.title}</p>
                        {!recipe && <Button variant="ghost" size="sm" onClick={() => setPicked(null)}>Changer</Button>}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Chercher une recette" className="pl-9" />
                        </div>
                        <ul className="max-h-56 overflow-y-auto space-y-1">
                          {filtered.length === 0 && <li className="py-4 text-center text-sm text-muted-foreground">Aucune recette.</li>}
                          {filtered.map((r) => (
                            <li key={r.id}>
                              <button type="button" onClick={() => setPicked(r)} className="w-full rounded-xl px-3 py-2.5 text-left text-sm hover:bg-muted">
                                {r.title}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {error && <p className="text-sm text-destructive">{error}</p>}
                  </>
                )}
              </div>
              <div className="flex gap-3 px-5 pb-6">
                <Button variant="outline" className="flex-1" onClick={close} disabled={pending}>{done ? 'Fermer' : 'Annuler'}</Button>
                {!done && <Button className="flex-1" onClick={submit} disabled={pending || !picked}>{pending ? 'Ajout…' : 'Prévoir'}</Button>}
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  )
}
