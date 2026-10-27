import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronLeft, ChevronRight, Lightbulb } from 'lucide-react'
import { getSession } from '@/lib/auth'
import { getHealthContext } from '@/lib/health'
import { isISODate, shiftDate, todayISO, weekStart } from '@/lib/dates'
import { getWeekData } from '@/lib/weekly-data'
import { delta } from '@/lib/weekly'
import { WHO_STRENGTH_DAYS, WHO_WEEKLY_MINUTES } from '@/lib/activities'
import { PageHeader } from '@/components/layout/page-header'
import { WeekRings } from '@/components/journal/week-rings'

interface Props {
  searchParams: Promise<{ semaine?: string }>
}

const f = (v: number | null, d = 0) => (v == null ? '—' : v.toLocaleString('fr-FR', { maximumFractionDigits: d, minimumFractionDigits: d }))
const range = (start: string) => {
  const fmt = (iso: string, month: boolean) => new Intl.DateTimeFormat('fr-FR', { day: 'numeric', ...(month ? { month: 'short' } : {}), timeZone: 'UTC' })
    .format(new Date(iso + 'T12:00:00Z'))
  const end = shiftDate(start, 6)
  return `${fmt(start, start.slice(5, 7) !== end.slice(5, 7))} – ${fmt(end, true)}`
}

/** Écart avec la semaine d'avant, en couleur neutre : une hausse n'est ni bien ni mal en soi. */
function Delta({ value, unit = '', digits = 0 }: { value: number | null; unit?: string; digits?: number }) {
  if (value == null) return null
  const txt = value === 0 ? 'stable' : `${value > 0 ? '↑ +' : '↓ −'}${f(Math.abs(value), digits)}${unit}`
  return <span className="text-xs text-muted-foreground tabular-nums">{txt}</span>
}

function Stat({ label, value, sub, children }: { label: string; value: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-card px-3.5 py-3 flex flex-col gap-0.5 min-w-0 shadow-[0_1px_0_var(--border)]">
      <span className="text-xs font-bold text-muted-foreground">{label}</span>
      <span className="font-heading text-[22px] leading-tight tabular-nums">{value}</span>
      {sub && <span className="text-xs text-muted-foreground tabular-nums">{sub}</span>}
      {children}
    </div>
  )
}

export default async function WeeklyReviewPage({ searchParams }: Props) {
  const { semaine } = await searchParams
  const { supabase, user } = await getSession()
  if (!user) redirect('/login')

  const today = todayISO()
  const thisMonday = weekStart(today)
  // Par défaut : la dernière semaine complète
  const monday = isISODate(semaine) ? weekStart(semaine) : shiftDate(thisMonday, -7)
  if (monday > thisMonday) redirect('/bilan')
  const current = monday === thisMonday

  const ctx = await getHealthContext(supabase, user.id, today)
  const { review: r, prev: p, days, tip, baseTarget } = await getWeekData(supabase, user.id, monday, today, ctx)
  const t = ctx.targets
  const regular = r.loggedDays > p.loggedDays && p.loggedDays > 0

  return (
    <div className="min-h-svh pb-24">
      <PageHeader title="Bilan de la semaine" back="/" />
      <main className="px-4 py-4 max-w-xl mx-auto space-y-5">
        <nav aria-label="Semaine" className="flex items-center justify-between">
          <Link href={`/bilan?semaine=${shiftDate(monday, -7)}`} aria-label="Semaine précédente"
            className="h-11 w-11 flex items-center justify-center rounded-full hover:bg-muted">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div className="text-center">
            <p className="font-bold">{range(monday)}</p>
            <p className="text-xs text-muted-foreground">{current ? 'Semaine en cours' : monday === shiftDate(thisMonday, -7) ? 'Semaine dernière' : ' '}</p>
          </div>
          {current ? <span className="h-11 w-11" /> : (
            <Link href={`/bilan?semaine=${shiftDate(monday, 7)}`} aria-label="Semaine suivante"
              className="h-11 w-11 flex items-center justify-center rounded-full hover:bg-muted">
              <ChevronRight className="h-5 w-5" />
            </Link>
          )}
        </nav>

        <section className="rounded-3xl bg-card px-4 py-5 shadow-[0_1px_0_var(--border)] space-y-4">
          <div className="px-1">
            <p className="font-heading text-[26px] leading-tight">
              {r.loggedDays} jour{r.loggedDays > 1 ? 's' : ''} noté{r.loggedDays > 1 ? 's' : ''} sur {r.elapsedDays}
            </p>
            <p className="text-sm text-muted-foreground">
              {regular ? `Plus régulier que la semaine d'avant (${p.loggedDays} jours).`
                : r.loggedDays >= 6 ? 'Très belle régularité.'
                : r.loggedDays === 0 ? 'Rien de noté cette semaine.'
                : 'Les moyennes ne comptent que les jours notés.'}
            </p>
          </div>
          <WeekRings days={days.map((d) => ({ date: d.date, kcal: d.kcal }))} target={baseTarget} today={today} />
        </section>

        <section className="space-y-2">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg">Alimentation</h2>
            <span className="text-xs text-muted-foreground">↑ ↓ écart avec la semaine d&apos;avant</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Calories / jour" value={f(r.avgKcal)} sub={r.avgKcalTarget ? `objectif ${f(r.avgKcalTarget)} kcal` : 'kcal'}>
              <Delta value={delta(r.avgKcal, p.avgKcal)} unit=" kcal" />
            </Stat>
            <Stat label="Proches de l'objectif" value={`${r.daysOnTarget} / ${r.loggedDays}`} sub="jours à ±10 %">
              <Delta value={p.loggedDays ? r.daysOnTarget - p.daysOnTarget : null} unit=" j" />
            </Stat>
            <Stat label="Protéines / jour" value={`${f(r.avgProtein)} g`} sub={t ? `repère ${f(t.proteinsG)} g` : undefined}>
              <Delta value={delta(r.avgProtein, p.avgProtein)} unit=" g" />
            </Stat>
            <Stat label="Fibres / jour" value={`${f(r.avgFiber)} g`} sub={`repère ${t?.fiberMinG ?? 30} g`}>
              <Delta value={delta(r.avgFiber, p.avgFiber)} unit=" g" />
            </Stat>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg">Sport</h2>
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Séances" value={`${r.sessions}`} sub={r.sessionsGoal ? `objectif ${r.sessionsGoal}` : undefined}>
              <Delta value={r.sessions - p.sessions} />
            </Stat>
            <Stat label="Min. actives" value={`${r.activeMinutes}`} sub={`repère ${WHO_WEEKLY_MINUTES}`}>
              <Delta value={r.activeMinutes - p.activeMinutes} />
            </Stat>
            <Stat label="Renfo" value={`${r.strengthDays} j`} sub={`repère ${WHO_STRENGTH_DAYS} j`} />
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg">Poids</h2>
          <div className="rounded-2xl bg-card px-4 py-3 shadow-[0_1px_0_var(--border)] text-sm">
            {r.weightChange == null
              ? <span className="text-muted-foreground">Pas assez de pesées cette semaine pour suivre la tendance.</span>
              : <>Tendance <span className="font-bold tabular-nums">{r.weightChange === 0 ? 'stable' : `${r.weightChange > 0 ? '+' : '−'}${f(Math.abs(r.weightChange), 1)} kg`}</span> sur la semaine
                {ctx.health?.target_weight_kg ? <span className="text-muted-foreground"> · objectif {f(Number(ctx.health.target_weight_kg), 1)} kg</span> : null}</>}
          </div>
        </section>

        <section className="rounded-3xl bg-honey/15 px-5 py-4 space-y-1.5">
          <h2 className="flex items-center gap-2 text-base"><Lightbulb className="h-4 w-4 text-honey" /> {current ? 'Pour la suite de la semaine' : 'Pour la semaine qui vient'} : {tip.title.toLowerCase()}</h2>
          <p className="text-sm leading-relaxed">{tip.text}</p>
        </section>

        <p className="text-xs text-muted-foreground leading-relaxed">
          Moyennes calculées sur les jours notés. Repères : protéines et calories selon ton profil (EFSA, ANSES),
          fibres 30 g par jour (ANSES), activité 150 minutes et 2 jours de renforcement par semaine (OMS).
        </p>
      </main>
    </div>
  )
}
