'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { FileJson, Upload } from 'lucide-react'
import { importMealFile } from '@/actions/journal'
import { MAX_IMPORT_BYTES, MEAL_IMPORT_EXAMPLE, parseMealImport, type MealImport } from '@/lib/meal-import'
import { MEALS, MEAL_LABELS, mealForHour, type Meal } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const f = (v: number) => Math.round(v).toLocaleString('fr-FR')

/** Importer un repas depuis un fichier JSON : aperçu, puis date et repas avant l'ajout. */
export function MealImportForm({ today }: { today: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [text, setText] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [parsed, setParsed] = useState<MealImport | null>(null)
  const [date, setDate] = useState(today)
  const [meal, setMeal] = useState<Meal>(() => mealForHour(new Date().getHours()))
  const [error, setError] = useState<string | null>(null)

  const onFile = async (file: File | undefined) => {
    setError(null); setParsed(null)
    if (!file) return
    if (file.size > MAX_IMPORT_BYTES) { setError('Fichier trop gros (50 Ko maximum).'); return }
    const content = await file.text()
    const result = parseMealImport(content)
    setFileName(file.name); setText(content); setParsed(result)
    // Le fichier peut préciser la date et le repas : on les reprend, modifiables
    if (result.ok) {
      if (result.date && result.date <= today) setDate(result.date)
      if (result.meal) setMeal(result.meal)
    }
  }

  const submit = () => start(async () => {
    setError(null)
    const res = await importMealFile({ text, date, meal })
    if (res.error) { setError(res.error); return }
    router.push(date === today ? '/journal' : `/journal?date=${date}`)
  })

  const items = parsed?.ok ? parsed.items : []
  const total = items.reduce((a, i) => a + i.nutrients.energy_kcal, 0)

  return (
    <div className="space-y-4">
      <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-input bg-card px-4 py-6 text-center">
        <Upload className="h-6 w-6 text-primary" aria-hidden="true" />
        <span className="font-semibold">{fileName ?? 'Choisir un fichier JSON'}</span>
        <span className="text-xs text-muted-foreground">Un repas, un ou plusieurs plats</span>
        <input type="file" accept=".json,application/json" className="sr-only" aria-label="Fichier du repas"
          onChange={(e) => onFile(e.target.files?.[0])} />
      </label>

      {parsed && !parsed.ok && <p role="alert" className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{parsed.error}</p>}

      {parsed?.ok && (
        <>
          <section aria-label="Aperçu" className="rounded-3xl bg-card px-5 py-4 shadow-card space-y-3">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-lg">Aperçu</h2>
              <span className="rounded-full bg-accent px-3 py-0.5 text-sm font-bold text-accent-foreground tabular-nums">{f(total)} kcal</span>
            </div>
            <ul className="divide-y">
              {items.map((i, k) => (
                <li key={k} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold">{i.label}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {i.grams ? `${f(i.grams)} g · ` : ''}P {f(i.nutrients.proteins_g)} g · G {f(i.nutrients.carbs_g)} g · L {f(i.nutrients.fat_g)} g
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold tabular-nums">{f(i.nutrients.energy_kcal)} kcal</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-3xl bg-card px-5 py-4 shadow-card space-y-3">
            <label htmlFor="import-date" className="block text-sm font-semibold">Date</label>
            <Input id="import-date" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
            <p className="text-sm font-semibold">Repas</p>
            <div role="radiogroup" aria-label="Repas" className="grid grid-cols-2 gap-2">
              {MEALS.map((m) => (
                <button key={m} type="button" role="radio" aria-checked={meal === m} onClick={() => setMeal(m)}
                  className={`min-h-11 rounded-full px-3 text-sm font-semibold transition-colors ${meal === m ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
                  {MEAL_LABELS[m]}
                </button>
              ))}
            </div>
          </section>

          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button className="w-full" size="lg" disabled={pending} onClick={submit}>
            {pending ? 'Ajout…' : items.length > 1 ? `Ajouter les ${items.length} plats au journal` : 'Ajouter au journal'}
          </Button>
        </>
      )}
      {!parsed && error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      <details className="rounded-3xl bg-card shadow-card">
        <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-5 text-sm font-semibold">
          <FileJson className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> Format attendu
        </summary>
        <div className="space-y-2 px-5 pb-5 text-xs text-muted-foreground">
          <pre className="overflow-x-auto rounded-2xl bg-muted p-3 text-[11px] leading-relaxed text-foreground">{MEAL_IMPORT_EXAMPLE}</pre>
          <p>
            Valeurs pour la quantité mangée. Seuls « nom » et « kcal » sont obligatoires ; « date » (2026-11-02),
            « repas » (petit-dejeuner, dejeuner, diner, collation), « grammes » et « portions » sont facultatifs.
          </p>
        </div>
      </details>
    </div>
  )
}
