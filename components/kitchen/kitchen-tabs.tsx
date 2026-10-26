import Link from 'next/link'
import { Refrigerator, CalendarDays, ShoppingBasket } from 'lucide-react'

const TABS = [
  { href: '/frigo', label: 'Frigo', Icon: Refrigerator },
  { href: '/semaine', label: 'Semaine', Icon: CalendarDays },
  { href: '/courses', label: 'Courses', Icon: ShoppingBasket },
] as const

export function KitchenTabs({ active }: { active: '/frigo' | '/semaine' | '/courses' }) {
  return (
    <nav aria-label="Cuisine" className="grid grid-cols-3 gap-1 rounded-2xl bg-muted p-1">
      {TABS.map(({ href, label, Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={active === href ? 'page' : undefined}
          className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold transition-colors ${
            active === href ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
          }`}
        >
          <Icon className="h-4 w-4" /> {label}
        </Link>
      ))}
    </nav>
  )
}
