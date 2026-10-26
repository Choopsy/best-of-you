import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getSession } from '@/lib/auth'
import { getPickableRecipes } from '@/lib/journal'
import { formatDateFr, isISODate, shiftDate, todayISO, weekStart } from '@/lib/dates'
import { MEALS, MEAL_LABELS, type Meal } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/page-header'
import { KitchenTabs } from '@/components/kitchen/kitchen-tabs'
import { PlanSheet } from '@/components/kitchen/plan-sheet'
import { PlanEntry } from '@/components/kitchen/plan-entry'
import { GenerateButton } from '@/components/kitchen/generate-button'

interface Props {
  searchParams: Promise<{ week?: string }>
}

const shortRange = (a: string, b: string) => {
  const f = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' })
  return `${f.format(new Date(a + 'T12:00:00Z'))} – ${f.format(new Date(b + 'T12:00:00Z'))}`
}

export default async function WeekPage({ searchParams }: Props) {
  const { week } = await searchParams
  const { supabase, user } = await getSession()
  if (!user) redirect('/login')

  const today = todayISO()
  const start = weekStart(isISODate(week) ? week : today)
  const end = shiftDate(start, 6)
  const days = Array.from({ length: 7 }, (_, i) => shiftDate(start, i))

  const [{ data: plan }, recipes] = await Promise.all([
    supabase.from('meal_plan')
      .select('id, planned_on, meal, servings, recipe_id, recipes ( title )')
      .gte('planned_on', start).lte('planned_on', end)
      .order('created_at'),
    getPickableRecipes(supabase, user.id),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entries = (plan ?? []) as any[]
  const mealOrder = (m: Meal) => MEALS.indexOf(m)
  const total = entries.length

  return (
    <div className="min-h-svh pb-24">
      <PageHeader title="Cuisine" />
      <main className="px-4 py-4 max-w-xl mx-auto space-y-4">
        <KitchenTabs active="/semaine" />

        <div className="flex items-center justify-between">
          <Link href={`/semaine?week=${shiftDate(start, -7)}`}>
            <Button variant="ghost" size="icon" aria-label="Semaine précédente"><ChevronLeft className="h-4 w-4" /></Button>
          </Link>
          <div className="text-center">
            <p className="font-heading text-lg">{start === weekStart(today) ? 'Cette semaine' : shortRange(start, end)}</p>
            <p className="text-xs text-muted-foreground">{total} recette{total > 1 ? 's' : ''} prévue{total > 1 ? 's' : ''}</p>
          </div>
          <Link href={`/semaine?week=${shiftDate(start, 7)}`}>
            <Button variant="ghost" size="icon" aria-label="Semaine suivante"><ChevronRight className="h-4 w-4" /></Button>
          </Link>
        </div>

        {days.map((d) => {
          const list = entries.filter((e) => e.planned_on === d).sort((a, b) => mealOrder(a.meal) - mealOrder(b.meal))
          const isToday = d === today
          return (
            <section key={d} className={`rounded-3xl bg-card px-4 py-3 shadow-[0_1px_0_var(--border)] ${d < today ? 'opacity-70' : ''}`}>
              <div className="flex items-center justify-between">
                <h2 className={`text-base first-letter:uppercase ${isToday ? 'text-primary' : ''}`}>
                  {isToday ? `Aujourd'hui · ${formatDateFr(d).split(' ').slice(1).join(' ')}` : formatDateFr(d)}
                </h2>
                <PlanSheet date={d} recipes={recipes} label={`Prévoir une recette le ${formatDateFr(d)}`} />
              </div>
              {list.length > 0 ? (
                <ul className="divide-y">
                  {list.map((e) => (
                    <PlanEntry key={e.id} id={e.id} recipeId={e.recipe_id} title={e.recipes?.title ?? 'Recette'}
                      meal={MEAL_LABELS[e.meal as Meal]} servings={Number(e.servings)} />
                  ))}
                </ul>
              ) : (
                <p className="pb-1 text-xs text-muted-foreground">Rien de prévu.</p>
              )}
            </section>
          )
        })}

        {total > 0 && end >= today && (
          <GenerateButton from={start < today ? today : start} to={end} />
        )}
        {recipes.length === 0 && (
          <p className="text-sm text-muted-foreground text-center">
            Pour prévoir tes repas, <Link href="/recipes/new" className="underline">ajoute d&apos;abord une recette</Link> ou mets-en en favori.
          </p>
        )}
      </main>
    </div>
  )
}
