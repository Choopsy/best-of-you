'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { NUTRIENT_KEYS, NUTRIENT_LABELS, type NutrientKey, type RecipeNutrition as Nutrition } from '@/lib/nutrition'
import { Ring } from '@/components/journal/ring'

interface Props {
  nutrition: Nutrition
  /** Objectifs du jour de l'utilisateur, pour afficher la part couverte par une portion */
  goals?: Partial<Record<NutrientKey, number>> | null
}

const SUB: NutrientKey[] = ['sugars_g', 'saturated_fat_g']
const fmt = (v: number) => v.toLocaleString('fr-FR', { maximumFractionDigits: 1 })

const RINGS: { key: NutrientKey; label: string; color: string }[] = [
  { key: 'proteins_g', label: 'Protéines', color: 'var(--terracotta)' },
  { key: 'carbs_g', label: 'Glucides', color: 'var(--honey)' },
  { key: 'fat_g', label: 'Lipides', color: 'var(--sage)' },
  { key: 'fiber_g', label: 'Fibres', color: 'var(--chart-4)' },
]

export function RecipeNutrition({ nutrition, goals }: Props) {
  const [open, setOpen] = useState(false)
  const n = nutrition.perServing

  return (
    <div className="rounded-3xl bg-card shadow-[0_1px_0_var(--border)] overflow-hidden">
      <div className="px-4 pt-4 pb-3 space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-bold">Par portion</span>
          <span className="font-heading text-2xl tabular-nums">{fmt(n.energy_kcal)} kcal</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {RINGS.map(({ key, label, color }) => {
            const goal = goals?.[key]
            return (
              <div key={key} className="flex flex-col items-center gap-1">
                <Ring value={n[key]} max={goal ?? Math.max(n[key], 1)} size={54} stroke={6} color={color}
                  label={`${label} : ${fmt(n[key])} g${goal ? `, ${Math.round((n[key] / goal) * 100)} % de ton objectif du jour` : ''}`}>
                  <span className="text-[12px] font-bold tabular-nums">{fmt(n[key])} g</span>
                </Ring>
                <span className="text-[11px] text-muted-foreground">{label}</span>
              </div>
            )
          })}
        </div>
        {goals && (
          <p className="text-xs text-muted-foreground">Le rond montre la part de ton objectif du jour couverte par une portion.</p>
        )}
      </div>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between border-t px-4 py-3 text-sm font-semibold hover:bg-muted/50 transition-colors"
      >
        <span>Détail nutritionnel</span>
        {open
          ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
          : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>

      {open && (
        <div className="border-t">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground">
                <th className="px-4 py-1.5 text-left font-normal"><span className="sr-only">Nutriment</span></th>
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
