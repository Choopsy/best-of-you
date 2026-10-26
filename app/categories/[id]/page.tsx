import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { ArrowLeft, Pencil, Globe, Lock, Users, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { RecipeCard } from '@/components/recipes/recipe-card'
import { RecipeFilters } from '@/components/recipes/filters'
import type { Category, RecipeSummary, Tag } from '@/lib/types'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ q?: string; difficulty?: string; tag?: string }>
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { id } = await params
  const { q, difficulty, tag } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: category }, { data: allTags }] = await Promise.all([
    supabase
      .from('categories')
      .select('id, author_id, name, visibility, cover_image_url, created_at')
      .eq('id', id)
      .single(),
    supabase.from('tags').select('id, name, color').order('name'),
  ])

  if (!category) notFound()

  const cat = category as Category
  const isOwner = user?.id === cat.author_id

  // IDs des recettes sauvegardées dans cette catégorie
  const { data: saves } = await supabase
    .from('category_saves')
    .select('recipe_id')
    .eq('category_id', id)
  const savedIds = saves?.map((s) => s.recipe_id) ?? []

  // Requête recettes : natives (category_id) + sauvegardées
  let query = supabase
    .from('recipes')
    .select(`
      id, title, description, cover_image_url,
      prep_time_min, cook_time_min, base_servings, difficulty, category_id, created_at,
      recipe_tags ( tags ( id, name, color ) ),
      profiles!author_id ( full_name, avatar_url ),
      recipe_reviews ( rating )
    `)
    .order('created_at', { ascending: false })

  if (savedIds.length > 0) {
    query = query.or(`category_id.eq.${id},id.in.(${savedIds.join(',')})`)
  } else {
    query = query.eq('category_id', id)
  }

  if (q) query = query.ilike('title', `%${q}%`)
  if (difficulty) query = query.eq('difficulty', difficulty)
  if (tag) {
    const { data: links } = await supabase
      .from('recipe_tags').select('recipe_id').eq('tag_id', tag)
    const ids = links?.map((l) => l.recipe_id) ?? []
    query = ids.length > 0
      ? query.in('id', ids)
      : (query.in('id', ['00000000-0000-0000-0000-000000000000']) as typeof query)
  }

  const { data: raw } = await query

  const recipes: RecipeSummary[] =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    raw?.map((r: any) => {
      const ratings = (r.recipe_reviews ?? []).map((rv: any) => rv.rating).filter((rv: any) => rv !== null)
      return {
        ...r,
        tags: (r.recipe_tags as any[]).map((rt) => rt.tags).filter(Boolean),
        author: r.profiles ?? null,
        avg_rating: ratings.length ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length : null,
      }
    }) ?? []

  const hasFilters = q || difficulty || tag

  return (
    <div className="min-h-svh pb-24">
      {/* Header */}
      <header className="sticky top-0 md:top-14 z-10 bg-background/80 backdrop-blur-sm border-b px-2 py-2 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Link href="/">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-1.5 ml-1">
            <h1 className="font-semibold">{cat.name}</h1>
            {cat.visibility === 'public'  && <Globe  className="h-3.5 w-3.5 text-muted-foreground" />}
            {cat.visibility === 'shared'  && <Users  className="h-3.5 w-3.5 text-muted-foreground" />}
            {cat.visibility === 'private' && <Lock   className="h-3.5 w-3.5 text-muted-foreground" />}
          </div>
        </div>
        {isOwner && (
          <Link href={`/categories/${id}/edit`}>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Pencil className="h-4 w-4" />
            </Button>
          </Link>
        )}
      </header>

      {/* Cover image */}
      {cat.cover_image_url && (
        <div className="aspect-[3/1] w-full overflow-hidden bg-muted">
          <img src={cat.cover_image_url} alt={cat.name} className="w-full h-full object-cover" />
        </div>
      )}

      <main className="px-4 py-4 space-y-4 max-w-2xl mx-auto">
        <Suspense>
          <RecipeFilters tags={(allTags as Tag[]) ?? []} />
        </Suspense>

        {recipes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <p className="text-muted-foreground text-sm">
              {hasFilters
                ? 'Aucune recette ne correspond à ces filtres.'
                : 'Aucune recette dans cette catégorie.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} fromCategoryId={id} />
            ))}
          </div>
        )}
      </main>

      {/* FAB — ajouter une recette dans cette catégorie */}
      {isOwner && (
        <Link href={`/recipes/new?category=${id}`} className="fixed bottom-20 md:bottom-6 right-4">
          <Button className="h-14 w-14 rounded-full shadow-lg" size="icon" aria-label="Nouvelle recette">
            <Plus className="h-6 w-6" />
          </Button>
        </Link>
      )}
    </div>
  )
}
