import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Heart } from 'lucide-react'
import { getSession } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/page-header'
import { RecipeCard } from '@/components/recipes/recipe-card'
import { RECIPE_SUMMARY_SELECT, toSummary } from '@/lib/recipes'

export default async function FavoritesPage() {
  const { supabase, user } = await getSession()
  if (!user) redirect('/login')

  const { data: likes } = await supabase
    .from('recipe_likes').select('recipe_id').eq('user_id', user.id).order('created_at', { ascending: false })
  const ids = (likes ?? []).map((l) => l.recipe_id)
  const { data: raw } = ids.length
    ? await supabase.from('recipes').select(RECIPE_SUMMARY_SELECT).in('id', ids)
    : { data: [] }
  const byId = new Map((raw ?? []).map((r) => [r.id, toSummary(r)]))
  const recipes = ids.map((id) => byId.get(id)).filter((r) => r != null)

  return (
    <div className="min-h-svh pb-24">
      <PageHeader title="Recettes aimées" back="/profile" />
      <main className="px-4 py-4 max-w-2xl mx-auto">
        {recipes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <Heart className="h-12 w-12 text-muted-foreground/25" />
            <p className="text-muted-foreground text-sm">Tu n&apos;as pas encore aimé de recettes.</p>
            <Link href="/recipes?tab=discover"><Button size="sm" variant="outline">Découvrir des recettes</Button></Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {recipes.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} from="/favorites" />)}
          </div>
        )}
      </main>
    </div>
  )
}
