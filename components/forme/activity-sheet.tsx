'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'
import { Portal } from '@/components/ui/portal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { addActivity } from '@/actions/activities'
import { ACTIVITIES, INTENSITY_LABELS, activityByKey, intensityOf, netKcal } from '@/lib/activities'
import { shiftDate } from '@/lib/dates'

const GROUPS: { title: string; keys: string[] }[] = [
  { title: 'Marche et course', keys: ['walk_leisure', 'walk_brisk', 'hike', 'run_8', 'run_10', 'run_12'] },
  { title: 'Vélo et cardio', keys: ['bike_leisure', 'bike_moderate', 'elliptical', 'rowing', 'hiit', 'hiit_vigorous'] },
  { title: 'Renforcement et douceur', keys: ['strength', 'strength_vigorous', 'yoga', 'pilates'] },
  { title: 'Sports et loisirs', keys: ['football', 'basketball', 'tennis', 'badminton', 'dance', 'climbing'] },
]
const DURATIONS = [15, 30, 45, 60, 90]

interface Props {
  today: string
  /** Métabolisme de base (kcal/j) pour l'estimation ; null si profil incomplet */
  bmr: number | null
  /** Activités notées récemment, pour les retrouver en tête */
  recentKeys: string[]
  defaultOpen?: boolean
  trigger?: 'button' | 'wide'
}

export function ActivitySheet({ today, bmr, recentKeys, defaultOpen = false, trigger = 'button' }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(defaultOpen)
  const [key, setKey] = useState<string | null>(recentKeys[0] ?? null)
  const [minutes, setMinutes] = useState('30')
  const [date, setDate] = useState(today)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const type = key ? activityByKey(key) : undefined
  const min = Number(minutes)
  const kcal = type && bmr && min > 0 ? netKcal(type.met, min, bmr) : null

  const close = () => { setOpen(false); setError(null); setDate(today) }
  const submit = () => start(async () => {
    if (!key) { setError('Choisis une activité.'); return }
    const res = await addActivity({ date, key, durationMin: min })
    if (res.error) { setError(res.error); return }
    close()
    router.refresh()
  })

  const Chip = ({ k }: { k: string }) => {
    const a = activityByKey(k)!
    const on = key === k
    return (
      <button type="button" onClick={() => setKey(k)} aria-pressed={on}
        className={`min-h-10 rounded-full border px-3 py-1.5 text-sm font-bold transition-colors ${
          on ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}>
        {a.label}
      </button>
    )
  }

  return (
    <>
      {trigger === 'wide' ? (
        <Button className="w-full h-12 rounded-2xl gap-2" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Noter une séance
        </Button>
      ) : (
        <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Séance
        </Button>
      )}

      {open && (
        <Portal>
          <div className="fixed inset-0 z-50 flex items-end sm:items-start sm:pt-16 justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={close} />
            <div role="dialog" aria-modal="true" aria-label="Noter une séance"
              className="relative w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-3xl shadow-xl max-h-[92svh] overflow-y-auto">
              <div className="px-5 pt-5 pb-4 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg">Noter une séance</h3>
                  <button type="button" onClick={close} className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-muted" aria-label="Fermer">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  {recentKeys.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-bold text-muted-foreground">Tes activités récentes</p>
                      <div className="flex flex-wrap gap-1.5">{recentKeys.map((k) => <Chip key={k} k={k} />)}</div>
                    </div>
                  )}
                  {GROUPS.map((g) => (
                    <div key={g.title} className="space-y-1.5">
                      <p className="text-xs font-bold text-muted-foreground">{g.title}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {g.keys.filter((k) => !recentKeys.includes(k) && ACTIVITIES.some((a) => a.key === k)).map((k) => <Chip key={k} k={k} />)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="act-min">Durée (minutes)</Label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {DURATIONS.map((d) => (
                      <button key={d} type="button" onClick={() => setMinutes(String(d))} aria-pressed={minutes === String(d)}
                        className={`min-h-10 min-w-12 rounded-xl border px-2 text-sm font-bold ${
                          minutes === String(d) ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'hover:bg-muted'}`}>
                        {d}
                      </button>
                    ))}
                    <Input id="act-min" type="number" inputMode="numeric" min={1} max={600} value={minutes}
                      onChange={(e) => setMinutes(e.target.value)} className="w-20" aria-label="Autre durée en minutes" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="act-date">Quand ?</Label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[{ l: "Aujourd'hui", d: today }, { l: 'Hier', d: shiftDate(today, -1) }].map(({ l, d }) => (
                      <button key={l} type="button" onClick={() => setDate(d)} aria-pressed={date === d}
                        className={`min-h-10 rounded-xl border px-3 text-sm font-bold ${date === d ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'hover:bg-muted'}`}>
                        {l}
                      </button>
                    ))}
                    <Input id="act-date" type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} className="w-auto" />
                  </div>
                </div>

                {type && (
                  <div className="rounded-2xl bg-background px-4 py-3 text-sm">
                    <p>
                      <span className="font-bold">Intensité {INTENSITY_LABELS[intensityOf(type.met)].toLowerCase()}</span>
                      {kcal != null && <> · environ <span className="font-bold tabular-nums">{kcal} kcal</span> en plus du repos</>}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Estimation à partir du Compendium des activités physiques ({type.met} MET) et de ton métabolisme de base.
                      Les montres et applis surestiment souvent ce chiffre.
                    </p>
                  </div>
                )}

                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
              <div className="flex gap-3 px-5 pb-6">
                <Button variant="outline" className="flex-1" onClick={close} disabled={pending}>Annuler</Button>
                <Button className="flex-1" onClick={submit} disabled={pending || !key}>{pending ? 'Ajout…' : 'Enregistrer'}</Button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  )
}
