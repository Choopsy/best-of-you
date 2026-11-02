import Link from 'next/link'
import { CalendarDays } from 'lucide-react'
import { Ring } from './ring'

export interface WeekDay {
  date: string
  kcal: number
}

const letter = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', { weekday: 'narrow', timeZone: 'UTC' }).format(new Date(iso + 'T12:00:00Z'))

/** Numéro de semaine ISO (lundi = début de semaine, comme les calendriers français) */
function isoWeek(iso: string) {
  const d = new Date(iso + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7))
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4))
  return 1 + Math.round(((d.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7)
}

/** Un rond par jour (7 derniers jours) : la part de l'objectif calorique atteinte. */
export function WeekRings({ days, target, today }: { days: WeekDay[]; target: number | null; today: string }) {
  return (
    <nav aria-label="Ma semaine" className="rounded-3xl bg-secondary px-3 pt-4 pb-3">
      <div className="mb-3 flex items-center justify-between px-1.5">
        <p className="flex items-center gap-2 font-heading text-lg font-semibold">
          <CalendarDays className="h-5 w-5 text-terracotta" aria-hidden="true" /> Ma semaine
        </p>
        <span className="text-xs font-semibold text-muted-foreground">Semaine {isoWeek(today)}</span>
      </div>
      <div className="flex justify-between">
        {days.map((d) => {
          const isToday = d.date === today
          const ratio = target ? d.kcal / target : 0
          const color = ratio >= 0.9 && ratio <= 1.1 ? 'var(--sage)' : ratio > 1.1 ? 'var(--honey)' : 'var(--terracotta)'
          const num = Number(d.date.slice(8, 10))
          return (
            <Link
              key={d.date}
              href={`/journal?date=${d.date}`}
              className="flex w-11 flex-col items-center gap-1.5"
              aria-current={isToday ? 'date' : undefined}
            >
              <span className={`text-xs font-semibold ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>{letter(d.date)}</span>
              <Ring value={d.kcal} max={target ?? 1} size={40} stroke={4} color={color}
                label={`${num} : ${Math.round(d.kcal)} kcal`}>
                <span className={`flex h-[30px] w-[30px] items-center justify-center rounded-full text-xs font-bold tabular-nums ${isToday ? 'bg-primary text-primary-foreground' : 'bg-card'}`}>{num}</span>
              </Ring>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
