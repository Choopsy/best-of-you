import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Pencil, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/page-header'
import { RecipeCard } from '@/components/recipes/recipe-card'
import { RECIPE_SUMMARY_SELECT, toSummary } from '@/lib/recipes'

export default async function CollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: collection } = await supabase
    .from('collections').select('id, name, cover_image_url').eq('id', id).maybeSingle()
  if (!collection) notFound()

  const { data: links } = await supabase.from('collection_recipes').select('recipe_id').eq('collection_id', id)
  const ids = (links ?? []).map((l) => l.recipe_id)
  const { data: raw } = ids.length
    ? await supabase.from('recipes').select(RECIPE_SUMMARY_SELECT).in('id', ids).order('title')
    : { data: [] }
  const recipes = (raw ?? []).map(toSummary)

  return (
    <div className="min-h-svh pb-24">
      <PageHeader title={collection.name} back="/collections">
        <Link href={`/collections/${id}/edit`}>
          <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Modifier"><Pencil className="h-4 w-4" /></Button>
        </Link>
      </PageHeader>

      {collection.cover_image_url && (
        <div className="aspect-[3/1] w-full overflow-hidden bg-muted">
          <img src={collection.cover_image_url} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      <main className="px-4 py-4 max-w-2xl mx-auto space-y-4">
        {recipes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">
            Aucune recette ici. Ajoute des recettes depuis leur page avec le bouton marque-page.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {recipes.map((r) => <RecipeCard key={r.id} recipe={r} from={`/collections/${id}`} />)}
          </div>
        )}
      </main>

      <Link href={`/recipes/new?collection=${id}`} className="fixed bottom-20 md:bottom-6 right-4">
        <Button className="h-14 w-14 rounded-full shadow-lg" size="icon" aria-label="Nouvelle recette dans cette collection">
          <Plus className="h-6 w-6" />
        </Button>
      </Link>
    </div>
  )
}
