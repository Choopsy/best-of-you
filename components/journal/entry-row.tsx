'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { Trash2 } from 'lucide-react'
import { deleteFoodLog } from '@/actions/journal'
import type { FoodLog } from '@/lib/types'

const f = (v: number) => Math.round(Number(v)).toLocaleString('fr-FR')

export function EntryRow({ entry }: { entry: FoodLog }) {
  const [pending, start] = useTransition()
  const qty = entry.servings != null
    ? `${Number(entry.servings).toLocaleString('fr-FR')} portion${Number(entry.servings) > 1 ? 's' : ''}${entry.grams != null ? ` (${f(entry.grams)} g)` : ''}`
    : entry.grams != null ? `${f(entry.grams)} g` : ''

  const title = entry.recipe_id
    ? <Link href={`/recipes/${entry.recipe_id}`} className="hover:underline underline-offset-2">{entry.label}</Link>
    : entry.label

  return (
    <li className={`flex items-center gap-3 py-2 ${pending ? 'opacity-40' : ''}`}>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{title}</p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {qty} · P {f(entry.proteins_g)} g · G {f(entry.carbs_g)} g · L {f(entry.fat_g)} g
        </p>
      </div>
      <p className="text-sm font-semibold tabular-nums shrink-0">{f(entry.energy_kcal)} kcal</p>
      <button
        type="button"
        aria-label="Supprimer"
        disabled={pending}
        onClick={() => start(async () => { await deleteFoodLog(entry.id) })}
        className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </li>
  )
}
