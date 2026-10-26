import Link from 'next/link'
import { Target } from 'lucide-react'
import type { DailyTargets } from '@/lib/targets'
import type { Nutrients } from '@/lib/nutrition'
import { Ring, ringColor } from './ring'

const f = (v: number) => Math.round(v).toLocaleString('fr-FR')
const pct = (v: number, t: number) => (t > 0 ? Math.round((v / t) * 100) : 0)

function MacroRing({ label, value, target, unit, color }: { label: string; value: number; target: number; unit: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 min-w-0">
      <Ring value={value} max={target} size={68} stroke={8} color={color} label={`${label} : ${f(value)} sur ${f(target)} ${unit}`}>
        <span className="text-[13px] font-bold tabular-nums">{pct(value, target)}%</span>
      </Ring>
      <span className="text-[13px] font-bold">{label}</span>
      <span className="text-xs text-muted-foreground tabular-nums">{f(value)} / {f(target)} {unit}</span>
    </div>
  )
}

function LimitRing({ label, value, target, unit, kind }: { label: string; value: number; target: number; unit: string; kind: 'min' | 'max' }) {
  const word = kind === 'max' ? 'max' : 'min'
  return (
    <div className="flex flex-col items-center gap-1 min-w-0">
      <Ring value={value} max={target} size={52} stroke={6} color={ringColor(kind, value, target)}
        label={`${label} : ${f(value)} ${unit}, repère ${word} ${f(target)} ${unit}`}>
        <span className="text-[11px] font-bold tabular-nums">{f(value)}</span>
      </Ring>
      <span className="text-xs font-bold text-center leading-tight">{label}</span>
      <span className="text-[11px] text-muted-foreground tabular-nums">{word} {f(target)} {unit}</span>
    </div>
  )
}

export function DaySummary({ totals, targets, compact = false }: { totals: Nutrients; targets: DailyTargets | null; compact?: boolean }) {
  if (!targets) {
    return (
      <div className="rounded-3xl bg-card p-5 space-y-4 shadow-[0_1px_0_var(--border)]">
        <div className="flex items-baseline justify-between">
          <p className="text-sm text-muted-foreground">Consommé aujourd&apos;hui</p>
          <p className="font-heading text-3xl tabular-nums">{f(totals.energy_kcal)} kcal</p>
        </div>
        <Link href="/profile/health" className="flex items-center gap-2 rounded-2xl bg-secondary px-4 py-3 text-sm font-bold text-secondary-foreground">
          <Target className="h-4 w-4" />
          Complète ton profil santé pour voir tes objectifs du jour
        </Link>
      </div>
    )
  }

  const left = targets.energyKcal - totals.energy_kcal
  return (
    <div className="space-y-3">
      <div className="rounded-3xl bg-card px-5 py-6 flex flex-col items-center gap-5 shadow-[0_1px_0_var(--border)]">
        <Ring value={totals.energy_kcal} max={targets.energyKcal} size={196} stroke={16}
          color={ringColor('goal', totals.energy_kcal, targets.energyKcal)}
          label={`Énergie : ${f(totals.energy_kcal)} sur ${f(targets.energyKcal)} kilocalories`}>
          <span className="font-heading text-[40px] leading-none tabular-nums">{f(totals.energy_kcal)}</span>
          <span className="text-[13px] text-muted-foreground mt-1">sur {f(targets.energyKcal)} kcal</span>
          <span className="mt-2 rounded-full bg-secondary px-3 py-0.5 text-xs font-bold text-secondary-foreground tabular-nums">
            {left >= 0 ? `reste ${f(left)}` : `+${f(-left)} kcal`}
          </span>
        </Ring>
        <div className="grid w-full grid-cols-3 gap-2">
          <MacroRing label="Protéines" value={totals.proteins_g} target={targets.proteinsG} unit="g" color="var(--terracotta)" />
          <MacroRing label="Glucides" value={totals.carbs_g} target={targets.carbsG} unit="g" color="var(--honey)" />
          <MacroRing label="Lipides" value={totals.fat_g} target={targets.fatG} unit="g" color="var(--sage)" />
        </div>
      </div>

      {!compact && (
        <div className="rounded-3xl bg-card px-4 py-4 shadow-[0_1px_0_var(--border)]">
          <p className="text-sm font-bold mb-3 px-1">Repères du jour</p>
          <div className="grid grid-cols-4 gap-2">
            <LimitRing label="Fibres" value={totals.fiber_g} target={targets.fiberMinG} unit="g" kind="min" />
            <LimitRing label="Sucres" value={totals.sugars_g} target={targets.sugarsMaxG} unit="g" kind="max" />
            <LimitRing label="Gras saturés" value={totals.saturated_fat_g} target={targets.saturatedFatMaxG} unit="g" kind="max" />
            <LimitRing label="Sel" value={totals.salt_g} target={targets.saltMaxG} unit="g" kind="max" />
          </div>
        </div>
      )}
    </div>
  )
}
