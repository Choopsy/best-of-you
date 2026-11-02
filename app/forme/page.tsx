import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BicepsFlexed, CircleCheck, Dumbbell, Flame, Info, ChevronRight } from 'lucide-react'
import { getSession } from '@/lib/auth'
import { getHealthContext } from '@/lib/health'
import { formatShortFr, shiftDate, todayISO, weekStart } from '@/lib/dates'
import { weekSummary, WHO_STRENGTH_DAYS, WHO_WEEKLY_MINUTES } from '@/lib/activities'
import { weeklyRate, weightTrend } from '@/lib/weight'
import { PageHeader } from '@/components/layout/page-header'
import { Ring } from '@/components/journal/ring'
import { ActivitySheet } from '@/components/forme/activity-sheet'
import { WeightSheet } from '@/components/forme/weight-sheet'
import { WeightChart } from '@/components/forme/weight-chart'
import { DeleteButton } from '@/components/forme/delete-button'

interface Props {
  searchParams: Promise<{ add?: string; range?: string }>
}

const RANGES = [
  { key: '30', label: '1 mois', days: 30 },
  { key: '90', label: '3 mois', days: 90 },
  { key: '365', label: '1 an', days: 365 },
]
const f = (v: number, d = 0) => v.toLocaleString('fr-FR', { maximumFractionDigits: d })

function Stat({ Icon, value, label }: { Icon: typeof Flame; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl bg-muted px-1 py-3 text-center min-w-0">
      <Icon className="h-4 w-4 text-terracotta" aria-hidden="true" />
      <span className="font-heading text-lg font-semibold leading-none tabular-nums">{value}</span>
      <span className="text-[11px] text-muted-foreground leading-tight">{label}</span>
    </div>
  )
}

export default async function FormePage({ searchParams }: Props) {
  const { add, range: rawRange } = await searchParams
  const { supabase, user } = await getSession()
  if (!user) redirect('/login')

  const today = todayISO()
  const monday = weekStart(today)
  const range = RANGES.find((r) => r.key === rawRange) ?? RANGES[1]
  // 30 jours de plus pour que la tendance soit déjà « chauffée » au début de la période
  const since = shiftDate(today, -(range.days + 30))

  const [ctx, { data: acts }, { data: weights }] = await Promise.all([
    getHealthContext(supabase, user.id, today),
    supabase.from('activities').select('id, done_on, activity_key, label, duration_min, met, kcal_net')
      .eq('user_id', user.id).gte('done_on', shiftDate(today, -60))
      .order('done_on', { ascending: false }).order('created_at', { ascending: false }),
    supabase.from('weight_logs').select('id, logged_on, weight_kg')
      .eq('user_id', user.id).gte('logged_on', since).order('logged_on', { ascending: false }),
  ])

  const activities = (acts ?? []).map((a) => ({ ...a, met: Number(a.met), kcal_net: Number(a.kcal_net) }))
  const week = activities.filter((a) => a.done_on >= monday)
  const summary = weekSummary(week)
  const weekKcal = week.reduce((a, w) => a + w.kcal_net, 0)
  const minutesPct = Math.round((summary.moderateEquivalent / WHO_WEEKLY_MINUTES) * 100)
  const recentKeys = [...new Set(activities.map((a) => a.activity_key))].slice(0, 4)
  const sessionsGoal = ctx.health?.weekly_sessions_goal ?? null
  const logged = ctx.health?.sport_mode === 'logged'
  const todayExercise = ctx.targets?.exerciseKcal ?? 0

  const weighIns = (weights ?? []).map((w) => ({ ...w, weight_kg: Number(w.weight_kg) }))
  const allPoints = weightTrend(weighIns)
  const start = shiftDate(today, -range.days)
  const points = allPoints.filter((p) => p.date >= start)
  const rate = weeklyRate(allPoints)
  const trendNow = allPoints.at(-1)?.trend ?? ctx.weightKg
  const target = ctx.health?.target_weight_kg != null ? Number(ctx.health.target_weight_kg) : null
  const lastWeight = weighIns[0]?.weight_kg ?? ctx.weightKg

  return (
    <div className="min-h-svh pb-24">
      <PageHeader title="Forme">
        <WeightSheet today={today} last={lastWeight} defaultOpen={add === 'poids'} />
        <ActivitySheet today={today} bmr={ctx.targets?.bmr ?? null} recentKeys={recentKeys} defaultOpen={add === 'seance'} />
      </PageHeader>

      <main className="px-4 py-4 max-w-xl mx-auto space-y-6">
        {/* ── Semaine ── */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xl">Temps actif</h2>
            <Link href={`/bilan?semaine=${monday}`} className="flex min-h-10 items-center gap-1 text-sm font-bold text-primary">
              Bilan complet <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="rounded-3xl bg-card px-5 py-5 shadow-card space-y-4">
            <div className="flex items-center gap-5">
              <Ring value={summary.moderateEquivalent} max={WHO_WEEKLY_MINUTES} size={124} stroke={12}
                color={summary.moderateEquivalent >= WHO_WEEKLY_MINUTES ? 'var(--sage)' : 'var(--terracotta)'}
                label={`Minutes actives : ${f(summary.moderateEquivalent)} sur ${WHO_WEEKLY_MINUTES}`}>
                <span className="font-heading text-3xl font-bold leading-none tabular-nums">{f(summary.moderateEquivalent)}</span>
                <span className="text-xs text-muted-foreground">/ {WHO_WEEKLY_MINUTES} min</span>
              </Ring>
              <div className="min-w-0 space-y-2">
                <span className="inline-flex rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground tabular-nums">
                  {minutesPct} % du repère OMS
                </span>
                <p className="text-sm leading-snug text-muted-foreground">Minutes d&apos;activité modérée cette semaine.</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Stat Icon={CircleCheck} value={`${summary.sessions} / ${sessionsGoal ?? 3}`} label={sessionsGoal ? 'Séances' : 'Séances (à choisir)'} />
              <Stat Icon={BicepsFlexed} value={`${summary.strengthDays} / ${WHO_STRENGTH_DAYS}`} label="Jours de renfo" />
              <Stat Icon={Flame} value={`≈ ${f(weekKcal)}`} label="kcal dépensées" />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              L&apos;OMS conseille au moins 150 minutes d&apos;activité modérée par semaine (une minute soutenue,
              comme la course, compte double) et du renforcement musculaire au moins 2 jours.
              {!sessionsGoal && <> <Link href="/profile/health" className="font-bold text-primary underline-offset-2 hover:underline">Choisir mon objectif de séances</Link></>}
            </p>
          </div>

          <div className="flex gap-2.5 rounded-2xl bg-muted/60 px-4 py-3 text-xs leading-relaxed">
            <Info className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
            {logged ? (
              <p>
                Tes séances s&apos;ajoutent à ton objectif calories du jour.
                {todayExercise > 0 && <> Aujourd&apos;hui : <span className="font-bold">+{f(todayExercise)} kcal</span>.</>}{' '}
                <Link href="/profile/health" className="underline underline-offset-2">Changer</Link>
              </p>
            ) : (
              <p>
                Ton niveau d&apos;activité du profil compte déjà ton sport : les séances notées ici ne changent pas
                ton objectif calories. Tu préfères l&apos;ajuster séance par séance ?{' '}
                <Link href="/profile/health" className="font-bold underline underline-offset-2">Choisir « Je note mes séances »</Link>
              </p>
            )}
          </div>
        </section>

        {/* ── Séances ── */}
        <section className="space-y-2">
          <h2 className="text-xl">Mes séances</h2>
          {activities.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-3xl bg-card px-6 py-8 text-center shadow-card">
              <Dumbbell className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground max-w-xs">
                Marche, vélo, muscu… Note tes séances pour suivre ta semaine.
              </p>
              <div className="w-full max-w-xs">
                <ActivitySheet today={today} bmr={ctx.targets?.bmr ?? null} recentKeys={[]} trigger="wide" />
              </div>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {activities.slice(0, 15).map((a) => (
                <li key={a.id} className="flex items-center gap-3 rounded-3xl bg-card pl-4 pr-2 py-3 shadow-card">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sage/15">
                    <Dumbbell className="h-5 w-5 text-sage" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-heading text-base font-semibold">{a.label}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {a.done_on === today ? "Aujourd'hui" : formatShortFr(a.done_on)} · {a.duration_min} min · ≈ {f(a.kcal_net)} kcal
                    </p>
                  </div>
                  <DeleteButton id={a.id} kind="activity" label={a.label} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Poids ── */}
        <section className="space-y-2">
          <h2 className="text-xl">Tendance de poids</h2>
          <div className="rounded-3xl bg-card px-5 py-5 shadow-card space-y-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="font-heading text-3xl font-bold tabular-nums">{trendNow != null ? f(trendNow, 1) : '—'}</p>
                <p className="text-[11px] text-muted-foreground">kg · tendance</p>
              </div>
              <div>
                <p className="font-heading text-2xl tabular-nums">{rate != null ? `${rate > 0 ? '+' : rate < 0 ? '−' : ''}${f(Math.abs(rate), 1)}` : '—'}</p>
                <p className="text-[11px] text-muted-foreground">kg / semaine</p>
              </div>
              <div>
                <p className="font-heading text-2xl tabular-nums">{target != null ? f(target, 1) : '—'}</p>
                <p className="text-[11px] text-muted-foreground">
                  {target != null ? 'kg · objectif' : <Link href="/profile/health" className="underline">fixer un objectif</Link>}
                </p>
              </div>
            </div>

            <nav aria-label="Période" className="grid grid-cols-3 gap-1 rounded-full bg-secondary p-1">
              {RANGES.map((r) => (
                <Link key={r.key} href={`/forme?range=${r.key}`} scroll={false} aria-current={r.key === range.key ? 'page' : undefined}
                  className={`flex min-h-10 items-center justify-center rounded-full text-sm font-semibold ${r.key === range.key ? 'bg-card text-primary shadow-card' : 'text-muted-foreground'}`}>
                  {r.label}
                </Link>
              ))}
            </nav>

            {points.length >= 2 ? (
              <WeightChart points={points} target={target} />
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Encore quelques pesées et ta courbe apparaîtra ici.
              </p>
            )}
            <p className="text-xs text-muted-foreground leading-relaxed">
              Le trait suit une moyenne lissée : les variations d&apos;un jour à l&apos;autre (eau, sel, digestion) comptent peu,
              c&apos;est la direction sur plusieurs semaines qui compte.
            </p>
          </div>

          {weighIns.length > 0 && (
            <details className="rounded-3xl bg-card shadow-card group">
              <summary className="cursor-pointer list-none px-4 py-3 text-sm font-bold flex items-center justify-between min-h-12">
                Mes pesées <span className="text-muted-foreground font-normal">{weighIns.length}</span>
              </summary>
              <ul className="divide-y border-t">
                {weighIns.slice(0, 30).map((w) => (
                  <li key={w.id} className="flex items-center gap-3 pl-4 pr-2 py-1.5">
                    <span className="flex-1 text-sm">{formatShortFr(w.logged_on)}</span>
                    <span className="text-sm font-bold tabular-nums">{f(w.weight_kg, 1)} kg</span>
                    <DeleteButton id={w.id} kind="weight" label={`la pesée du ${formatShortFr(w.logged_on)}`} />
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>
      </main>
    </div>
  )
}
