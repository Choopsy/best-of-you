'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { deleteActivity, deleteWeight } from '@/actions/activities'

export function DeleteButton({ id, kind, label }: { id: string; kind: 'activity' | 'weight'; label: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  return (
    <button type="button" disabled={pending} aria-label={`Supprimer ${label}`}
      onClick={() => start(async () => {
        await (kind === 'activity' ? deleteActivity(id) : deleteWeight(id))
        router.refresh()
      })}
      className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl text-muted-foreground hover:bg-muted disabled:opacity-40">
      <Trash2 className="h-4 w-4" />
    </button>
  )
}
