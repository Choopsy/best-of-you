import { Suspense } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus } from 'lucide-react'
import { getSession } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/page-header'
import { RecipeCard } from '@/components/recipes/recipe-card'
import { RecipeFilters } from '@/components/recipes/filters'
import { RECIPE_SUMMARY_SELECT, toSummary } from '@/lib/recipes'
import { DIET_LABELS, DIET_TAGS, EXCLUSION_TAGS, type Diet, type Exclusion, type RecipeSummary, type Tag } from '@/lib/types'

type TabKey = 'mine' | 'discover' | 'shared'
const TABS: { key: TabKey; label: string }[] = [
  { key: 'mine', label: 'Mes recettes' },
  { key: 'discover', label: 'Découvrir' },
  { key: 'shared', label: 'Partagées avec moi' },
]

interface Props {
  searchParams: Promise<{ tab?: string; q?: string; difficulty?: string; tag?: string; all?: string }>
}

/** La recette convient-elle au régime et aux exclusions de l'utilisateur ? (d'après ses tags) */
function fitsDiet(r: RecipeSummary, diet: Diet, exclusions: Exclusion[]) {
  const names = new Set(r.tags.map((t) => t.name))
  const dietOk = diet === 'omnivore' || DIET_TAGS[diet].some((t) => names.has(t))
  return dietOk && exclusions.every((e) => names.has(EXCLUSION_TAGS[e]))
}

export default async function RecipesPage({ searchParams }: Props) {
  const { tab: rawTab, q, difficulty, tag, all } = await searchParams
  const tab: TabKey = rawTab === 'discover' || rawTab === 'shared' ? rawTab : 'mine'

  const { supabase, user } = await getSession()
  if (!user) redirect('/login')

  const [{ data: allTags }, { data: health }] = await Promise.all([
    supabase.from('tags').select('id, name, color').order('name'),
    supabase.from('health_profiles').select('diet, exclusions').eq('user_id', user.id).maybeSingle(),
  ])
  const diet = (health?.diet ?? 'omnivore') as Diet
  const exclusions = (health?.exclusions ?? []) as Exclusion[]
  const hasDietFilter = diet !== 'omnivore' || exclusions.length > 0

  let query = supabase.from('recipes').select(RECIPE_SUMMARY_SELECT).order('created_at', { ascending: false }).limit(60)

  if (tab === 'mine') {
    query = query.eq('author_id', user.id)
  } else if (tab === 'discover') {
    // La sécurité (RLS) ne renvoie que les recettes publiques ou d'amis
    query = query.neq('author_id', user.id).in('visibility', ['public', 'friends'])
  } else {
    const { data: shares } = await supabase.from('recipe_shares').select('recipe_id').eq('user_id', user.id)
    const ids = (shares ?? []).map((s) => s.recipe_id)
    query = query.in('id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000'])
  }

  if (q) query = query.ilike('title', `%${q.replace(/[%_]/g, '')}%`)
  if (difficulty) query = query.eq('difficulty', difficulty)
  if (tag) {
    const { data: links } = await supabase.from('recipe_tags').select('recipe_id').eq('tag_id', tag)
    const ids = links?.map((l) => l.recipe_id) ?? []
    query = query.in('id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000'])
  }

  const { data: raw } = await query
  let recipes = (raw ?? []).map(toSummary)
  const applyDiet = tab === 'discover' && hasDietFilter && all !== '1'
  if (applyDiet) recipes = recipes.filter((r) => fitsDiet(r, diet, exclusions))

  const dietText = [diet !== 'omnivore' ? DIET_LABELS[diet].toLowerCase() : null, ...exclusions.map((e) => EXCLUSION_TAGS[e].toLowerCase())]
    .filter(Boolean).join(', ')

  return (
    <div className="min-h-svh pb-24">
      <PageHeader title="Recettes">
        <Link href="/recipes/new">
          <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Nouvelle</Button>
        </Link>
      </PageHeader>

      <main className="px-4 py-4 space-y-4 max-w-2xl mx-auto">
        <div className="flex gap-1 rounded-xl bg-muted p-1 overflow-x-auto no-scrollbar">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/recipes?tab=${t.key}`}
              className={`flex-1 whitespace-nowrap text-center rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === t.key ? 'bg-background shadow-sm' : 'text-muted-foreground'
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>

        <Suspense>
          <RecipeFilters tags={(allTags as Tag[]) ?? []} />
        </Suspense>

        {tab === 'discover' && hasDietFilter && (
          <p className="text-xs text-muted-foreground">
            {applyDiet ? (
              <>Seulement les recettes marquées compatibles avec ton profil ({dietText}).{' '}
                <Link href={`/recipes?tab=discover&all=1`} className="underline underline-offset-2">Tout afficher</Link></>
            ) : (
              <Link href="/recipes?tab=discover" className="underline underline-offset-2">Filtrer selon mon régime ({dietText})</Link>
            )}
          </p>
        )}

        {recipes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <p className="text-muted-foreground text-sm">
              {tab === 'mine' && !q && !tag && !difficulty
                ? 'Tu n\'as pas encore de recette.'
                : tab === 'shared'
                  ? 'Aucun ami ne t\'a encore partagé de recette.'
                  : 'Aucune recette ne correspond.'}
            </p>
            {tab === 'mine' && (
              <Link href="/recipes/new"><Button size="sm">Créer ma première recette</Button></Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} showAuthor={tab !== 'mine'} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
