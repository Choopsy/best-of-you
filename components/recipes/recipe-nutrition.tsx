'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { NutritionSummary } from '@/lib/nutrition'

interface Props {
  nutrition: NutritionSummary
}

function fmt(v: number) {
  return v.toLocaleString('fr-FR', { maximumFractionDigits: 1 })
}

type Row = { label: string; key: keyof NutritionSummary; unit: string; bold?: boolean; sub?: boolean }

const ROWS: Row[] = [
  { label: 'Énergie',             key: 'energy_kcal',     unit: 'kcal', bold: true },
  { label: 'Protéines',           key: 'proteins_g',      unit: 'g' },
  { label: 'Glucides',            key: 'carbs_g',         unit: 'g' },
  { label: 'dont sucres',         key: 'sugars_g',        unit: 'g', sub: true },
  { label: 'Lipides',             key: 'fat_g',           unit: 'g' },
  { label: 'dont saturés',        key: 'saturated_fat_g', unit: 'g', sub: true },
  { label: 'Fibres',              key: 'fiber_g',         unit: 'g' },
  { label: 'Sel',                 key: 'salt_g',          unit: 'g' },
]

export function RecipeNutrition({ nutrition }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-2xl border overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors"
      >
        <span>Infos nutritionnelles · par portion</span>
        {open
          ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
          : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>

      {open && (
        <div className="border-t">
          <table className="w-full text-sm">
            <tbody>
              {ROWS.map(({ label, key, unit, bold, sub }) => (
                <tr key={key} className="border-b last:border-0">
                  <td className={`px-4 py-2 ${sub ? 'pl-8 text-muted-foreground text-xs' : bold ? 'font-semibold' : ''}`}>
                    {label}
                  </td>
                  <td className={`px-4 py-2 text-right tabular-nums ${bold ? 'font-semibold' : ''} ${sub ? 'text-muted-foreground text-xs' : ''}`}>
                    {fmt(nutrition[key])} {unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-4 py-2 text-xs text-muted-foreground border-t">
            {nutrition.matched === nutrition.total
              ? `Basé sur ${nutrition.total} ingrédient${nutrition.total > 1 ? 's' : ''}`
              : `${nutrition.matched} ingrédient${nutrition.matched > 1 ? 's' : ''} reconnu${nutrition.matched > 1 ? 's' : ''} sur ${nutrition.total} · valeurs approximatives`}
          </p>
        </div>
      )}
    </div>
  )
}
