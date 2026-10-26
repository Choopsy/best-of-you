import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { CategoryForm } from '@/components/categories/category-form'

export default async function NewCategoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let friends: { id: string; full_name: string | null; avatar_url: string | null }[] = []

  if (user) {
    const { data: rawFriendships } = await supabase
      .from('friendships')
      .select(`
        requester_id, addressee_id,
        requester:profiles!requester_id(id, full_name, avatar_url),
        addressee:profiles!addressee_id(id, full_name, avatar_url)
      `)
      .eq('status', 'accepted')

    friends = (rawFriendships ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((f: any) => (f.requester_id === user.id ? f.addressee : f.requester))
      .filter(Boolean)
  }

  return (
    <div className="min-h-svh">
      <header className="sticky top-0 md:top-14 z-10 bg-background/80 backdrop-blur-sm border-b px-2 py-2 flex items-center gap-2">
        <Link href="/">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="font-semibold">Nouvelle catégorie</h1>
      </header>
      <main className="px-4 py-6 max-w-lg mx-auto">
        <CategoryForm availableFriends={friends} />
      </main>
    </div>
  )
}
