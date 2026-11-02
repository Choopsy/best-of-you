import Link from 'next/link'
import { Compass } from 'lucide-react'

/** Page introuvable (adresse inconnue, ou page réservée à d'autres comptes) */
export default function NotFound() {
  return (
    <main className="flex min-h-[70svh] flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
        <Compass className="h-7 w-7 text-primary" aria-hidden="true" />
      </span>
      <h1 className="text-2xl">Page introuvable</h1>
      <p className="max-w-xs text-sm text-muted-foreground">Cette page n&apos;existe pas ou n&apos;est plus disponible.</p>
      <Link href="/" className="flex h-11 items-center rounded-full bg-primary px-5 text-[15px] font-semibold text-primary-foreground">
        Retour à l&apos;accueil
      </Link>
    </main>
  )
}
