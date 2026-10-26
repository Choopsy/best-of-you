/** Dates au format AAAA-MM-JJ, dans le fuseau de l'utilisateur (Europe/Paris par défaut). */
export const TIME_ZONE = 'Europe/Paris'

export function todayISO(tz: string = TIME_ZONE): string {
  // en-CA formate en AAAA-MM-JJ
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

export function isISODate(s: string | null | undefined): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + 'T00:00:00Z'))
}

export function shiftDate(iso: string, days: number): string {
  const d = new Date(iso + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function formatDateFr(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
    .format(new Date(iso + 'T12:00:00Z'))
}
