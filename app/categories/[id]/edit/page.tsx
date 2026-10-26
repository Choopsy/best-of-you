import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Button } from '@/components/ui/button'
import { CategoryForm } from '@/components/categories/category-form'
import type { Category } from '@/lib/types'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditCategoryPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isAdmin = user?.email === process.env.ADMIN_EMAIL
  const db = isAdmin ? createAdminClient() : supabase

  const { data } = await db
    .from('categories')
    .select('id, author_id, name, visibility, cover_image_url, created_at')
    .eq('id', id)
    .single()

  if (!data) notFound()

  const category = data as Category

  let friends: { id: string; full_name: string | null; avatar_url: string | null }[] = []
  let initialMemberIds: string[] = []

  if (user) {
    const [{ data: rawFriendships }, { data: rawMembers }] = await Promise.all([
      supabase
        .from('friendships')
        .select(`
          requester_id, addressee_id,
          requester:profiles!requester_id(id, full_name, avatar_url),
          addressee:profiles!addressee_id(id, full_name, avatar_url)
        `)
        .eq('status', 'accepted'),
      category.visibility === 'shared'
        ? supabase.from('category_members').select('user_id').eq('category_id', id)
        : Promise.resolve({ data: [] }),
    ])

    friends = (rawFriendships ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((f: any) => (f.requester_id === user.id ? f.addressee : f.requester))
      .filter(Boolean)

    initialMemberIds = (rawMembers ?? []).map((m: any) => m.user_id)
  }

  return (
    <div className="min-h-svh">
      <header className="sticky top-0 md:top-14 z-10 bg-background/80 backdrop-blur-sm border-b px-2 py-2 flex items-center gap-2">
        <Link href={`/categories/${id}`}>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="font-semibold">Modifier la catégorie</h1>
      </header>
      <main className="px-4 py-6 max-w-lg mx-auto">
        <CategoryForm
          initialData={category}
          availableFriends={friends}
          initialMemberIds={initialMemberIds}
        />
      </main>
    </div>
  )
}
