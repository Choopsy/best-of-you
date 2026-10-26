import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus, Library } from 'lucide-react'
import { getSession } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/page-header'

export default async function CollectionsPage() {
  const { supabase, user } = await getSession()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('collections')
    .select('id, name, cover_image_url, collection_recipes ( recipes ( cover_image_url ) )')
    .eq('owner_id', user.id)
    .order('name')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const collections = (data ?? []).map((c: any) => {
    const recipes = (c.collection_recipes ?? []).map((cr: any) => cr.recipes).filter(Boolean)
    return {
      id: c.id as string,
      name: c.name as string,
      count: recipes.length,
      image: (c.cover_image_url ?? recipes.find((r: any) => r.cover_image_url)?.cover_image_url ?? null) as string | null,
    }
  })

  return (
    <div className="min-h-svh pb-24">
      <PageHeader title="Mes collections" back="/profile">
        <Link href="/collections/new">
          <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Nouvelle</Button>
        </Link>
      </PageHeader>
      <main className="px-4 py-4 max-w-2xl mx-auto">
        {collections.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Library className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Range tes recettes par thème : « Batch du dimanche », « Petits-déj protéinés »…</p>
            <Link href="/collections/new"><Button size="sm">Créer une collection</Button></Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {collections.map((c) => (
              <Link key={c.id} href={`/collections/${c.id}`}>
                <div className="relative overflow-hidden rounded-2xl aspect-[4/3] bg-muted">
                  {c.image && <img src={c.image} alt="" className="absolute inset-0 w-full h-full object-cover" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white font-bold text-sm leading-tight truncate">{c.name}</p>
                    <p className="text-white/70 text-xs mt-0.5">{c.count} recette{c.count !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
