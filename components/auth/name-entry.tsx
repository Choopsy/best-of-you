import { Leaf } from 'lucide-react'
import { APP_NAME, APP_NAME_ENTRY, APP_SIGNATURE } from '@/lib/brand'

/**
 * En-tête de la page de connexion : le nom présenté comme une entrée de dictionnaire,
 * pour que son sens (« digne ») se lise avant tout le reste.
 */
export function NameEntry() {
  const { pronunciation, origin, meaning, gloss } = APP_NAME_ENTRY
  return (
    <header className="relative rounded-3xl bg-card px-6 py-6 shadow-card">
      <Leaf className="absolute right-5 top-5 h-6 w-6 text-sage" aria-hidden="true" />
      <h1 className="font-heading text-4xl font-semibold tracking-tight">{APP_NAME}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {/* La transcription phonétique n'aide pas à l'oral : lecteurs d'écran, on la saute */}
        <span aria-hidden="true">{pronunciation} · </span>du latin <i>{origin}</i>
      </p>
      <div className="my-4 h-0.5 w-12 rounded-full bg-terracotta" aria-hidden="true" />
      <p className="text-[17px] leading-snug">
        <span className="font-bold">« {meaning} »</span> — {gloss}
      </p>
      <p className="mt-4 font-heading text-[15px] font-semibold text-primary">{APP_SIGNATURE}</p>
    </header>
  )
}
