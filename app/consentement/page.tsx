import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'
import { getSession } from '@/lib/auth'
import { giveHealthConsent, withdrawHealthConsent } from '@/actions/privacy'
import { Notice } from '@/components/layout/page-header'
import { ConsentForm } from '@/components/privacy/consent-form'
import { Button } from '@/components/ui/button'

interface Props {
  searchParams: Promise<{ error?: string }>
}

/** Demande d'accord pour les comptes qui avaient déjà un profil santé. */
export default async function ConsentPage({ searchParams }: Props) {
  const { error } = await searchParams
  const { supabase, user } = await getSession()
  if (!user) redirect('/login')
  const { data: h } = await supabase.from('health_profiles').select('health_consent_at').eq('user_id', user.id).maybeSingle()
  if (!h || h.health_consent_at) redirect('/')

  return (
    <main className="px-5 pt-10 pb-28 max-w-lg mx-auto space-y-6">
      <header className="space-y-3">
        <ShieldCheck className="h-10 w-10 text-sage" />
        <h1 className="text-[26px] leading-tight">Ton accord pour tes données de santé</h1>
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          Ton poids, tes objectifs, tes repas et tes séances sont des données de santé. La loi (RGPD) demande ton accord
          explicite pour les garder. Rien ne change pour toi : elles restent privées et servent seulement à calculer tes objectifs.
        </p>
      </header>
      <Notice error={error} />

      <ConsentForm action={giveHealthConsent} />

      <div className="rounded-3xl bg-muted/60 px-4 py-4 space-y-3 text-sm leading-relaxed">
        <p>
          Tu préfères ne pas donner ton accord ? Tes données de santé seront effacées. Tu pourras toujours utiliser les recettes,
          le frigo et le foyer.
        </p>
        <form action={withdrawHealthConsent}>
          <input type="hidden" name="from" value="consentement" />
          <Button type="submit" variant="outline" className="w-full">Refuser et effacer mes données de santé</Button>
        </form>
        <p className="text-xs text-muted-foreground">
          <Link href="/confidentialite" className="underline underline-offset-2">Lire la politique de confidentialité</Link>
        </p>
      </div>
    </main>
  )
}
