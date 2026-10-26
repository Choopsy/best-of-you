import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Button } from '@/components/ui/button'
import { RecipeForm } from '@/components/recipes/recipe-form'
import type { RecipeDetail, Tag, Category } from '@/lib/types'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditRecipePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isAdmin = user?.email === process.env.ADMIN_EMAIL
  const db = isAdmin ? createAdminClient() : supabase

  const allCatsQuery = db.from('categories')
    .select('id, author_id, name, visibility, cover_image_url, created_at').order('name')

  const [{ data: raw }, { data: tags }, { data: profile }, { data: allCats }] = await Promise.all([
    supabase
      .from('recipes')
      .select(`
        id, title, description, cover_image_url,
        prep_time_min, cook_time_min, base_servings, difficulty, category_id, created_at, author_id,
        recipe_tags ( tags ( id, name, color ) ),
        ingredient_groups (
          id, name, position,
          ingredients ( id, name, amount, unit, position )
        ),
        steps ( id, position, content, image_url, step_ingredients ( ingredient_id ) )
      `)
      .eq('id', id)
      .single(),
    supabase.from('tags').select('id, name, color').order('name'),
    supabase.from('profiles').select('can_contribute').eq('id', user?.id ?? '').maybeSingle(),
    isAdmin ? allCatsQuery : allCatsQuery.or(`author_id.eq.${user?.id ?? ''},visibility.eq.public`),
  ])

  const canContribute = profile?.can_contribute ?? false
  const categories = isAdmin
    ? (allCats ?? [])
    : (allCats ?? []).filter((c) => c.author_id === user?.id || (c.visibility === 'public' && canContribute) || c.visibility === 'shared')

  if (!raw || !user || user.id !== raw.author_id) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recipe: RecipeDetail = {
    ...raw,
    tags: (raw.recipe_tags as any[]).map((rt) => rt.tags).filter(Boolean),
    author: null,
    avg_rating: null,
    ingredient_groups: (raw.ingredient_groups as any[])
      .sort((a, b) => a.position - b.position)
      .map((g) => ({
        ...g,
        ingredients: (g.ingredients as any[]).sort((a: any, b: any) => a.position - b.position),
      })),
    steps: (raw.steps as any[])
      .sort((a: any, b: any) => a.position - b.position)
      .map((s: any) => ({
        ...s,
        ingredient_ids: (s.step_ingredients as any[] ?? []).map((si: any) => si.ingredient_id),
      })),
  }

  return (
    <div className="min-h-svh">
      <header className="sticky top-0 md:top-14 z-10 bg-background/80 backdrop-blur-sm border-b px-2 py-2 flex items-center gap-2">
        <Link href={`/recipes/${id}`}>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="font-semibold">Modifier la recette</h1>
      </header>
      <main className="px-4 py-6 max-w-2xl mx-auto">
        <RecipeForm
          tags={(tags as Tag[]) ?? []}
          categories={(categories as Category[]) ?? []}
          initialData={recipe}
        />
      </main>
    </div>
  )
}
