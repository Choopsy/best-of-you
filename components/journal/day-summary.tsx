import Link from 'next/link'
import { Target } from 'lucide-react'
import type { DailyTargets } from '@/lib/targets'
import type { Nutrients } from '@/lib/nutrition'

type Kind = 'goal' | 'min' | 'max'

const f = (v: number) => Math.round(v).toLocaleString('fr-FR')

function Bar({ label, value, target, unit, kind, range }: {
  label: string; value: number; target: number; unit: string; kind: Kind; range?: [number, number]
}) {
  const pct = target > 0 ? (value / target) * 100 : 0
  let color = 'bg-primary'
  if (kind === 'max') color = pct > 100 ? 'bg-red-500' : pct > 85 ? 'bg-amber-500' : 'bg-emerald-500'
  if (kind === 'min') color = pct >= 100 ? 'bg-emerald-500' : 'bg-primary'
  if (kind === 'goal' && pct > 115) color = 'bg-amber-500'
  const prefix = kind === 'max' ? 'max ' : kind === 'min' ? 'min ' : ''
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          <span className="text-foreground font-medium">{f(value)}</span> / {prefix}{f(target)} {unit}
          {range && <span className="hidden sm:inline"> (repère {f(range[0])}–{f(range[1])})</span>}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  )
}

export function DaySummary({ totals, targets, compact = false }: { totals: Nutrients; targets: DailyTargets | null; compact?: boolean }) {
  if (!targets) {
    return (
      <div className="rounded-2xl border bg-card p-4 space-y-3">
        <div className="flex items-baseline justify-between">
          <p className="text-sm text-muted-foreground">Consommé aujourd&apos;hui</p>
          <p className="text-2xl font-bold tabular-nums">{f(totals.energy_kcal)} kcal</p>
        </div>
        <Link href="/profile/health" className="flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-2.5 text-sm text-primary font-medium">
          <Target className="h-4 w-4" />
          Complète ton profil santé pour voir tes objectifs du jour
        </Link>
      </div>
    )
  }

  const left = targets.energyKcal - totals.energy_kcal
  const pct = Math.min(100, (totals.energy_kcal / targets.energyKcal) * 100)

  return (
    <div className="rounded-2xl border bg-card p-4 space-y-4">
      <div className="space-y-2">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Énergie</p>
            <p className="text-2xl font-bold tabular-nums leading-tight">
              {f(totals.energy_kcal)} <span className="text-sm font-normal text-muted-foreground">/ {f(targets.energyKcal)} kcal</span>
            </p>
          </div>
          <p className={`text-sm font-medium tabular-nums ${left < 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
            {left >= 0 ? `reste ${f(left)} kcal` : `+${f(-left)} kcal`}
          </p>
        </div>
        <div className="h-3 rounded-full bg-muted overflow-hidden">
          <div className={`h-full rounded-full ${left < -0.1 * targets.energyKcal ? 'bg-amber-500' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Bar label="Protéines" value={totals.proteins_g} target={targets.proteinsG} unit="g" kind="goal" />
        <Bar label="Glucides" value={totals.carbs_g} target={targets.carbsG} unit="g" kind="goal" range={targets.ranges.carbsG} />
        <Bar label="Lipides" value={totals.fat_g} target={targets.fatG} unit="g" kind="goal" range={targets.ranges.fatG} />
      </div>

      {!compact && (
        <div className="grid gap-3 sm:grid-cols-2 pt-1 border-t">
          <div className="pt-3"><Bar label="Fibres" value={totals.fiber_g} target={targets.fiberMinG} unit="g" kind="min" /></div>
          <div className="sm:pt-3"><Bar label="Sucres" value={totals.sugars_g} target={targets.sugarsMaxG} unit="g" kind="max" /></div>
          <Bar label="Acides gras saturés" value={totals.saturated_fat_g} target={targets.saturatedFatMaxG} unit="g" kind="max" />
          <Bar label="Sel" value={totals.salt_g} target={targets.saltMaxG} unit="g" kind="max" />
        </div>
      )}
    </div>
  )
}
