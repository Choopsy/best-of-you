import type { TrendPoint } from '@/lib/weight'

const W = 320
const H = 170
const PAD = { l: 34, r: 8, t: 10, b: 22 }
const fmt = (v: number) => v.toLocaleString('fr-FR', { maximumFractionDigits: 1 })
const short = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(iso + 'T12:00:00Z'))

/**
 * Courbe de poids : points = pesées, trait = tendance lissée, pointillé = objectif.
 * Couleurs neutres : une pesée qui monte n'est ni un échec ni une alerte.
 */
export function WeightChart({ points, target }: { points: TrendPoint[]; target: number | null }) {
  if (points.length < 2) return null
  const values = points.flatMap((p) => (p.weight != null ? [p.weight, p.trend] : [p.trend]))
  let lo = Math.min(...values)
  let hi = Math.max(...values)
  // L'objectif n'entre dans l'échelle que s'il est proche, sinon la courbe serait écrasée
  const showTarget = target != null && target >= lo - 6 && target <= hi + 6
  if (showTarget) { lo = Math.min(lo, target!); hi = Math.max(hi, target!) }
  const margin = Math.max(0.5, (hi - lo) * 0.12)
  lo = Math.floor((lo - margin) * 2) / 2
  hi = Math.ceil((hi + margin) * 2) / 2

  const x = (i: number) => PAD.l + (i / (points.length - 1)) * (W - PAD.l - PAD.r)
  const y = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b)
  const trendPath = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.trend).toFixed(1)}`).join('')
  const ticks = [lo, (lo + hi) / 2, hi]
  const last = points[points.length - 1]

  return (
    <figure className="space-y-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img"
        aria-label={`Évolution du poids du ${short(points[0].date)} au ${short(last.date)} : tendance ${fmt(last.trend)} kg${target ? `, objectif ${fmt(target)} kg` : ''}`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth={1} />
            <text x={PAD.l - 5} y={y(t) + 3.5} textAnchor="end" fontSize={10} fill="var(--muted-foreground)">{fmt(t)}</text>
          </g>
        ))}
        {showTarget && (
          <line x1={PAD.l} x2={W - PAD.r} y1={y(target!)} y2={y(target!)} stroke="var(--sage)" strokeWidth={1.5} strokeDasharray="5 4" />
        )}
        {points.map((p, i) => p.weight != null && (
          <circle key={p.date} cx={x(i)} cy={y(p.weight)} r={2.6} fill="var(--muted-foreground)" opacity={0.45} />
        ))}
        <path d={trendPath} fill="none" stroke="var(--primary)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(points.length - 1)} cy={y(last.trend)} r={4} fill="var(--primary)" />
        <text x={PAD.l} y={H - 6} fontSize={10} fill="var(--muted-foreground)">{short(points[0].date)}</text>
        <text x={W - PAD.r} y={H - 6} fontSize={10} textAnchor="end" fill="var(--muted-foreground)">{short(last.date)}</text>
      </svg>
      <figcaption className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-primary" /> Tendance</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-muted-foreground/50" /> Pesées</span>
        {showTarget && <span className="flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed border-sage" /> Objectif</span>}
      </figcaption>
    </figure>
  )
}
