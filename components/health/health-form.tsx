'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SubmitButton } from '@/components/auth/submit-button'
import { saveHealthProfile } from '@/actions/health'
import { ACTIVITY_LABELS, GOAL_LABELS, LOSS_RATES, type ActivityLevel, type Goal } from '@/lib/targets'
import { DIET_LABELS, EXCLUSION_LABELS, type Diet, type Exclusion, type HealthProfile } from '@/lib/types'

interface Props {
  health: HealthProfile | null
  weightKg: number | null
  /** Page où revenir en cas d'erreur */
  back: string
  /** Page où aller après l'enregistrement */
  next: string
  submitLabel: string
}

function Choice({
  name, value, checked, onChange, title, hint, type = 'radio',
}: {
  name: string; value: string; checked: boolean; onChange: (v: string) => void
  title: string; hint?: string; type?: 'radio' | 'checkbox'
}) {
  return (
    <label
      className={`flex cursor-pointer flex-col rounded-xl border px-3 py-2.5 text-sm transition-colors ${
        checked ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-muted'
      }`}
    >
      <input type={type} name={name} value={value} checked={checked} onChange={() => onChange(value)} className="sr-only" />
      <span className="font-medium">{title}</span>
      {hint && <span className="text-xs text-muted-foreground mt-0.5">{hint}</span>}
    </label>
  )
}

export function HealthForm({ health, weightKg, back, next, submitLabel }: Props) {
  const [sex, setSex] = useState<string>(health?.sex ?? '')
  const [activity, setActivity] = useState<string>(health?.activity_level ?? '')
  const [sportMode, setSportMode] = useState<string>(health?.sport_mode ?? 'included')
  const [goal, setGoal] = useState<Goal>(health?.goal ?? 'maintain')
  const [rate, setRate] = useState<string>(String(health?.goal_rate_kg_week ?? 0.5))
  const [diet, setDiet] = useState<Diet>(health?.diet ?? 'omnivore')
  const [exclusions, setExclusions] = useState<Exclusion[]>(health?.exclusions ?? [])

  const toggleExclusion = (e: string) =>
    setExclusions((xs) => (xs.includes(e as Exclusion) ? xs.filter((x) => x !== e) : [...xs, e as Exclusion]))

  return (
    <form action={saveHealthProfile} className="space-y-8">
      <input type="hidden" name="back" value={back} />
      <input type="hidden" name="next" value={next} />

      <section className="space-y-4">
        <h2 className="font-semibold">Toi</h2>
        <div className="space-y-2">
          <Label>Sexe</Label>
          <p className="text-xs text-muted-foreground -mt-1">Utilisé uniquement par l&apos;équation qui estime ton métabolisme.</p>
          <div className="grid grid-cols-2 gap-2">
            <Choice name="sex" value="female" checked={sex === 'female'} onChange={setSex} title="Femme" />
            <Choice name="sex" value="male" checked={sex === 'male'} onChange={setSex} title="Homme" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="space-y-2 col-span-2 sm:col-span-1">
            <Label htmlFor="birth_date">Date de naissance</Label>
            <Input id="birth_date" name="birth_date" type="date" required defaultValue={health?.birth_date ?? ''} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="height_cm">Taille (cm)</Label>
            <Input id="height_cm" name="height_cm" type="number" inputMode="numeric" min={120} max={230} required
              defaultValue={health?.height_cm ?? ''} placeholder="170" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="weight_kg">Poids (kg)</Label>
            <Input id="weight_kg" name="weight_kg" type="number" inputMode="decimal" step="0.1" min={35} max={250} required
              defaultValue={weightKg ?? ''} placeholder="65" />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Ton niveau d&apos;activité habituel</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <Choice name="sport_mode" value="included" checked={sportMode === 'included'} onChange={setSportMode}
            title="Mon sport est compris dedans" hint="Objectifs stables d'un jour à l'autre" />
          <Choice name="sport_mode" value="logged" checked={sportMode === 'logged'} onChange={setSportMode}
            title="Je note mes séances" hint="Chaque séance notée augmente l'objectif du jour" />
        </div>
        <p className="text-xs text-muted-foreground">
          {sportMode === 'logged'
            ? 'Choisis ton niveau SANS compter tes séances de sport : elles s\'ajoutent quand tu les notes (pas de double comptage).'
            : 'Ta vie de tous les jours, sport habituel compris.'}{' '}
          Ce sont les quatre niveaux de l&apos;EFSA (1,4 à 2,0).
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((a) => (
            <Choice key={a} name="activity_level" value={a} checked={activity === a} onChange={setActivity}
              title={ACTIVITY_LABELS[a].label} hint={ACTIVITY_LABELS[a].hint} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Ton objectif</h2>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(GOAL_LABELS) as Goal[]).map((g) => (
            <Choice key={g} name="goal" value={g} checked={goal === g} onChange={(v) => setGoal(v as Goal)} title={GOAL_LABELS[g]} />
          ))}
        </div>
        {goal === 'lose' && (
          <div className="space-y-2 rounded-xl bg-muted/50 p-3">
            <Label>Rythme visé</Label>
            <div className="grid grid-cols-3 gap-2">
              {LOSS_RATES.map((r) => (
                <Choice key={r} name="goal_rate_kg_week" value={String(r)} checked={rate === String(r)} onChange={setRate}
                  title={`${String(r).replace('.', ',')} kg/sem.`} />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Un rythme modéré (0,25 à 0,5 kg par semaine) est plus facile à tenir et préserve mieux la masse musculaire.
            </p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="target_weight_kg">Poids cible (kg, facultatif)</Label>
            <Input id="target_weight_kg" name="target_weight_kg" type="number" inputMode="decimal" step="0.1" min={35} max={250}
              defaultValue={health?.target_weight_kg ?? ''} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="weekly_sessions_goal">Séances de sport / semaine</Label>
            <Input id="weekly_sessions_goal" name="weekly_sessions_goal" type="number" inputMode="numeric" min={0} max={21}
              defaultValue={health?.weekly_sessions_goal ?? ''} placeholder="3" />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Ton alimentation</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(Object.keys(DIET_LABELS) as Diet[]).map((d) => (
            <Choice key={d} name="diet" value={d} checked={diet === d} onChange={(v) => setDiet(v as Diet)} title={DIET_LABELS[d]} />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(EXCLUSION_LABELS) as Exclusion[]).map((e) => (
            <Choice key={e} type="checkbox" name="exclusions" value={e} checked={exclusions.includes(e)} onChange={toggleExclusion}
              title={EXCLUSION_LABELS[e]} />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Sert à te proposer les recettes qui te correspondent.</p>
      </section>

      <SubmitButton disabled={!sex || !activity}>{submitLabel}</SubmitButton>
    </form>
  )
}
