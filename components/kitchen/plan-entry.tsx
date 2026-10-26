'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'
import { removeFromPlan } from '@/actions/plan'

export function PlanEntry({ id, recipeId, title, meal, servings }: { id: string; recipeId: string; title: string; meal: string; servings: number }) {
  const [pending, start] = useTransition()
  return (
    <li className={`flex items-center gap-3 py-2 ${pending ? 'opacity-40' : ''}`}>
      <Link href={`/recipes/${recipeId}?from=/semaine`} className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-bold">{title}</p>
        <p className="text-xs text-muted-foreground">{meal} · {servings.toLocaleString('fr-FR')} portion{servings > 1 ? 's' : ''}</p>
      </Link>
      <button type="button" aria-label={`Retirer ${title}`} disabled={pending}
        onClick={() => start(async () => { await removeFromPlan(id) })}
        className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-destructive">
        <X className="h-4 w-4" />
      </button>
    </li>
  )
}
