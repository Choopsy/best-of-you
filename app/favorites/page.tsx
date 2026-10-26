import Link from 'next/link'
import { ArrowLeft, Heart } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { RecipeCard } from '@/components/recipes/recipe-card'
import type { RecipeSummary } from '@/lib/types'

export default async function FavoritesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: raw } = await supabase
    .from('recipe_likes')
    .select(`
      recipe_id,
      recipes (
        id, title, description, cover_image_url,
        prep_time_min, cook_time_min, base_servings, difficulty, category_id, created_at,
        recipe_tags ( tags ( id, name, color ) ),
        recipe_reviews ( rating )
      )
    `)
    .eq('user_id', user?.id ?? '')
    .order('created_at', { ascending: false })

  const recipes: RecipeSummary[] =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (raw ?? []).map((row: any) => {
      const ratings = (row.recipes?.recipe_reviews ?? []).map((r: any) => r.rating).filter((r: any) => r !== null)
      return {
        ...row.recipes,
        tags: (row.recipes?.recipe_tags ?? []).map((rt: any) => rt.tags).filter(Boolean),
        avg_rating: ratings.length ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length : null,
      }
    }).filter((r: any) => r.id)

  return (
    <div className="min-h-svh pb-8">
      <header className="sticky top-0 md:top-14 z-10 bg-background/80 backdrop-blur-sm border-b px-2 py-2 flex items-center gap-2">
        <Link href="/">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4 fill-red-500 text-red-500" />
          <h1 className="font-semibold">Recettes aimées</h1>
        </div>
      </header>

      <main className="px-4 py-4 max-w-2xl mx-auto">
        {recipes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <Heart className="h-12 w-12 text-muted-foreground/25" />
            <p className="text-muted-foreground text-sm">
              Tu n&apos;as pas encore aimé de recettes.
            </p>
            <Link href="/">
              <Button size="sm" variant="outline">Parcourir les recettes</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
