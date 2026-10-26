import { PageHeader } from '@/components/layout/page-header'
import { CollectionForm } from '@/components/collections/collection-form'

export default function NewCollectionPage() {
  return (
    <div className="min-h-svh">
      <PageHeader title="Nouvelle collection" back="/collections" />
      <main className="px-4 py-6 max-w-lg mx-auto">
        <CollectionForm />
      </main>
    </div>
  )
}
