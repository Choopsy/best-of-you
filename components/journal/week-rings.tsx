import Link from 'next/link'
import { Ring } from './ring'

export interface WeekDay {
  date: string
  kcal: number
}

const letter = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', { weekday: 'narrow', timeZone: 'UTC' }).format(new Date(iso + 'T12:00:00Z'))

/** Un rond par jour (7 derniers jours) : la part de l'objectif calorique atteinte. */
export function WeekRings({ days, target, today }: { days: WeekDay[]; target: number | null; today: string }) {
  return (
    <nav aria-label="Ma semaine" className="flex justify-between rounded-3xl bg-card px-2.5 py-3 shadow-[0_1px_0_var(--border)]">
      {days.map((d) => {
        const isToday = d.date === today
        const ratio = target ? d.kcal / target : 0
        const color = ratio >= 0.9 && ratio <= 1.1 ? 'var(--sage)' : ratio > 1.1 ? 'var(--honey)' : 'var(--terracotta)'
        const num = Number(d.date.slice(8, 10))
        return (
          <Link
            key={d.date}
            href={`/journal?date=${d.date}`}
            className="flex flex-col items-center gap-1.5 w-10"
            aria-current={isToday ? 'date' : undefined}
          >
            <span className={`text-xs font-bold ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>{letter(d.date)}</span>
            <Ring value={d.kcal} max={target ?? 1} size={36} stroke={4} color={color}
              label={`${num} : ${Math.round(d.kcal)} kcal`}>
              <span className={`flex h-[26px] w-[26px] items-center justify-center rounded-full text-[11px] font-bold ${isToday ? 'bg-secondary text-secondary-foreground' : ''}`}>{num}</span>
            </Ring>
          </Link>
        )
      })}
    </nav>
  )
}
