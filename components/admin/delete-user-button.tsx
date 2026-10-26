'use client'

import { Trash2 } from 'lucide-react'
import { deleteUser } from '@/actions/admin'
import { Button } from '@/components/ui/button'

interface Props {
  userId: string
  name: string
}

export function DeleteUserButton({ userId, name }: Props) {
  const action = deleteUser.bind(null, userId)

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(`Supprimer le compte de ${name} ? Cette action est irréversible.`)) {
          e.preventDefault()
        }
      }}
    >
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </form>
  )
}
