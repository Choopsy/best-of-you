'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Copy } from 'lucide-react'
import { copyMeal } from '@/actions/journal'
import type { Meal } from '@/lib/types'

/** « Comme hier » : recopie le même repas de la veille en un geste. */
export function CopyMeal({ from, to, meal, summary }: { from: string; to: string; meal: Meal; summary: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  return (
    <button type="button" disabled={pending}
      onClick={() => start(async () => { await copyMeal({ from, to, meal }); router.refresh() })}
      className="mt-1 flex w-full min-h-11 items-center gap-2 rounded-2xl border border-dashed border-input px-3 py-2 text-left text-sm">
      <Copy className="h-4 w-4 shrink-0 text-primary" />
      <span className="min-w-0 flex-1">
        <span className="font-bold">{pending ? 'Ajout…' : 'Comme hier'}</span>
        <span className="block truncate text-xs text-muted-foreground">{summary}</span>
      </span>
    </button>
  )
}
