import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChefHat, Clock, Leaf, Refrigerator, Sparkles } from 'lucide-react'
import { getSession } from '@/lib/auth'
import { getFridge } from '@/lib/household'
import { getHealthContext } from '@/lib/health'
import { getDayLogs } from '@/lib/journal'
import { todayISO } from '@/lib/dates'
import { computeRecipeNutrition, fetchCiqual } from '@/lib/nutrition'
import { suggestRecipes } from '@/lib/suggest'
import { DIET_TAGS, EXCLUSION_TAGS, type Diet, type Exclusion } from '@/lib/types'
import { PageHeader } from '@/components/layout/page-header'
import { PlanSheet } from '@/components/kitchen/plan-sheet'
import { Button } from '@/components/ui/button'

const when = (d: number) => (d <= 0 ? "aujourd'hui" : d === 1 ? 'demain' : `dans ${d} j`)
const f = (v: number) => Math.round(v).toLocaleString('fr-FR')

interface Row {
  id: string
  title: string
  cover_image_url: string | null
  base_servings: number | null
  prep_time_min: number | null
  cook_time_min: number | null
  author_id: string
  recipe_tags: { tags: { name: string } | null }[]
  ingredients: { name: string; amount: number | null; unit: string | null; ciqual_code: string | null; weight_g: number | null }[]
}

export default async function IdeasPage() {
  const { supabase, user } = await getSession()
  if (!user) redirect('/login')
  const today = todayISO()

  const [fridge, ctx, { totals }, { data }] = await Promise.all([
    getFridge(supabase),
    getHealthContext(supabase, user.id, today),
    getDayLogs(supabase, user.id, today),
    // La sécurité (RLS) ne renvoie que mes recettes, celles du foyer, d'amis ou publiques
    supabase.from('recipes')
      .select('id, title, cover_image_url, base_servings, prep_time_min, cook_time_min, author_id, recipe_tags ( tags ( name ) ), ingredients ( name, amount, unit, ciqual_code, weight_g )')
      .order('created_at', { ascending: false }).limit(150),
  ])

  // Recettes des autres : seulement celles compatibles avec mon régime (d'après leurs tags)
  const diet = (ctx.health?.diet ?? 'omnivore') as Diet
  const exclusions = (ctx.health?.exclusions ?? []) as Exclusion[]
  const rows = ((data ?? []) as unknown as Row[]).filter((r) => {
    if (r.author_id === user.id) return true
    const names = new Set(r.recipe_tags.map((t) => t.tags?.name).filter(Boolean))
    const dietOk = diet === 'omnivore' || DIET_TAGS[diet].some((t) => names.has(t))
    return dietOk && exclusions.every((e) => names.has(EXCLUSION_TAGS[e]))
  })
  const byId = new Map(rows.map((r) => [r.id, r]))

  const suggestions = suggestRecipes(rows, fridge, today, 12)
  const ciqual = await fetchCiqual(supabase,
    suggestions.flatMap((s) => byId.get(s.id)!.ingredients.map((i) => i.ciqual_code ?? '')))
  const remaining = ctx.targets ? ctx.targets.energyKcal - totals.energy_kcal : null

  return (
    <div className="min-h-svh pb-24">
      <PageHeader title="Qu'est-ce qu'on mange ?" back="/frigo" />

      <main className="px-4 py-4 max-w-xl mx-auto space-y-4">
        {fridge.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <Refrigerator className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground max-w-xs">
              Note d&apos;abord ce que tu as au frigo : les idées viendront de là, en commençant par ce qui périme bientôt.
            </p>
            <Link href="/frigo?add=1"><Button>Remplir mon frigo</Button></Link>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <ChefHat className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground max-w-xs">
              Aucune recette ne va avec ce qu&apos;il y a dans ton frigo pour l&apos;instant.
              Plus tu as de recettes (les tiennes, celles de tes amis ou publiques), meilleures sont les idées.
            </p>
            <div className="flex gap-2">
              <Link href="/recipes?tab=discover"><Button variant="outline">Découvrir</Button></Link>
              <Link href="/recipes/new"><Button>Nouvelle recette</Button></Link>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              D&apos;après ton frigo, en priorité ce qui va bientôt se perdre.
              {remaining != null && remaining > 0 && <> Il te reste <span className="font-bold text-foreground">{f(remaining)} kcal</span> aujourd&apos;hui.</>}
            </p>
            <ul className="space-y-3">
              {suggestions.map((s, idx) => {
                const r = byId.get(s.id)!
                const n = computeRecipeNutrition(r.ingredients, r.base_servings ?? 1, ciqual)
                const kcal = n?.perServing.energy_kcal
                const fits = kcal != null && remaining != null && kcal <= remaining
                const time = (r.prep_time_min ?? 0) + (r.cook_time_min ?? 0)
                return (
                  <li key={s.id} className="rounded-3xl bg-card overflow-hidden shadow-[0_1px_0_var(--border)]">
                    <Link href={`/recipes/${s.id}`} className="flex gap-3 p-3">
                      <div className="h-20 w-20 shrink-0 rounded-2xl bg-muted overflow-hidden flex items-center justify-center">
                        {r.cover_image_url
                          ? <img src={r.cover_image_url} alt="" className="h-full w-full object-cover" loading={idx > 2 ? 'lazy' : undefined} />
                          : <ChefHat className="h-6 w-6 text-muted-foreground/40" />}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="font-heading text-[17px] leading-snug line-clamp-2">{r.title}</p>
                        <p className="text-xs text-muted-foreground tabular-nums">
                          Tu as {s.have} ingrédient{s.have > 1 ? 's' : ''} sur {s.total}
                          {time > 0 && <> · <Clock className="inline h-3 w-3 -mt-0.5" /> {time} min</>}
                        </p>
                        {kcal != null && (
                          <p className="text-xs tabular-nums">
                            ≈ {f(kcal)} kcal · {f(n!.perServing.proteins_g)} g de protéines <span className="text-muted-foreground">par portion</span>
                            {fits && <span className="ml-1 font-bold text-sage">· ça rentre</span>}
                          </p>
                        )}
                      </div>
                    </Link>
                    <div className="px-3 pb-3 space-y-2">
                      {s.saves.length > 0 && (
                        <p className="flex items-start gap-1.5 rounded-xl bg-honey/15 px-3 py-2 text-xs">
                          <Leaf className="h-3.5 w-3.5 shrink-0 mt-0.5 text-honey" />
                          <span>Utilise {s.saves.map((x) => <span key={x.name}><span className="font-bold">{x.name}</span> ({when(x.days)})</span>)
                            .reduce<React.ReactNode[]>((acc, el, i) => (i ? [...acc, ', ', el] : [el]), [])}</span>
                        </p>
                      )}
                      {s.missing.length > 0 && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          Il manque : {s.missing.slice(0, 5).join(', ')}{s.missing.length > 5 ? '…' : ''}
                        </p>
                      )}
                      <PlanSheet date={today} recipes={[]} recipe={{ id: r.id, title: r.title, cover_image_url: r.cover_image_url }}
                        defaultServings={2} trigger="wide" label="Prévoir ce soir" />
                    </div>
                  </li>
                )
              })}
            </ul>
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              Le sel, le poivre, l&apos;huile et les épices sont considérés comme toujours au placard.
            </p>
          </>
        )}
      </main>
    </div>
  )
}
