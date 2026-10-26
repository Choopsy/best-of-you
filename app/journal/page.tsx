import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getHealthContext } from '@/lib/health'
import { getDayLogs, getPickableRecipes } from '@/lib/journal'
import { formatDateFr, isISODate, shiftDate, todayISO } from '@/lib/dates'
import { MEALS, MEAL_LABELS } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/page-header'
import { DaySummary } from '@/components/journal/day-summary'
import { EntryRow } from '@/components/journal/entry-row'
import { AddEntry } from '@/components/journal/add-entry'

interface Props {
  searchParams: Promise<{ date?: string; add?: string }>
}

export default async function JournalPage({ searchParams }: Props) {
  const { date: rawDate, add } = await searchParams
  const today = todayISO()
  const date = isISODate(rawDate) ? rawDate : today

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [ctx, { logs, totals }, recipes] = await Promise.all([
    getHealthContext(supabase, user.id),
    getDayLogs(supabase, user.id, date),
    getPickableRecipes(supabase, user.id),
  ])

  const isToday = date === today
  const kcal = (m: string) => Math.round(logs.filter((l) => l.meal === m).reduce((a, l) => a + Number(l.energy_kcal), 0))

  return (
    <div className="min-h-svh pb-24">
      <PageHeader title="Journal">
        <AddEntry date={date} recipes={recipes} defaultOpen={add === '1'} />
      </PageHeader>

      <main className="px-4 py-4 max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Link href={`/journal?date=${shiftDate(date, -1)}`}>
            <Button variant="ghost" size="icon" aria-label="Jour précédent"><ChevronLeft className="h-4 w-4" /></Button>
          </Link>
          <div className="text-center">
            <p className="font-semibold capitalize">{isToday ? "Aujourd'hui" : formatDateFr(date)}</p>
            {!isToday && (
              <Link href="/journal" className="text-xs text-muted-foreground underline underline-offset-2">Revenir à aujourd&apos;hui</Link>
            )}
          </div>
          <Link href={`/journal?date=${shiftDate(date, 1)}`} aria-disabled={isToday} className={isToday ? 'pointer-events-none opacity-30' : ''}>
            <Button variant="ghost" size="icon" aria-label="Jour suivant"><ChevronRight className="h-4 w-4" /></Button>
          </Link>
        </div>

        <DaySummary totals={totals} targets={ctx.targets} />

        {MEALS.map((meal) => {
          const entries = logs.filter((l) => l.meal === meal)
          return (
            <section key={meal} className="rounded-2xl border bg-card px-4 py-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-sm">
                  {MEAL_LABELS[meal]}
                  {entries.length > 0 && <span className="ml-2 font-normal text-muted-foreground tabular-nums">{kcal(meal).toLocaleString('fr-FR')} kcal</span>}
                </h2>
                <AddEntry date={date} meal={meal} recipes={recipes} trigger="icon" />
              </div>
              {entries.length > 0 ? (
                <ul className="divide-y">
                  {entries.map((e) => <EntryRow key={e.id} entry={e} />)}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground pb-1">Rien pour l&apos;instant.</p>
              )}
            </section>
          )
        })}

        <p className="text-xs text-muted-foreground px-1">
          Valeurs calculées à partir de la table de composition Ciqual (ANSES). Les quantités en cuillères ou en
          volume sont converties avec des moyennes, donc approximatives.
        </p>
      </main>
    </div>
  )
}
