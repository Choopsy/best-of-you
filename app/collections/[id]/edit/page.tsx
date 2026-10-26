import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/page-header'
import { CollectionForm } from '@/components/collections/collection-form'
import type { Collection } from '@/lib/types'

export default async function EditCollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('collections').select('id, owner_id, name, cover_image_url, created_at').eq('id', id).maybeSingle()
  if (!data) notFound()
  return (
    <div className="min-h-svh">
      <PageHeader title="Modifier la collection" back={`/collections/${id}`} />
      <main className="px-4 py-6 max-w-lg mx-auto">
        <CollectionForm collection={data as Collection} />
      </main>
    </div>
  )
}
