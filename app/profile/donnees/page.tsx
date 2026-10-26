import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Download, HeartPulse, ShieldCheck, Trash2 } from 'lucide-react'
import { getSession } from '@/lib/auth'
import { Notice, PageHeader } from '@/components/layout/page-header'
import { WithdrawButton } from '@/components/privacy/withdraw-button'
import { DeleteAccountForm } from '@/components/privacy/delete-account-form'

interface Props {
  searchParams: Promise<{ error?: string; message?: string }>
}

const fmt = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' }).format(new Date(iso))

const card = 'rounded-3xl bg-card px-5 py-5 shadow-[0_1px_0_var(--border)] space-y-3'

export default async function MyDataPage({ searchParams }: Props) {
  const { error, message } = await searchParams
  const { supabase, user } = await getSession()
  if (!user) redirect('/login')

  const [{ data: health }, { data: member }] = await Promise.all([
    supabase.from('health_profiles').select('health_consent_at').eq('user_id', user.id).maybeSingle(),
    supabase.from('household_members').select('household_id').eq('user_id', user.id).maybeSingle(),
  ])
  const { count: members } = member
    ? await supabase.from('household_members').select('*', { count: 'exact', head: true }).eq('household_id', member.household_id)
    : { count: 0 }
  const shared = (members ?? 0) > 1

  return (
    <div className="min-h-svh pb-28">
      <PageHeader title="Mes données" back="/profile" />
      <main className="px-4 py-5 max-w-lg mx-auto space-y-5">
        <Notice error={error} message={message} />

        <section className={card}>
          <h2 className="flex items-center gap-2 text-lg"><Download className="h-5 w-5 text-primary" /> Télécharger mes données</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Un fichier avec tout ce que contient ton compte : profil, santé, journal, séances, recettes, amis et foyer.
            Format JSON, lisible par d&apos;autres applis.
          </p>
          <a href="/api/export" download
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground">
            <Download className="h-4 w-4" /> Télécharger (JSON)
          </a>
        </section>

        <section className={card}>
          <h2 className="flex items-center gap-2 text-lg"><HeartPulse className="h-5 w-5 text-primary" /> Données de santé</h2>
          {health?.health_consent_at ? (
            <>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Tu as donné ton accord le {fmt(health.health_consent_at)}. Tu peux le retirer à tout moment :
                tes données de santé seront alors effacées.
              </p>
              <WithdrawButton />
            </>
          ) : (
            <p className="text-sm text-muted-foreground leading-relaxed">
              Aucune donnée de santé enregistrée. Tu pourras donner ton accord en remplissant ton{' '}
              <Link href="/onboarding" className="underline underline-offset-2">profil santé</Link>.
            </p>
          )}
        </section>

        <section id="supprimer" className={`${card} border border-destructive/25 scroll-mt-20`}>
          <h2 className="flex items-center gap-2 text-lg"><Trash2 className="h-5 w-5 text-destructive" /> Supprimer mon compte</h2>
          <div className="text-sm leading-relaxed space-y-2">
            <p>Tout sera effacé immédiatement et <span className="font-bold">définitivement</span>, sans retour possible :</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>ton profil, tes données de santé, ton journal et tes séances ;</li>
              <li>tes recettes et leurs photos, y compris celles partagées avec tes amis ;</li>
              <li>tes collections, tes avis et tes amis ;</li>
              <li>{shared
                ? 'ta place dans le foyer : le frigo, le planning et les courses restent à l’autre membre ;'
                : 'ton foyer avec son frigo, son planning et ses courses.'}</li>
            </ul>
            <p className="text-muted-foreground">
              Conseil : <a href="/api/export" download className="underline underline-offset-2">télécharge tes données</a> avant.
            </p>
          </div>
          <DeleteAccountForm />
        </section>

        <Link href="/confidentialite" className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground underline underline-offset-4">
          <ShieldCheck className="h-4 w-4" /> Politique de confidentialité
        </Link>
      </main>
    </div>
  )
}
