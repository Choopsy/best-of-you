import { redirect } from 'next/navigation'
import Link from 'next/link'
import { User } from 'lucide-react'
import { getSession } from '@/lib/auth'
import { getHouseholdId } from '@/lib/household'
import { PageHeader } from '@/components/layout/page-header'
import { CancelInvite, InviteButton, InviteResponse, LeaveHousehold, RenameHousehold } from '@/components/kitchen/household-actions'

/* eslint-disable @typescript-eslint/no-explicit-any */

function Avatar({ url }: { url: string | null }) {
  return url
    ? <img src={url} alt="" className="h-10 w-10 rounded-full object-cover" />
    : <span className="h-10 w-10 rounded-full bg-muted flex items-center justify-center"><User className="h-4 w-4" /></span>
}

export default async function HouseholdPage() {
  const { supabase, user } = await getSession()
  if (!user) redirect('/login')
  const householdId = await getHouseholdId(supabase)

  const [{ data: household }, { data: members }, { data: invites }, { data: friendships }] = await Promise.all([
    supabase.from('households').select('id, name').eq('id', householdId ?? '').maybeSingle(),
    supabase.from('household_members').select('user_id, profiles ( full_name, avatar_url )').eq('household_id', householdId ?? ''),
    supabase.from('household_invites')
      .select('id, household_id, invited_user_id, invited:profiles!invited_user_id ( full_name ), inviter:profiles!invited_by ( full_name ), households ( name )'),
    supabase.from('friendships')
      .select('requester_id, addressee_id, requester:profiles!requester_id ( id, full_name, avatar_url ), addressee:profiles!addressee_id ( id, full_name, avatar_url )')
      .eq('status', 'accepted'),
  ])

  const memberIds = new Set((members ?? []).map((m: any) => m.user_id))
  const received = (invites ?? []).filter((i: any) => i.invited_user_id === user.id)
  const sent = (invites ?? []).filter((i: any) => i.household_id === householdId)
  const sentIds = new Set(sent.map((i: any) => i.invited_user_id))
  const friends = (friendships ?? [])
    .map((f: any) => (f.requester_id === user.id ? f.addressee : f.requester))
    .filter((p: any) => p && !memberIds.has(p.id))

  return (
    <div className="min-h-svh pb-24">
      <PageHeader title="Mon foyer" back="/frigo" />
      <main className="px-4 py-5 max-w-xl mx-auto space-y-6">
        <p className="text-sm text-muted-foreground">
          Les membres du foyer partagent le <b>frigo</b>, le <b>planning de la semaine</b> et la <b>liste de courses</b>.
          Tes données de santé et ton journal restent privés.
        </p>

        {received.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-lg">Invitations reçues</h2>
            <ul className="space-y-2">
              {received.map((i: any) => (
                <li key={i.id} className="rounded-3xl bg-card p-4 space-y-3 shadow-[0_1px_0_var(--border)]">
                  <p className="text-sm">
                    <b>{i.inviter?.full_name ?? 'Quelqu\'un'}</b> t&apos;invite dans « {i.households?.name ?? 'son foyer'} ».
                    Ton frigo et ta liste actuels y seront ajoutés si tu es seul dans ton foyer.
                  </p>
                  <InviteResponse inviteId={i.id} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {household && <RenameHousehold name={household.name} />}

        <section className="space-y-2">
          <h2 className="text-lg">Membres</h2>
          <ul className="rounded-3xl bg-card divide-y shadow-[0_1px_0_var(--border)]">
            {(members ?? []).map((m: any) => (
              <li key={m.user_id} className="flex items-center gap-3 px-4 py-3">
                <Avatar url={m.profiles?.avatar_url ?? null} />
                <span className="text-[15px] font-bold">{m.user_id === user.id ? 'Toi' : m.profiles?.full_name ?? 'Membre'}</span>
              </li>
            ))}
            {sent.map((i: any) => (
              <li key={i.id} className="flex items-center gap-3 px-4 py-3">
                <span className="h-10 w-10 rounded-full border-2 border-dashed border-input" />
                <span className="flex-1 text-[15px] text-muted-foreground">{i.invited?.full_name ?? 'Invité'} · invitation envoyée</span>
                <CancelInvite inviteId={i.id} />
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg">Inviter un ami</h2>
          {friends.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              On ne peut inviter que ses amis. <Link href="/friends" className="underline font-bold">Ajoute d&apos;abord la personne en ami</Link>.
            </p>
          ) : (
            <ul className="rounded-3xl bg-card divide-y shadow-[0_1px_0_var(--border)]">
              {friends.map((f: any) => (
                <li key={f.id} className="flex items-center gap-3 px-4 py-3">
                  <Avatar url={f.avatar_url} />
                  <span className="flex-1 text-[15px] font-bold">{f.full_name ?? 'Ami'}</span>
                  {sentIds.has(f.id) ? <span className="text-xs text-muted-foreground">Invité</span> : <InviteButton friendId={f.id} />}
                </li>
              ))}
            </ul>
          )}
        </section>

        {(members ?? []).length > 1 && <LeaveHousehold />}
      </main>
    </div>
  )
}
