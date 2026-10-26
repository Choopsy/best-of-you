import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getHealthContext } from '@/lib/health'
import { HealthForm } from '@/components/health/health-form'
import { Notice } from '@/components/layout/page-header'
import { APP_NAME } from '@/lib/brand'

interface Props {
  searchParams: Promise<{ error?: string }>
}

export default async function OnboardingPage({ searchParams }: Props) {
  const { error } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const ctx = await getHealthContext(supabase, user.id)

  return (
    <main className="px-4 py-8 max-w-xl mx-auto space-y-6 pb-24">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Bienvenue sur {APP_NAME}</h1>
        <p className="text-sm text-muted-foreground">
          Quelques infos pour calculer tes objectifs du jour (calories, protéines, lipides, glucides, fibres).
          Elles restent privées : personne d&apos;autre ne les voit.
        </p>
      </div>
      <Notice error={error} />
      <HealthForm health={ctx.health} weightKg={ctx.weightKg} back="/onboarding" next="/profile/health" submitLabel="Calculer mes objectifs" />
    </main>
  )
}
