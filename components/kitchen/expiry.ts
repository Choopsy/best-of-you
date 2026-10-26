import { daysBetween } from '@/lib/dates'

export type ExpiryLevel = 'expired' | 'urgent' | 'soon' | 'ok' | 'none'

export function expiryInfo(expires_on: string | null, today: string): { level: ExpiryLevel; label: string } {
  if (!expires_on) return { level: 'none', label: 'Sans date' }
  const d = daysBetween(today, expires_on)
  if (d < 0) return { level: 'expired', label: d === -1 ? 'Périmé hier' : `Périmé depuis ${-d} j` }
  if (d === 0) return { level: 'urgent', label: 'Aujourd\'hui' }
  if (d === 1) return { level: 'urgent', label: 'Demain' }
  if (d === 2) return { level: 'urgent', label: 'Dans 2 jours' }
  if (d <= 7) return { level: 'soon', label: `Dans ${d} jours` }
  return {
    level: 'ok',
    label: new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(expires_on + 'T12:00:00Z')),
  }
}

export const EXPIRY_STYLE: Record<ExpiryLevel, string> = {
  expired: 'bg-destructive/15 text-destructive',
  urgent: 'bg-honey/25 text-foreground',
  soon: 'bg-secondary text-secondary-foreground',
  ok: 'bg-sage/15 text-foreground',
  none: 'bg-muted text-muted-foreground',
}
