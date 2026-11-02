import Link from 'next/link'
import { Dumbbell, Leaf, Target, Utensils } from 'lucide-react'
import type { DailyTargets } from '@/lib/targets'
import type { Nutrients } from '@/lib/nutrition'
import { Ring, ringColor } from './ring'

const f = (v: number) => Math.round(v).toLocaleString('fr-FR')
const pct = (v: number, t: number) => (t > 0 ? Math.round((v / t) * 100) : 0)

/** Un nutriment dans le bac des macros : petit rond coloré, nom, valeur sur objectif */
function MacroRing({ label, value, target, unit, color }: { label: string; value: number; target: number; unit: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1 min-w-0">
      <Ring value={value} max={target} size={56} stroke={6} color={color} label={`${label} : ${f(value)} sur ${f(target)} ${unit}`}>
        <span className="text-xs font-bold tabular-nums">{pct(value, target)}%</span>
      </Ring>
      <span className="mt-0.5 text-xs font-semibold">{label}</span>
      <span className="text-[11px] text-muted-foreground tabular-nums">{f(value)} / {f(target)} {unit}</span>
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
      <span className="text-xs font-semibold text-center leading-tight">{label}</span>
      <span className="text-[11px] text-muted-foreground tabular-nums">{word} {f(target)} {unit}</span>
    </div>
  )
}

/**
 * Résumé nutritionnel du jour. Le rond d'énergie reste l'élément principal ;
 * les macros (et les fibres) sont rangées dans un bac en retrait, chacune avec sa couleur.
 * `compact` (accueil) : pas de « Repères du jour ».
 */
export function DaySummary({ totals, targets, compact = false }: { totals: Nutrients; targets: DailyTargets | null; compact?: boolean }) {
  if (!targets) {
    return (
      <div className="rounded-3xl bg-card p-5 space-y-4 shadow-card">
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
  const ratio = targets.energyKcal > 0 ? totals.energy_kcal / targets.energyKcal : 0
  // Seulement un encouragement, jamais un reproche : rien n'est affiché hors de la zone d'équilibre
  const balanced = ratio >= 0.9 && ratio <= 1.1
  return (
    <div className="space-y-3">
      <div className="rounded-3xl bg-card p-5 flex flex-col gap-5 shadow-card">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg">
            <Utensils className="h-5 w-5 text-terracotta" aria-hidden="true" />
            Nutrition du jour
          </h2>
          {balanced && <span className="rounded-full bg-sage/15 px-3 py-1 text-xs font-semibold">En équilibre</span>}
        </div>

        <div className="flex flex-col items-center gap-3">
          <Ring value={totals.energy_kcal} max={targets.energyKcal} size={188} stroke={14}
            color={ringColor('goal', totals.energy_kcal, targets.energyKcal)}
            label={`Énergie : ${f(totals.energy_kcal)} sur ${f(targets.energyKcal)} kilocalories`}>
            <span className="font-heading text-[40px] font-bold leading-none tracking-tight tabular-nums">{f(totals.energy_kcal)}</span>
            <span className="text-[13px] text-muted-foreground mt-1">sur {f(targets.energyKcal)} kcal</span>
            <span className="mt-2 rounded-full bg-accent px-3 py-0.5 text-xs font-semibold text-accent-foreground tabular-nums">
              {left >= 0 ? `reste ${f(left)} kcal` : `+${f(-left)} kcal`}
            </span>
          </Ring>
          {targets.exerciseKcal > 0 && (
            <Link href="/forme" className="flex min-h-9 items-center gap-1.5 rounded-full bg-sage/15 px-3 py-1 text-xs font-semibold">
              <Dumbbell className="h-3.5 w-3.5 text-sage" /> dont +{f(targets.exerciseKcal)} kcal grâce au sport
            </Link>
          )}
          {!compact && left > 0 && (
            <p className="flex items-center gap-1.5 text-sm text-sage">
              <Leaf className="h-4 w-4" aria-hidden="true" /> Il te reste {f(left)} kcal pour la journée
            </p>
          )}
        </div>

        <div className="grid grid-cols-4 gap-1 rounded-2xl border border-border bg-muted px-2 py-4">
          <MacroRing label="Protéines" value={totals.proteins_g} target={targets.proteinsG} unit="g" color="var(--coral)" />
          <MacroRing label="Glucides" value={totals.carbs_g} target={targets.carbsG} unit="g" color="var(--honey)" />
          <MacroRing label="Lipides" value={totals.fat_g} target={targets.fatG} unit="g" color="var(--sage)" />
          <MacroRing label="Fibres" value={totals.fiber_g} target={targets.fiberMinG} unit="g" color="var(--teal)" />
        </div>
      </div>

      {!compact && (
        <div className="rounded-3xl bg-card px-4 py-4 shadow-card">
          <h2 className="text-base mb-3 px-1">Repères du jour</h2>
          <div className="grid grid-cols-3 gap-2">
            <LimitRing label="Sucres" value={totals.sugars_g} target={targets.sugarsMaxG} unit="g" kind="max" />
            <LimitRing label="Gras saturés" value={totals.saturated_fat_g} target={targets.saturatedFatMaxG} unit="g" kind="max" />
            <LimitRing label="Sel" value={totals.salt_g} target={targets.saltMaxG} unit="g" kind="max" />
          </div>
        </div>
      )}
    </div>
  )
}
