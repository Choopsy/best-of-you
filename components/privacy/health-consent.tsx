import Link from 'next/link'

/**
 * Accord explicite pour les données de santé (art. 9 RGPD) :
 * case décochée par défaut, distincte de tout le reste, texte précis, retrait possible.
 */
export function HealthConsentField({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 rounded-2xl border bg-card px-4 py-3.5 text-sm leading-relaxed">
      <input type="checkbox" name="health_consent" checked={checked} onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-5 w-5 shrink-0 accent-[var(--primary)]" />
      <span>
        <span className="font-bold">J&apos;accepte que mes données de santé soient enregistrées</span>{' '}
        (âge, taille, poids, objectifs, repas et séances) pour calculer mes objectifs et suivre ma progression.
        Elles restent privées. Je peux retirer mon accord à tout moment dans{' '}
        <span className="whitespace-nowrap">Profil &gt; Mes données</span>, ce qui les efface.{' '}
        <Link href="/confidentialite" target="_blank" className="underline underline-offset-2">En savoir plus</Link>
      </span>
    </label>
  )
}
