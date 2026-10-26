import Link from 'next/link'
import { BookOpen, Refrigerator, CalendarDays, ShoppingBasket } from 'lucide-react'

const TABS = [
  { href: '/recipes', label: 'Recettes', Icon: BookOpen },
  { href: '/frigo', label: 'Frigo', Icon: Refrigerator },
  { href: '/semaine', label: 'Semaine', Icon: CalendarDays },
  { href: '/courses', label: 'Courses', Icon: ShoppingBasket },
] as const

export type KitchenTab = (typeof TABS)[number]['href']

export function KitchenTabs({ active }: { active: KitchenTab }) {
  return (
    <nav aria-label="Cuisine" className="grid grid-cols-4 gap-1 rounded-2xl bg-muted p-1">
      {TABS.map(({ href, label, Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={active === href ? 'page' : undefined}
          className={`flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-xs font-bold transition-colors sm:flex-row sm:gap-1.5 sm:text-sm ${
            active === href ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
          }`}
        >
          <Icon className="h-4 w-4" /> {label}
        </Link>
      ))}
    </nav>
  )
}
