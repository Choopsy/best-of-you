import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/page-header'
import { RecipeForm } from '@/components/recipes/recipe-form'
import type { Tag, Collection } from '@/lib/types'

interface Props {
  searchParams: Promise<{ collection?: string }>
}

export default async function NewRecipePage({ searchParams }: Props) {
  const { collection } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: tags }, { data: collections }] = await Promise.all([
    supabase.from('tags').select('id, name, color').order('name'),
    supabase.from('collections').select('id, owner_id, name, cover_image_url, created_at').eq('owner_id', user.id).order('name'),
  ])

  return (
    <div className="min-h-svh">
      <PageHeader title="Nouvelle recette" back={collection ? `/collections/${collection}` : '/recipes'} />
      <main className="px-4 py-6 max-w-2xl mx-auto">
        <RecipeForm
          tags={(tags as Tag[]) ?? []}
          collections={(collections as Collection[]) ?? []}
          defaultCollectionId={collection ?? null}
        />
      </main>
    </div>
  )
}
