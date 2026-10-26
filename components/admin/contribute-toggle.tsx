'use client'

import { toggleContribute } from '@/actions/admin'

interface Props {
  userId: string
  canContribute: boolean
}

export function ContributeToggle({ userId, canContribute }: Props) {
  return (
    <form action={toggleContribute.bind(null, userId, canContribute)}>
      <button
        type="submit"
        className={`text-xs px-2 py-0.5 rounded-full font-medium border transition-colors ${
          canContribute
            ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
            : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
        }`}
      >
        {canContribute ? 'Contribution : oui' : 'Contribution : non'}
      </button>
    </form>
  )
}
