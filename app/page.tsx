import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Activity, ArrowRight, CalendarCheck, ChefHat, ChevronRight, Leaf, Plus, Sparkles, User, UtensilsCrossed } from 'lucide-react'
import { APP_SIGNATURE } from '@/lib/brand'
import { weekSummary, WHO_WEEKLY_MINUTES } from '@/lib/activities'
import { getSession } from '@/lib/auth'
import { DaySummary } from '@/components/journal/day-summary'
import { WeekRings } from '@/components/journal/week-rings'
import { RecipeCard } from '@/components/recipes/recipe-card'
import { getHealthContext } from '@/lib/health'
import { getDayLogs, getWeekTotals } from '@/lib/journal'
import { getExpiringSoon } from '@/lib/household'
import { expiryInfo } from '@/components/kitchen/expiry'
import { formatDateFr, shiftDate, todayISO, weekStart } from '@/lib/dates'
import { getWeekData } from '@/lib/weekly-data'
import { RECIPE_SUMMARY_SELECT, toSummary } from '@/lib/recipes'
import { MEALS, MEAL_LABELS } from '@/lib/types'
import { WelcomeTour } from '@/components/onboarding/welcome-tour'

const MEAL_TINT: Record<string, string> = {
  breakfast: 'bg-accent text-accent-foreground',
  lunch: 'bg-sage/15 text-foreground',
  dinner: 'bg-coral/15 text-foreground',
  snack: 'bg-muted text-foreground',
}
const MEAL_SHORT: Record<string, string> = { breakfast: 'Matin', lunch: 'Midi', dinner: 'Soir', snack: 'Pause' }

export default async function HomePage() {
  const { supabase, user } = await getSession()
  if (!user) redirect('/login')

  const today = todayISO()
  const [ctx, { logs, totals }, week, { data: profile }, { data: rawRecipes }, expiring, { count: friendRequests }, { data: acts }] = await Promise.all([
    getHealthContext(supabase, user.id),
    getDayLogs(supabase, user.id, today),
    getWeekTotals(supabase, user.id, today),
    supabase.from('profiles').select('full_name, avatar_url').eq('id', user.id).maybeSingle(),
    supabase.from('recipes').select(RECIPE_SUMMARY_SELECT).eq('author_id', user.id)
      .order('created_at', { ascending: false }).limit(4),
    getExpiringSoon(supabase, today),
    supabase.from('friendships').select('*', { count: 'exact', head: true }).eq('addressee_id', user.id).eq('status', 'pending'),
    supabase.from('activities').select('done_on, duration_min, met, activity_key').eq('user_id', user.id).gte('done_on', weekStart(today)),
  ])
  // Le lundi : un résumé de la semaine passée, qui mène au bilan complet
  const isMonday = new Date(today + 'T12:00:00Z').getUTCDay() === 1
  const lastWeek = isMonday ? await getWeekData(supabase, user.id, shiftDate(weekStart(today), -7), today, ctx) : null
  const sport = weekSummary((acts ?? []).map((a) => ({ ...a, met: Number(a.met) })))
  const sessionsGoal = ctx.health?.weekly_sessions_goal ?? null

  // Première connexion : profil santé jamais rempli
  if (!ctx.health?.sex) redirect('/onboarding')

  const firstName = profile?.full_name?.split(' ')[0]
  const recipes = (rawRecipes ?? []).map(toSummary)
  const meals = MEALS.map((m) => ({
    meal: m,
    items: logs.filter((l) => l.meal === m),
  })).filter((m) => m.items.length > 0)

  return (
    <main className="px-5 pt-7 pb-6 max-w-xl mx-auto space-y-5">
      <WelcomeTour userId={user.id} seen={user.tourDone} />
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground first-letter:uppercase">{formatDateFr(today)}</p>
          <h1 className="text-[30px] font-bold leading-tight">Bonjour{firstName ? ` ${firstName}` : ''}</h1>
          <p className="mt-0.5 text-sm italic text-muted-foreground">{APP_SIGNATURE}</p>
        </div>
        <Link href="/profile" aria-label={friendRequests ? 'Mon profil (demandes d\'amis en attente)' : 'Mon profil'} className="md:hidden relative h-11 w-11 shrink-0">
          <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-muted">
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
              : <User className="h-5 w-5" />}
          </span>
          {!!friendRequests && <span className="absolute top-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-red-500" />}
        </Link>
      </header>

      {expiring.length > 0 && (
        <Link href="/frigo" className="flex items-center gap-3 rounded-3xl bg-secondary px-4 py-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-honey/25">
            <Leaf className="h-5 w-5 text-foreground" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-bold">
              {expiring.length === 1 ? '1 aliment à consommer vite' : `${expiring.length} aliments à consommer vite`}
            </span>
            <span className="block truncate text-sm text-muted-foreground">
              {expiring.slice(0, 3).map((e) => `${e.name} (${expiryInfo(e.expires_on, today).label.toLowerCase()})`).join(', ')}
              {expiring.length > 3 ? '…' : ''}
            </span>
          </span>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-card">
            <ChevronRight className="h-4 w-4" />
          </span>
        </Link>
      )}

      <Link href="/journal" className="block" aria-label="Ouvrir le journal du jour">
        <DaySummary totals={totals} targets={ctx.targets} compact />
      </Link>

      {lastWeek && (
        <Link href="/bilan" className="flex items-center gap-3 rounded-3xl bg-card px-4 py-3.5 shadow-card">
          <CalendarCheck className="h-5 w-5 shrink-0 text-sage" />
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-bold">Ta semaine dernière</span>
            <span className="block truncate text-sm text-muted-foreground tabular-nums">
              {lastWeek.review.loggedDays} jour{lastWeek.review.loggedDays > 1 ? 's' : ''} noté{lastWeek.review.loggedDays > 1 ? 's' : ''}
              {' · '}{lastWeek.review.sessions} séance{lastWeek.review.sessions > 1 ? 's' : ''}
              {lastWeek.review.avgProtein != null ? ` · ${Math.round(lastWeek.review.avgProtein)} g de protéines / jour` : ''}
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0" />
        </Link>
      )}

      <WeekRings days={week} target={ctx.targets?.energyKcal ?? null} today={today} />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl">
            <UtensilsCrossed className="h-5 w-5 text-terracotta" aria-hidden="true" /> Aujourd&apos;hui
          </h2>
          <Link href="/journal?add=1" className="flex items-center gap-1 text-sm font-bold text-primary">
            <Plus className="h-4 w-4" /> Ajouter
          </Link>
        </div>
        {meals.length === 0 ? (
          <Link href="/journal?add=1" className="block rounded-2xl border border-dashed border-input px-4 py-5 text-center text-sm text-muted-foreground">
            Rien de noté aujourd&apos;hui. Ajoute ton premier repas.
          </Link>
        ) : (
          <ul className="space-y-2">
            {meals.flatMap(({ meal, items }) => items.map((l) => (
              <li key={l.id}>
                <Link href={l.recipe_id ? `/recipes/${l.recipe_id}` : '/journal'}
                  className="flex min-h-16 items-center gap-3 rounded-2xl bg-card px-3.5 py-3 shadow-card">
                  <span className={`flex h-7 min-w-14 shrink-0 items-center justify-center rounded-full px-2.5 text-[11px] font-semibold ${MEAL_TINT[meal]}`}>
                    {MEAL_SHORT[meal]}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[15px] font-bold">{l.label}</span>
                    <span className="text-xs text-muted-foreground">{MEAL_LABELS[meal]}</span>
                  </span>
                  <span className="text-sm font-bold text-primary tabular-nums">{Math.round(Number(l.energy_kcal))} kcal</span>
                </Link>
              </li>
            )))}
          </ul>
        )}
      </section>

      <Link href="/forme" className="block rounded-3xl bg-secondary px-5 py-4 space-y-3">
        <span className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sage/15">
              <Activity className="h-5 w-5 text-sage" aria-hidden="true" />
            </span>
            <span className="font-heading text-lg font-semibold">Sport cette semaine</span>
          </span>
          {sport.moderateEquivalent >= WHO_WEEKLY_MINUTES && (
            <span className="rounded-full bg-sage/15 px-3 py-1 text-xs font-semibold">Repère atteint</span>
          )}
        </span>
        <span className="flex items-baseline justify-between gap-2">
          <span className="tabular-nums">
            <span className="font-heading text-3xl font-bold">{sport.moderateEquivalent}</span>
            <span className="text-sm text-muted-foreground"> / {WHO_WEEKLY_MINUTES} min actives</span>
          </span>
          <span className="text-xs font-semibold text-muted-foreground tabular-nums">
            {sport.sessions} séance{sport.sessions > 1 ? 's' : ''}{sessionsGoal ? ` sur ${sessionsGoal}` : ''}
          </span>
        </span>
        <span className="block h-2 overflow-hidden rounded-full bg-track" aria-hidden="true">
          <span className="block h-full rounded-full bg-sage" style={{ width: `${Math.min(100, Math.round((sport.moderateEquivalent / WHO_WEEKLY_MINUTES) * 100))}%` }} />
        </span>
        <span className="block text-[11px] text-muted-foreground">Repère OMS : {WHO_WEEKLY_MINUTES} min d&apos;activité modérée par semaine</span>
      </Link>

      <Link href="/idees" className="flex items-center gap-3 rounded-3xl bg-card px-4 py-3.5 shadow-card">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-terracotta/15">
          <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-bold">Qu&apos;est-ce qu&apos;on mange ce soir ?</span>
          <span className="block text-xs text-muted-foreground">Idées avec ton frigo</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0" />
      </Link>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl">
            <ChefHat className="h-5 w-5 text-honey" aria-hidden="true" /> Mes recettes
          </h2>
          <Link href="/recipes" className="flex min-h-11 items-center gap-1 text-sm font-bold text-primary">
            Tout voir <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {recipes.length === 0 ? (
          <Link href="/recipes/new" className="block rounded-2xl border border-dashed border-input px-4 py-5 text-center text-sm text-muted-foreground">
            Ajoute ta première recette : ses valeurs nutritionnelles seront calculées automatiquement.
          </Link>
        ) : (
          // Défilement horizontal sur téléphone, comme une étagère de magazine
          <div className="-mx-5 flex snap-x gap-3 overflow-x-auto px-5 pb-2 sm:mx-0 sm:grid sm:grid-cols-4 sm:px-0">
            {recipes.map((r) => (
              <div key={r.id} className="w-[46%] shrink-0 snap-start sm:w-auto">
                <RecipeCard recipe={r} showAuthor={false} from="/" />
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
