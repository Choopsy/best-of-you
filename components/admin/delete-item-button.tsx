'use client'

import { useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  action: () => Promise<any>
  label: string
}

export function DeleteItemButton({ action, label }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!confirm(`Supprimer "${label}" ? Cette action est irréversible.`)) return
    startTransition(async () => { await action() })
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
      onClick={handleClick}
      disabled={isPending}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  )
}
