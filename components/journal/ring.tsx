/**
 * Rond de progression (SVG, bouts arrondis). Couleurs = variables CSS du thème,
 * donc il s'adapte tout seul au mode clair / sombre.
 */
interface Props {
  value: number
  max: number
  size?: number
  stroke?: number
  color?: string
  track?: string
  /** Texte lu par les lecteurs d'écran */
  label: string
  children?: React.ReactNode
}

export function Ring({ value, max, size = 64, stroke = 8, color = 'var(--terracotta)', track = 'var(--track)', label, children }: Props) {
  const pct = max > 0 ? Math.max(0, Math.min(value / max, 1)) : 0
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        {pct > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${c * pct} ${c}`}
            style={{ transition: 'stroke-dasharray 600ms ease' }}
          />
        )}
      </svg>
      {children && <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>}
    </div>
  )
}

/** Couleur d'un rond selon le type de repère */
export function ringColor(kind: 'goal' | 'min' | 'max', value: number, target: number) {
  const pct = target > 0 ? value / target : 0
  if (kind === 'max') return pct > 1 ? 'var(--destructive)' : pct > 0.85 ? 'var(--honey)' : 'var(--sage)'
  if (kind === 'min') return pct >= 1 ? 'var(--sage)' : 'var(--honey)'
  return pct > 1.15 ? 'var(--honey)' : 'var(--terracotta)'
}
