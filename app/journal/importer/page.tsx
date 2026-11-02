import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getHealthContext } from '@/lib/health'
import { canImportMeals } from '@/lib/features'
import { todayISO } from '@/lib/dates'
import { PageHeader } from '@/components/layout/page-header'
import { MealImportForm } from '@/components/journal/meal-import'

/** Import d'un repas depuis un fichier JSON : réservé aux comptes de MEAL_IMPORT_USERS (Profil > Mes données). */
export default async function ImportMealPage() {
  const { supabase, user } = await getSession()
  if (!user) redirect('/login')
  // Pour les autres comptes, la page n'existe pas
  if (!canImportMeals(user.id)) notFound()
  // Données de santé, comme le journal : sans accord, redirige vers /consentement
  await getHealthContext(supabase, user.id)

  return (
    <div className="min-h-svh pb-28">
      <PageHeader title="Importer un repas" back="/profile/donnees" />
      <main className="px-4 py-5 max-w-lg mx-auto space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Ajoute au journal un repas décrit dans un fichier JSON. Tu vois l&apos;aperçu avant de valider.
        </p>
        <MealImportForm today={todayISO()} />
      </main>
    </div>
  )
}
