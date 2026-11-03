import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { LEGAL } from '@/lib/legal'

/** Pages légales (confidentialité, conditions, mentions) : lisibles sans compte, même mise en page. */
export function LegalPage({ icon, title, updatedOn, children }: { icon: React.ReactNode; title: string; updatedOn?: string; children: React.ReactNode }) {
  return (
    <main className="px-5 pt-6 pb-28 max-w-2xl mx-auto space-y-7">
      <Link href="/" className="inline-flex min-h-10 items-center gap-1.5 text-sm font-bold text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Retour
      </Link>
      <header className="space-y-2">
        {icon}
        <h1 className="text-[28px] leading-tight">{title}</h1>
        {updatedOn && <p className="text-sm text-muted-foreground">Mise à jour le {updatedOn}</p>}
      </header>
      {children}
      <LegalLinks />
    </main>
  )
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg">{title}</h2>
      <div className="space-y-2 text-[15px] leading-relaxed text-foreground/90">{children}</div>
    </section>
  )
}

/** Liens vers les trois pages légales (bas de page, connexion, Mes données) */
export function LegalLinks({ className = '' }: { className?: string }) {
  return (
    <nav aria-label="Informations légales" className={`flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground ${className}`}>
      <Link href="/confidentialite" className="min-h-8 underline underline-offset-4">Confidentialité</Link>
      <Link href="/conditions" className="min-h-8 underline underline-offset-4">Conditions d&apos;utilisation</Link>
      <Link href="/mentions-legales" className="min-h-8 underline underline-offset-4">Mentions légales</Link>
    </nav>
  )
}

/** Contact du responsable, en lien mailto */
export function ContactLink() {
  return <a href={`mailto:${LEGAL.contactEmail}`} className="font-bold underline underline-offset-2">{LEGAL.contactEmail}</a>
}
