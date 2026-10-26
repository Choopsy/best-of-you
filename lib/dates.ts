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

/** Lundi de la semaine qui contient cette date */
export function weekStart(iso: string): string {
  const d = new Date(iso + 'T12:00:00Z')
  const dow = (d.getUTCDay() + 6) % 7 // lundi = 0
  return shiftDate(iso, -dow)
}

/** Nombre de jours entre deux dates (b − a) */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 86400000)
}

export function formatShortFr(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
    .format(new Date(iso + 'T12:00:00Z'))
}
