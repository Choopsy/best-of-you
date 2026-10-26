import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AlarmClock, ArrowRight, ChevronRight, Plus, User } from 'lucide-react'
import { getSession } from '@/lib/auth'
import { DaySummary } from '@/components/journal/day-summary'
import { WeekRings } from '@/components/journal/week-rings'
import { RecipeCard } from '@/components/recipes/recipe-card'
import { getHealthContext } from '@/lib/health'
import { getDayLogs, getWeekTotals } from '@/lib/journal'
import { getExpiringSoon } from '@/lib/household'
import { expiryInfo } from '@/components/kitchen/expiry'
import { formatDateFr, todayISO } from '@/lib/dates'
import { RECIPE_SUMMARY_SELECT, toSummary } from '@/lib/recipes'
import { MEALS, MEAL_LABELS } from '@/lib/types'

const MEAL_TINT: Record<string, string> = {
  breakfast: 'bg-secondary text-secondary-foreground',
  lunch: 'bg-sage/15 text-foreground',
  dinner: 'bg-honey/20 text-foreground',
  snack: 'bg-muted text-foreground',
}
const MEAL_SHORT: Record<string, string> = { breakfast: 'Matin', lunch: 'Midi', dinner: 'Soir', snack: 'Pause' }

export default async function HomePage() {
  const { supabase, user } = await getSession()
  if (!user) redirect('/login')

  const today = todayISO()
  const [ctx, { logs, totals }, week, { data: profile }, { data: rawRecipes }, expiring, { count: friendRequests }] = await Promise.all([
    getHealthContext(supabase, user.id),
    getDayLogs(supabase, user.id, today),
    getWeekTotals(supabase, user.id, today),
    supabase.from('profiles').select('full_name, avatar_url').eq('id', user.id).maybeSingle(),
    supabase.from('recipes').select(RECIPE_SUMMARY_SELECT).eq('author_id', user.id)
      .order('created_at', { ascending: false }).limit(4),
    getExpiringSoon(supabase, today),
    supabase.from('friendships').select('*', { count: 'exact', head: true }).eq('addressee_id', user.id).eq('status', 'pending'),
  ])

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
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground first-letter:uppercase">{formatDateFr(today)}</p>
          <h1 className="text-[30px] leading-tight">Bonjour{firstName ? ` ${firstName}` : ''}</h1>
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
        <Link href="/frigo" className="flex items-center gap-3 rounded-3xl bg-honey/20 px-4 py-3.5">
          <AlarmClock className="h-5 w-5 shrink-0 text-foreground" />
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-bold">
              {expiring.length === 1 ? '1 aliment à consommer vite' : `${expiring.length} aliments à consommer vite`}
            </span>
            <span className="block truncate text-sm text-muted-foreground">
              {expiring.slice(0, 3).map((e) => `${e.name} (${expiryInfo(e.expires_on, today).label.toLowerCase()})`).join(', ')}
              {expiring.length > 3 ? '…' : ''}
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0" />
        </Link>
      )}

      <WeekRings days={week} target={ctx.targets?.energyKcal ?? null} today={today} />

      <Link href="/journal" className="block" aria-label="Ouvrir le journal du jour">
        <DaySummary totals={totals} targets={ctx.targets} compact />
      </Link>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl">Mes repas</h2>
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
                  className="flex items-center gap-3 rounded-2xl bg-card px-3.5 py-3">
                  <span className={`flex h-10 w-12 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold ${MEAL_TINT[meal]}`}>
                    {MEAL_SHORT[meal]}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[15px] font-bold">{l.label}</span>
                    <span className="text-xs text-muted-foreground">{MEAL_LABELS[meal]}</span>
                  </span>
                  <span className="text-sm font-bold tabular-nums">{Math.round(Number(l.energy_kcal))} kcal</span>
                </Link>
              </li>
            )))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl">Mes recettes</h2>
          <Link href="/recipes" className="flex items-center gap-1 text-sm font-bold text-muted-foreground">
            Tout voir <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {recipes.length === 0 ? (
          <Link href="/recipes/new" className="block rounded-2xl border border-dashed border-input px-4 py-5 text-center text-sm text-muted-foreground">
            Ajoute ta première recette : ses valeurs nutritionnelles seront calculées automatiquement.
          </Link>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {recipes.map((r) => <RecipeCard key={r.id} recipe={r} showAuthor={false} from="/" />)}
          </div>
        )}
      </section>
    </main>
  )
}
