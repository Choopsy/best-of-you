import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { APP_NAME } from '@/lib/brand'
import { LEGAL } from '@/lib/legal'

export const metadata: Metadata = { title: `Confidentialité · ${APP_NAME}` }

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg">{title}</h2>
      <div className="space-y-2 text-[15px] leading-relaxed text-foreground/90">{children}</div>
    </section>
  )
}

export default function PrivacyPage() {
  const contact = LEGAL.contactEmail
    ? <a href={`mailto:${LEGAL.contactEmail}`} className="font-bold underline underline-offset-2">{LEGAL.contactEmail}</a>
    : <>le responsable via la page GitHub du projet (<a href="https://github.com/Choopsy" className="underline underline-offset-2">@Choopsy</a>)</>

  return (
    <main className="px-5 pt-6 pb-28 max-w-2xl mx-auto space-y-7">
      <Link href="/" className="inline-flex min-h-10 items-center gap-1.5 text-sm font-bold text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Retour
      </Link>

      <header className="space-y-2">
        <ShieldCheck className="h-9 w-9 text-sage" />
        <h1 className="text-[28px] leading-tight">Tes données et ta vie privée</h1>
        <p className="text-sm text-muted-foreground">Mise à jour le {LEGAL.updatedOn}</p>
      </header>

      <div className="rounded-3xl bg-card px-5 py-4 shadow-[0_1px_0_var(--border)] space-y-2 text-[15px] leading-relaxed">
        <p className="font-bold">L&apos;essentiel</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Tes données servent uniquement à faire fonctionner {APP_NAME} pour toi.</li>
          <li>Pas de publicité, pas de revente, pas de traceurs.</li>
          <li>Tes données de santé ne sont enregistrées qu&apos;avec ton accord, et personne d&apos;autre ne les voit.</li>
          <li>Tu peux tout télécharger ou tout supprimer à tout moment, depuis <Link href="/profile/donnees" className="underline underline-offset-2">Profil &gt; Mes données</Link>.</li>
        </ul>
      </div>

      <Section title="Qui est responsable ?">
        <p>
          {APP_NAME} est un projet personnel et non commercial de {LEGAL.controller}, responsable du traitement de tes données.
          Pour toute question ou demande, contacte {contact}.
        </p>
      </Section>

      <Section title="Quelles données, et pourquoi ?">
        <p><span className="font-bold">Ton compte</span> : nom, email, mot de passe (stocké chiffré, illisible même pour nous) et photo de profil si tu en ajoutes une. Ils servent à te connecter et à te retrouver entre amis. Base légale : l&apos;exécution du service que tu demandes en créant ton compte.</p>
        <p><span className="font-bold">Tes données de santé</span> : sexe, date de naissance, taille, poids, niveau d&apos;activité, objectifs, régime, repas notés, séances de sport. Elles servent seulement à calculer tes objectifs du jour et à suivre ta progression. Comme ce sont des données sensibles, elles ne sont enregistrées qu&apos;avec ton <span className="font-bold">accord explicite</span>, que tu peux retirer à tout moment (article 9 du RGPD).</p>
        <p><span className="font-bold">Ta cuisine</span> : recettes, photos, collections, frigo, planning et liste de courses, produits scannés. Ils servent à faire fonctionner ces fonctions, et à les partager quand tu le choisis.</p>
        <p>Nous ne faisons ni profilage publicitaire, ni décision automatique te concernant. Les objectifs calculés sont des repères, pas un avis médical.</p>
      </Section>

      <Section title="Qui peut voir quoi ?">
        <ul className="list-disc pl-5 space-y-1">
          <li><span className="font-bold">Toi seul·e</span> : tes données de santé, ton journal, tes séances, ton poids.</li>
          <li><span className="font-bold">Tes amis</span> : ton nom, ta photo de profil et les recettes que tu leur rends visibles ou partages.</li>
          <li><span className="font-bold">Les membres de ton foyer</span> : le frigo, le planning de la semaine, la liste de courses et les produits scannés.</li>
          <li><span className="font-bold">Tout le monde</span> : seulement les recettes que tu mets en « publique ». Attention, les photos de recettes sont accessibles à toute personne qui possède leur lien.</li>
        </ul>
      </Section>

      <Section title="Où sont-elles hébergées ?">
        <p>Nous faisons appel à deux prestataires, qui traitent les données pour notre compte :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><span className="font-bold">Supabase</span> : base de données, comptes et photos{LEGAL.databaseRegion ? <>, hébergés en {LEGAL.databaseRegion}</> : null}.</li>
          <li><span className="font-bold">Vercel</span> : hébergement du site.</li>
        </ul>
        <p>
          Ces sociétés sont américaines : même si la base est stockée en Europe, un accès depuis les États-Unis (maintenance, support)
          reste possible. Ces transferts sont encadrés par les clauses contractuelles types de la Commission européenne, prévues
          dans leurs contrats de traitement des données.
        </p>
        <p>
          Quand tu scannes un code-barres, seul le code (les chiffres) est envoyé à <span className="font-bold">Open Food Facts</span> pour
          trouver le produit, sans aucune donnée personnelle.
        </p>
      </Section>

      <Section title="Combien de temps ?">
        <p>
          Tes données sont gardées tant que ton compte existe. Si tu retires ton accord, tes données de santé sont effacées tout de suite.
          Si tu supprimes ton compte, tout est effacé immédiatement : il n&apos;y a pas de corbeille.
          Les copies techniques de sauvegarde de nos prestataires disparaissent ensuite selon leur propre cycle.
        </p>
      </Section>

      <Section title="Cookies">
        <p>
          {APP_NAME} n&apos;utilise que deux cookies indispensables : un pour garder ta session ouverte, un pour retenir le thème clair ou sombre.
          Aucun cookie publicitaire ni de mesure d&apos;audience : c&apos;est pourquoi il n&apos;y a pas de bandeau à accepter.
        </p>
      </Section>

      <Section title="Tes droits">
        <p>Tu peux à tout moment :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><span className="font-bold">accéder</span> à tes données et les <span className="font-bold">emporter</span> : bouton « Télécharger mes données » (fichier JSON) ;</li>
          <li>les <span className="font-bold">corriger</span>, directement dans l&apos;appli ;</li>
          <li><span className="font-bold">retirer ton accord</span> pour les données de santé, ce qui les efface ;</li>
          <li><span className="font-bold">supprimer ton compte</span> et tout ce qu&apos;il contient ;</li>
          <li>demander la limitation d&apos;un traitement ou t&apos;y opposer, en écrivant à {contact}.</li>
        </ul>
        <p>
          Si tu estimes que tes droits ne sont pas respectés, tu peux adresser une réclamation à la{' '}
          <a href="https://www.cnil.fr/fr/plaintes" className="underline underline-offset-2">CNIL</a>.
        </p>
      </Section>

      <Section title="Sécurité">
        <p>
          Connexion chiffrée (HTTPS), mots de passe chiffrés, et des règles de sécurité dans la base de données qui empêchent
          chaque compte de lire les données des autres, sauf ce qui est explicitement partagé. Ces règles sont testées automatiquement.
        </p>
      </Section>
    </main>
  )
}
