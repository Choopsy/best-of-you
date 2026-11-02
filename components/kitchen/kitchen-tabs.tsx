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
    <nav aria-label="Cuisine" className="grid grid-cols-4 gap-1 rounded-full bg-secondary p-1">
      {TABS.map(({ href, label, Icon }) => (
        <Link
          key={href}
          href={href}
          prefetch
          aria-current={active === href ? 'page' : undefined}
          className={`flex min-h-11 items-center justify-center gap-1.5 rounded-full px-1 text-[13px] font-semibold transition-colors sm:text-sm ${
            active === href ? 'bg-card text-primary shadow-card' : 'text-muted-foreground'
          }`}
        >
          <Icon className="hidden h-4 w-4 sm:block" aria-hidden="true" /> {label}
        </Link>
      ))}
    </nav>
  )
}
