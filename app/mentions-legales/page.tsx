import type { Metadata } from 'next'
import { Landmark } from 'lucide-react'
import { APP_NAME } from '@/lib/brand'
import { LEGAL } from '@/lib/legal'
import { ContactLink, LegalPage, Section } from '@/components/legal/legal-page'

export const metadata: Metadata = { title: `Mentions légales · ${APP_NAME}` }

// Loi pour la confiance dans l'économie numérique (LCEN), article 6 : éditeur et hébergeurs
export default function LegalNoticePage() {
  return (
    <LegalPage icon={<Landmark className="h-9 w-9 text-sage" />} title="Mentions légales">
      <Section title="Éditeur">
        <p>
          {APP_NAME} est un projet personnel et non commercial, édité par {LEGAL.controller}, particulier.
          Directeur de la publication : {LEGAL.controller}. Contact : <ContactLink />.
        </p>
      </Section>

      <Section title="Hébergement">
        <ul className="space-y-3">
          {LEGAL.hosts.map((h) => (
            <li key={h.name}>
              <span className="font-bold">{h.name}</span> — {h.role}
              <br />{h.address}
              <br /><a href={`mailto:${h.contact}`} className="underline underline-offset-2">{h.contact}</a>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Données personnelles">
        <p>
          Ce que {APP_NAME} fait de tes données, et comment exercer tes droits : voir la{' '}
          <a href="/confidentialite" className="underline underline-offset-2">politique de confidentialité</a>.
        </p>
      </Section>

      <Section title="Contenus et sources">
        <p>
          Valeurs nutritionnelles : table de composition Ciqual de l&apos;ANSES. Produits du commerce : base collaborative
          Open Food Facts (licence ODbL). Les recettes et photos publiées par les utilisateurs restent sous leur responsabilité
          (voir les <a href="/conditions" className="underline underline-offset-2">conditions d&apos;utilisation</a>).
        </p>
      </Section>
    </LegalPage>
  )
}
