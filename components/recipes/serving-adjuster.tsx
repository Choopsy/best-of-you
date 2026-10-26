'use client'

import { useState } from 'react'
import { Minus, Plus, Utensils } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
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

      <div className="space-y-4">
        {groups.map((group, gi) => (
          <div key={group.id}>
            {gi > 0 && <Separator className="mb-4" />}
            {group.name && (
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                {group.name}
              </p>
            )}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {group.ingredients.map((ing) => {
                const qty = ing.amount != null ? fmt(ing.amount * ratio) : null
                const label = [qty, ing.unit].filter(Boolean).join(' ')
                return (
                  <div
                    key={ing.id}
                    className="flex flex-col items-center gap-1.5 rounded-xl border bg-card p-2 text-center"
                  >
                    <div className="w-full aspect-square rounded-lg bg-muted flex items-center justify-center">
                      <Utensils className="h-5 w-5 text-muted-foreground/30" />
                    </div>
                    <p className="text-xs font-medium leading-tight line-clamp-2 w-full">
                      {ing.name}
                    </p>
                    {label && (
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {label}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
