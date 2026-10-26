import { redirect } from 'next/navigation'
import { ShoppingBasket } from 'lucide-react'
import { getSession } from '@/lib/auth'
import { shiftDate, todayISO, weekStart } from '@/lib/dates'
import { PageHeader } from '@/components/layout/page-header'
import { KitchenTabs } from '@/components/kitchen/kitchen-tabs'
import { GenerateButton } from '@/components/kitchen/generate-button'
import { ShoppingList, type ShoppingItem } from '@/components/kitchen/shopping-list'

export default async function ShoppingPage() {
  const { supabase, user } = await getSession()
  if (!user) redirect('/login')

  const today = todayISO()
  const nextMonday = shiftDate(weekStart(today), 7)
  const { data } = await supabase
    .from('shopping_items')
    .select('id, name, quantity, unit, note, checked')
    .order('checked')
    .order('name')
  const items = (data ?? []) as ShoppingItem[]

  return (
    <div className="min-h-svh pb-24">
      <PageHeader title="Cuisine" />
      <main className="px-4 py-4 max-w-xl mx-auto space-y-4">
        <KitchenTabs active="/courses" />

        <div className="rounded-3xl bg-card p-4 space-y-3 shadow-[0_1px_0_var(--border)]">
          <p className="text-sm">
            La liste reprend les recettes prévues dans <span className="font-bold">Semaine</span> et enlève
            ce que tu as déjà au <span className="font-bold">Frigo</span>.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <GenerateButton from={today} to={shiftDate(nextMonday, -1)} label="Jusqu'à dimanche" />
            <GenerateButton from={nextMonday} to={shiftDate(nextMonday, 6)} label="Semaine prochaine" variant="outline" />
          </div>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <ShoppingBasket className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Ta liste est vide.</p>
          </div>
        ) : null}
        <ShoppingList items={items} />
      </main>
    </div>
  )
}
