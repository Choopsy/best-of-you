'use client'

import { useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { IngredientGroup } from '@/lib/types'

function fmt(value: number): string {
  const n = Math.round(value * 10) / 10
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 1 })
}

interface Props {
  baseServings: number
  groups: IngredientGroup[]
}

export function ServingAdjuster({ baseServings, groups }: Props) {
  const [servings, setServings] = useState(baseServings)
  const ratio = servings / baseServings

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Ingrédients</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => setServings((s) => Math.max(1, s - 1))}
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <span className="text-sm w-24 text-center tabular-nums">
            {servings} portion{servings > 1 ? 's' : ''}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => setServings((s) => s + 1)}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {groups.map((group) => (
          <div key={group.id} className="rounded-3xl bg-card px-4 py-1 shadow-[0_1px_0_var(--border)]">
            {group.name && (
              <p className="pt-3 pb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">{group.name}</p>
            )}
            <ul className="divide-y">
              {group.ingredients.map((ing) => {
                const qty = ing.amount != null ? fmt(ing.amount * ratio) : null
                const label = [qty, ing.unit].filter(Boolean).join(' ')
                return (
                  <li key={ing.id} className="flex items-baseline justify-between gap-3 py-2.5 text-[15px]">
                    <span className="min-w-0">{ing.name}</span>
                    {label && <span className="shrink-0 text-muted-foreground tabular-nums">{label}</span>}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
