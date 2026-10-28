'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { canUseGrams, canUsePortions, eatenGrams, nutrientFactor, type PortionInfo, type QtyUnit } from '@/lib/portions'

interface Props {
  id: string
  portion: PortionInfo
  unit: QtyUnit
  onUnit: (u: QtyUnit) => void
  value: string
  onValue: (v: string) => void
  /** kcal des valeurs enregistrées (pour 100 g ou pour 1 portion) */
  kcal: number | null
}

export const parseQty = (v: string) => Number(v.replace(',', '.')) || 0

/** Valeur proposée quand on change d'unité */
export const defaultQty = (unit: QtyUnit) => (unit === 'portion' ? '1' : '100')

/** Quantité mangée, en grammes ou en portions selon ce que l'aliment permet. */
export function QuantityField({ id, portion, unit, onUnit, value, onValue, kcal }: Props) {
  const both = canUseGrams(portion) && canUsePortions(portion)
  const amount = parseQty(value)
  const factor = nutrientFactor(portion, unit, amount)
  const grams = unit === 'portion' ? eatenGrams(portion, unit, amount) : null
  const setUnit = (u: QtyUnit) => { if (u !== unit) { onUnit(u); onValue(defaultQty(u)) } }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{unit === 'portion' ? 'Portions' : 'Quantité (g)'}</Label>
        {both && (
          <div role="radiogroup" aria-label="Unité" className="flex rounded-full bg-muted p-0.5 text-xs font-bold">
            {(['portion', 'g'] as const).map((u) => (
              <button key={u} type="button" role="radio" aria-checked={unit === u} onClick={() => setUnit(u)}
                className={`min-h-8 rounded-full px-3 transition-colors ${unit === u ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}>
                {u === 'portion' ? 'Portions' : 'Grammes'}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        <Input id={id} type="number" inputMode="decimal" className="w-32"
          min={unit === 'portion' ? 0.5 : 1} max={unit === 'portion' ? 20 : 5000} step={unit === 'portion' ? 0.5 : 1}
          value={value} onChange={(e) => onValue(e.target.value)} />
        <p className="text-sm text-muted-foreground tabular-nums">
          {grams != null && <>{grams.toLocaleString('fr-FR')} g · </>}
          {kcal != null && factor != null && <>≈ {Math.round(kcal * factor).toLocaleString('fr-FR')} kcal</>}
        </p>
      </div>
    </div>
  )
}
