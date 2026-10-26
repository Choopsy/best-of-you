import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, BookOpen, NotebookPen, Scale, Leaf } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/actions/auth'
import { Button } from '@/components/ui/button'
import { DaySummary } from '@/components/journal/day-summary'
import { RecipeCard } from '@/components/recipes/recipe-card'
import { getHealthContext } from '@/lib/health'
import { getDayLogs } from '@/lib/journal'
import { todayISO } from '@/lib/dates'
import { RECIPE_SUMMARY_SELECT, toSummary } from '@/lib/recipes'
import { GOAL_LABELS } from '@/lib/targets'
import { APP_NAME } from '@/lib/brand'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = todayISO()
  const [ctx, { totals }, { data: profile }, { data: rawRecipes }] = await Promise.all([
    getHealthContext(supabase, user.id),
    getDayLogs(supabase, user.id, today),
    supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
    supabase.from('recipes').select(RECIPE_SUMMARY_SELECT).eq('author_id', user.id)
      .order('created_at', { ascending: false }).limit(4),
  ])

  // Première connexion : profil santé jamais rempli
  if (!ctx.health?.sex) redirect('/onboarding')

  const firstName = profile?.full_name?.split(' ')[0]
  const recipes = (rawRecipes ?? []).map(toSummary)
  const target = ctx.health?.target_weight_kg != null ? Number(ctx.health.target_weight_kg) : null

  return (
    <div className="min-h-svh pb-24">
      <header className="md:hidden sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Leaf className="h-5 w-5 text-primary" />
          <span className="font-bold">{APP_NAME}</span>
        </div>
        <form action={signOut}>
          <Button variant="ghost" size="sm" type="submit" className="text-muted-foreground text-xs">Déconnexion</Button>
        </form>
      </header>

      <main className="px-4 py-5 max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold">Bonjour{firstName ? ` ${firstName}` : ''} 👋</h1>
          {ctx.health && (
            <p className="text-sm text-muted-foreground">Objectif : {GOAL_LABELS[ctx.targets?.effectiveGoal ?? ctx.health.goal].toLowerCase()}</p>
          )}
        </div>

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Aujourd&apos;hui</h2>
            <Link href="/journal" className="text-sm text-muted-foreground flex items-center gap-1 hover:text-foreground">
              Journal <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <DaySummary totals={totals} targets={ctx.targets} compact />
        </section>

        <div className="grid grid-cols-2 gap-3">
          <Link href="/journal?add=1" className="rounded-2xl border bg-card p-4 flex items-center gap-3 hover:bg-muted transition-colors">
            <NotebookPen className="h-5 w-5 text-primary shrink-0" />
            <span className="text-sm font-medium">Ajouter un repas</span>
          </Link>
          <Link href="/recipes/new" className="rounded-2xl border bg-card p-4 flex items-center gap-3 hover:bg-muted transition-colors">
            <BookOpen className="h-5 w-5 text-primary shrink-0" />
            <span className="text-sm font-medium">Nouvelle recette</span>
          </Link>
        </div>

        {ctx.weightKg != null && (
          <Link href="/profile/health" className="rounded-2xl border bg-card p-4 flex items-center gap-3 hover:bg-muted transition-colors">
            <Scale className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1 text-sm">
              <p className="font-medium">{ctx.weightKg.toLocaleString('fr-FR')} kg</p>
              <p className="text-xs text-muted-foreground">
                {target != null
                  ? `Objectif ${target.toLocaleString('fr-FR')} kg · ${Math.abs(ctx.weightKg - target).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} kg d'écart`
                  : 'Dernière pesée enregistrée'}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        )}

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Mes dernières recettes</h2>
            <Link href="/recipes" className="text-sm text-muted-foreground flex items-center gap-1 hover:text-foreground">
              Tout voir <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {recipes.length === 0 ? (
            <p className="text-sm text-muted-foreground rounded-2xl border border-dashed px-4 py-6 text-center">
              Ajoute tes recettes pour suivre leurs valeurs nutritionnelles et les noter dans ton journal en un clic.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {recipes.map((r) => <RecipeCard key={r.id} recipe={r} showAuthor={false} from="/" />)}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
