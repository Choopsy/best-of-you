'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { acceptInvite, cancelInvite, inviteToHousehold, leaveHousehold, renameHousehold } from '@/actions/household'

function useAction() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const run = (fn: () => Promise<{ error: string | null }>) => start(async () => {
    setError(null)
    const res = await fn()
    if (res.error) setError(res.error)
    else router.refresh()
  })
  return { error, pending, run }
}

export function RenameHousehold({ name }: { name: string }) {
  const { error, pending, run } = useAction()
  const [value, setValue] = useState(name)
  return (
    <form className="space-y-1" onSubmit={(e) => { e.preventDefault(); run(() => renameHousehold(value)) }}>
      <label htmlFor="hname" className="text-sm font-bold">Nom du foyer</label>
      <div className="flex gap-2">
        <Input id="hname" value={value} onChange={(e) => setValue(e.target.value)} className="h-11 rounded-2xl" />
        <Button type="submit" className="h-11 rounded-2xl" disabled={pending || !value.trim() || value === name}>OK</Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  )
}

export function InviteButton({ friendId }: { friendId: string }) {
  const { error, pending, run } = useAction()
  return (
    <div className="text-right">
      <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => inviteToHousehold(friendId))}>Inviter</Button>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  )
}

export function InviteResponse({ inviteId }: { inviteId: string }) {
  const { error, pending, run } = useAction()
  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => cancelInvite(inviteId))}>Refuser</Button>
        <Button size="sm" disabled={pending} onClick={() => run(() => acceptInvite(inviteId))}>Rejoindre</Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

export function CancelInvite({ inviteId }: { inviteId: string }) {
  const { pending, run } = useAction()
  return <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => cancelInvite(inviteId))}>Annuler</Button>
}

export function LeaveHousehold() {
  const { error, pending, run } = useAction()
  return (
    <div className="space-y-1">
      <Button variant="outline" className="w-full rounded-2xl text-destructive" disabled={pending}
        onClick={() => {
          if (window.confirm('Quitter le foyer ? Tu repartiras avec un frigo, un planning et une liste de courses vides.')) run(() => leaveHousehold())
        }}>
        Quitter le foyer
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
