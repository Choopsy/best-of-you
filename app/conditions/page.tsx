import type { Metadata } from 'next'
import { ScrollText } from 'lucide-react'
import { APP_NAME } from '@/lib/brand'
import { LEGAL } from '@/lib/legal'
import { ContactLink, LegalPage, Section } from '@/components/legal/legal-page'

export const metadata: Metadata = { title: `Conditions d'utilisation · ${APP_NAME}` }

export default function TermsPage() {
  return (
    <LegalPage icon={<ScrollText className="h-9 w-9 text-sage" />} title="Conditions d'utilisation" updatedOn={LEGAL.termsUpdatedOn}>
      <div className="rounded-3xl bg-card px-5 py-4 shadow-card space-y-2 text-[15px] leading-relaxed">
        <p className="font-bold">L&apos;essentiel</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>{APP_NAME} est gratuit, réservé aux personnes de {LEGAL.minAge} ans et plus.</li>
          <li>Ce n&apos;est pas un avis médical : les objectifs et les calculs sont des repères.</li>
          <li>Ce que tu partages (recettes, photos) doit t&apos;appartenir et rester respectueux.</li>
          <li>Tu peux supprimer ton compte à tout moment.</li>
        </ul>
      </div>

      <Section title="Le service">
        <p>
          {APP_NAME} t&apos;aide à noter ce que tu manges, à suivre tes objectifs, à organiser la cuisine du foyer et à suivre ta forme.
          C&apos;est un projet personnel de {LEGAL.controller}, gratuit et sans publicité. Il est fourni tel quel : il peut
          évoluer, être interrompu ou s&apos;arrêter, et nous ne pouvons pas garantir qu&apos;il soit toujours disponible ou sans erreur.
          Pense à <a href="/profile/donnees" className="underline underline-offset-2">télécharger tes données</a> si tu veux en garder une copie.
        </p>
      </Section>

      <Section title="Ton compte">
        <p>
          Il faut avoir {LEGAL.minAge} ans ou plus pour créer un compte : les repères nutritionnels utilisés sont prévus pour les adultes.
          Ton compte est personnel. Garde ton mot de passe pour toi ; si tu penses qu&apos;il a été découvert, change-le.
        </p>
      </Section>

      <Section title="Pas un avis médical">
        <p>
          Les objectifs du jour, les calories, les dépenses des séances et les estimations de la photo du repas viennent de formules
          et de tables publiques (ANSES, EFSA, OMS, Ciqual). Ce sont des repères, souvent approximatifs, pas un diagnostic ni un
          traitement. En cas de grossesse, de maladie, de trouble du comportement alimentaire ou de doute, parle-en à un
          professionnel de santé avant de changer ton alimentation ou ton activité.
        </p>
      </Section>

      <Section title="Ce que tu partages">
        <p>
          Tu restes propriétaire de tes recettes, textes et photos. En les rendant visibles à tes amis, à ton foyer ou à tout le monde,
          tu autorises {APP_NAME} à les afficher à ces personnes, tant qu&apos;elles restent partagées.
        </p>
        <p>
          Ne publie que ce que tu as le droit de publier (pas la photo ou la recette de quelqu&apos;un d&apos;autre sans son accord), et
          rien d&apos;illégal, de haineux, de choquant ou de trompeur. Un contenu qui ne respecte pas ces règles peut être retiré,
          et un compte qui les enfreint à plusieurs reprises peut être fermé.
        </p>
      </Section>

      <Section title="Signaler un problème">
        <p>Un contenu te pose problème, ou tu as une question ? Écris à <ContactLink />.</p>
      </Section>

      <Section title="Fin du compte">
        <p>
          Tu peux supprimer ton compte quand tu veux dans <a href="/profile/donnees" className="underline underline-offset-2">Profil &gt; Mes données</a> :
          tout est effacé immédiatement. Ce que deviennent tes données est détaillé dans la{' '}
          <a href="/confidentialite" className="underline underline-offset-2">politique de confidentialité</a>.
        </p>
      </Section>

      <Section title="Changements et loi applicable">
        <p>
          Si ces conditions changent de façon importante, tu en seras informé·e dans l&apos;appli. Elles sont soumises au droit français.
        </p>
      </Section>
    </LegalPage>
  )
}
