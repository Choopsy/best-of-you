import Link from 'next/link'
import { ArrowLeft, User, UserCheck, UserPlus, UserX, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FriendActions } from '@/components/friends/friend-actions'

interface Props {
  searchParams: Promise<{ q?: string }>
}

export default async function FriendsPage({ searchParams }: Props) {
  const { q } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: friendships } = await supabase
    .from('friendships')
    .select(`
      id, requester_id, addressee_id, status, created_at,
      requester:profiles!requester_id(full_name, avatar_url),
      addressee:profiles!addressee_id(full_name, avatar_url)
    `)

  const all = (friendships ?? []) as any[]

  const incoming = all.filter((f) => f.addressee_id === user.id && f.status === 'pending')
  const outgoing = all.filter((f) => f.requester_id === user.id && f.status === 'pending')
  const friends  = all.filter((f) => f.status === 'accepted')

  // IDs déjà en relation (toutes directions, tous statuts)
  const relatedIds = new Set(all.flatMap((f) => [f.requester_id, f.addressee_id]))
  relatedIds.add(user.id)

  // Recherche d'utilisateurs
  let searchResults: { id: string; full_name: string | null; avatar_url: string | null }[] = []
  if (q?.trim()) {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .ilike('full_name', `%${q.trim()}%`)
      .limit(10)
    searchResults = (data ?? []).filter((p) => !relatedIds.has(p.id))
  }

  function Avatar({ url, name }: { url: string | null; name: string | null }) {
    return url ? (
      <img src={url} alt="" className="h-9 w-9 rounded-full object-cover shrink-0" />
    ) : (
      <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
        <User className="h-4 w-4 text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-svh pb-8">
      <header className="sticky top-0 md:top-14 z-10 bg-background/80 backdrop-blur-sm border-b px-2 py-2 flex items-center gap-2">
        <Link href="/">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="font-semibold">Amis</h1>
      </header>

      <div className="px-4 py-5 max-w-lg mx-auto space-y-6">

        {/* Recherche */}
        <form method="GET">
          <div className="flex gap-2">
            <Input name="q" defaultValue={q ?? ''} placeholder="Rechercher un utilisateur…" className="flex-1" />
            <Button type="submit" variant="secondary" size="sm">Chercher</Button>
          </div>
        </form>

        {/* Résultats de recherche */}
        {q && (
          <section className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Résultats
            </p>
            {searchResults.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun utilisateur trouvé.</p>
            ) : (
              <ul className="space-y-2">
                {searchResults.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar url={p.avatar_url} name={p.full_name} />
                      <span className="font-medium truncate">{p.full_name ?? 'Anonyme'}</span>
                    </div>
                    <FriendActions type="add" targetId={p.id} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* Demandes reçues */}
        {incoming.length > 0 && (
          <section className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <UserPlus className="h-3.5 w-3.5" />
              Demandes reçues ({incoming.length})
            </p>
            <ul className="space-y-2">
              {incoming.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar url={f.requester?.avatar_url} name={f.requester?.full_name} />
                    <span className="font-medium truncate">{f.requester?.full_name ?? 'Anonyme'}</span>
                  </div>
                  <FriendActions type="incoming" friendshipId={f.id} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Demandes envoyées */}
        {outgoing.length > 0 && (
          <section className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              En attente ({outgoing.length})
            </p>
            <ul className="space-y-2">
              {outgoing.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar url={f.addressee?.avatar_url} name={f.addressee?.full_name} />
                    <span className="font-medium truncate">{f.addressee?.full_name ?? 'Anonyme'}</span>
                  </div>
                  <FriendActions type="outgoing" friendshipId={f.id} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Amis acceptés */}
        <section className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <UserCheck className="h-3.5 w-3.5" />
            Amis ({friends.length})
          </p>
          {friends.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun ami pour l'instant.</p>
          ) : (
            <ul className="space-y-2">
              {friends.map((f) => {
                const other = f.requester_id === user.id ? f.addressee : f.requester
                return (
                  <li key={f.id} className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar url={other?.avatar_url} name={other?.full_name} />
                      <span className="font-medium truncate">{other?.full_name ?? 'Anonyme'}</span>
                    </div>
                    <FriendActions type="friend" friendshipId={f.id} />
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
