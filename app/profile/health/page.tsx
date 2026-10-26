import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getHealthContext } from '@/lib/health'
import { HealthForm } from '@/components/health/health-form'
import { TargetsExplainer } from '@/components/health/targets-explainer'
import { Notice, PageHeader } from '@/components/layout/page-header'

interface Props {
  searchParams: Promise<{ error?: string; message?: string }>
}

export default async function HealthPage({ searchParams }: Props) {
  const { error, message } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const ctx = await getHealthContext(supabase, user.id)

  return (
    <div className="min-h-svh pb-24">
      <PageHeader title="Mes objectifs" back="/profile" />
      <main className="px-4 py-6 max-w-xl mx-auto space-y-8">
        <Notice error={error ?? ctx.error ?? undefined} message={message} />

        {ctx.targets && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Tes objectifs par jour, et d&apos;où ils viennent</h2>
            <TargetsExplainer targets={ctx.targets} />
          </section>
        )}

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">{ctx.complete ? 'Modifier mon profil santé' : 'Mon profil santé'}</h2>
          <HealthForm health={ctx.health} weightKg={ctx.weightKg} back="/profile/health" next="/profile/health" submitLabel="Enregistrer" />
        </section>
      </main>
    </div>
  )
}
