import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { PageHeader } from '@/components/layout/page-header'
import { RecipeForm } from '@/components/recipes/recipe-form'
import { loadRecipe } from '@/lib/recipes'
import type { Tag } from '@/lib/types'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditRecipePage({ params }: Props) {
  const { id } = await params
  const { supabase, user } = await getSession()
  if (!user) redirect('/login')

  const [recipe, { data: tags }] = await Promise.all([
    loadRecipe(supabase, id),
    supabase.from('tags').select('id, name, color').order('name'),
  ])
  if (!recipe || recipe.author_id !== user.id) notFound()

  return (
    <div className="min-h-svh">
      <PageHeader title="Modifier la recette" back={`/recipes/${id}`} />
      <main className="px-4 py-6 max-w-2xl mx-auto">
        <RecipeForm tags={(tags as Tag[]) ?? []} collections={[]} initialData={recipe} />
      </main>
    </div>
  )
}
