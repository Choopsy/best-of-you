import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Refrigerator, Users } from 'lucide-react'
import { getSession } from '@/lib/auth'
import { getFridge, getHouseholdId } from '@/lib/household'
import { todayISO } from '@/lib/dates'
import { PageHeader } from '@/components/layout/page-header'
import { KitchenTabs } from '@/components/kitchen/kitchen-tabs'
import { FridgeSheet } from '@/components/kitchen/fridge-sheet'
import { EXPIRY_STYLE, expiryInfo } from '@/components/kitchen/expiry'

interface Props {
  searchParams: Promise<{ add?: string }>
}

const fmtQty = (q: number | null, u: string | null) =>
  q != null ? `${q.toLocaleString('fr-FR')}${u ? ` ${u}` : ''}` : null

export default async function FridgePage({ searchParams }: Props) {
  const { add } = await searchParams
  const { supabase, user } = await getSession()
  if (!user) redirect('/login')

  const today = todayISO()
  const householdId = await getHouseholdId(supabase)
  const [items, { count: members }] = await Promise.all([
    getFridge(supabase),
    supabase.from('household_members').select('*', { count: 'exact', head: true }).eq('household_id', householdId ?? ''),
  ])

  const withInfo = items.map((i) => ({ ...i, info: expiryInfo(i.expires_on, today) }))
  const groups = [
    { title: 'À consommer vite', items: withInfo.filter((i) => i.info.level === 'expired' || i.info.level === 'urgent') },
    { title: 'Cette semaine', items: withInfo.filter((i) => i.info.level === 'soon') },
    { title: 'Plus tard', items: withInfo.filter((i) => i.info.level === 'ok' || i.info.level === 'none') },
  ].filter((g) => g.items.length > 0)

  return (
    <div className="min-h-svh pb-24">
      <PageHeader title="Cuisine">
        <Link href="/foyer" className="flex h-9 items-center gap-1.5 rounded-full bg-muted px-3 text-sm font-bold" aria-label="Mon foyer">
          <Users className="h-4 w-4" /> {members && members > 1 ? `${members}` : 'Partager'}
        </Link>
        <FridgeSheet today={today} defaultOpen={add === '1'} />
      </PageHeader>

      <main className="px-4 py-4 max-w-xl mx-auto space-y-5">
        <KitchenTabs active="/frigo" />

        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <Refrigerator className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground max-w-xs">
              Note ce que tu as au frigo et au placard, avec la date limite : l&apos;appli te prévient avant que ça se perde,
              et la liste de courses ne te fera pas racheter ce que tu as déjà.
            </p>
            <div className="w-full max-w-xs"><FridgeSheet today={today} trigger="wide" /></div>
          </div>
        ) : (
          groups.map((g) => (
            <section key={g.title} className="space-y-2">
              <h2 className="text-lg">{g.title}</h2>
              <ul className="rounded-3xl bg-card divide-y shadow-[0_1px_0_var(--border)]">
                {g.items.map((i) => (
                  <li key={i.id} className="flex items-center gap-3 pl-4 pr-2 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-bold">{i.name}</p>
                      {fmtQty(i.quantity, i.unit) && <p className="text-xs text-muted-foreground">{fmtQty(i.quantity, i.unit)}</p>}
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${EXPIRY_STYLE[i.info.level]}`}>{i.info.label}</span>
                    <FridgeSheet key={`${i.id}-${i.quantity}-${i.expires_on}-${i.name}`} today={today} item={i} trigger="icon" />
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </main>
    </div>
  )
}
