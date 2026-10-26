'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { NUTRIENT_KEYS, NUTRIENT_LABELS, type NutrientKey, type RecipeNutrition as Nutrition } from '@/lib/nutrition'

interface Props {
  nutrition: Nutrition
  /** Objectifs du jour de l'utilisateur, pour afficher la part couverte par une portion */
  goals?: Partial<Record<NutrientKey, number>> | null
}

const SUB: NutrientKey[] = ['sugars_g', 'saturated_fat_g']
const fmt = (v: number) => v.toLocaleString('fr-FR', { maximumFractionDigits: 1 })

export function RecipeNutrition({ nutrition, goals }: Props) {
  const [open, setOpen] = useState(true)
  const n = nutrition.perServing

  return (
    <div className="rounded-2xl border overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors"
      >
        <span>
          Nutrition par portion · <span className="tabular-nums">{fmt(n.energy_kcal)} kcal</span>
          {' '}· <span className="tabular-nums">{fmt(n.proteins_g)} g</span> de protéines
        </span>
        {open
          ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
          : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>

      {open && (
        <div className="border-t">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground">
                <th className="px-4 py-1.5 text-left font-normal" />
                <th className="px-4 py-1.5 text-right font-normal">Portion</th>
                {goals && <th className="px-4 py-1.5 text-right font-normal">du repère du jour</th>}
              </tr>
            </thead>
            <tbody>
              {NUTRIENT_KEYS.map((key) => {
                const sub = SUB.includes(key)
                const goal = goals?.[key]
                return (
                  <tr key={key} className="border-t">
                    <td className={`px-4 py-2 ${sub ? 'pl-8 text-muted-foreground text-xs' : key === 'energy_kcal' ? 'font-semibold' : ''}`}>
                      {NUTRIENT_LABELS[key].label}
                    </td>
                    <td className={`px-4 py-2 text-right tabular-nums ${sub ? 'text-muted-foreground text-xs' : ''}`}>
                      {fmt(n[key])} {NUTRIENT_LABELS[key].unit}
                    </td>
                    {goals && (
                      <td className="px-4 py-2 text-right tabular-nums text-xs text-muted-foreground">
                        {goal ? `${Math.round((n[key] / goal) * 100)} %` : ''}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="px-4 py-2 text-xs text-muted-foreground border-t space-y-1">
            <p>
              Calculé sur {nutrition.counted} ingrédient{nutrition.counted > 1 ? 's' : ''} sur {nutrition.total} (table Ciqual, ANSES)
              {nutrition.approximate && ' · certaines quantités (cuillères, volumes) sont converties de façon approximative'}.
            </p>
            {nutrition.missing.length > 0 && (
              <p>
                Non comptés :{' '}
                {nutrition.missing.map((m) => `${m.name} (${m.reason === 'not_linked' ? 'non lié à Ciqual' : 'quantité sans poids'})`).join(', ')}.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
