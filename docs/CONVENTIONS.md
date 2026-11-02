# Conventions de travail

## Langue et ton de l'appli

- Tout est en **français**, au **tutoiement**, avec des mots simples (« Ajouter », « Mes produits », pas de jargon technique). Phrases courtes ; pas de culpabilisation (« Rien de noté cette semaine », pas « Tu as échoué »).
- Pas de conseil médical ni de chiffre inventé : les repères viennent de sources citées dans l'interface (ANSES, EFSA, OMS, Ciqual). Les estimations sont annoncées comme telles (« ≈ »).
- Nombres au format français (`toLocaleString('fr-FR')` : espace insécable, virgule).
- Les commentaires du code sont aussi en français et expliquent le **pourquoi**.

## Interface

- Mobile d'abord (390 px) : cibles tactiles de 44 px minimum (`min-h-11`, `h-11 w-11`), barre du bas avec le bouton + au centre.
- Design « Chaleur éditoriale » (référence : `design/DESIGN.md` et maquettes Stitch) : couleurs en variables dans `app/globals.css` (sable, terracotta `--primary` pour boutons et liens, `--terracotta` vif pour ronds et bouton +, olive `--sage`, ocre `--honey`, corail `--coral`, sarcelle `--teal`), thème clair par défaut et sombre (`.dark`, cookie `theme`). Utiliser les jetons Tailwind (`bg-card`, `text-muted-foreground`, `bg-primary`, `shadow-card`, `shadow-float`…), jamais de couleur en dur.
- Titres en `font-heading` (Epilogue), texte en Karla. Cartes `rounded-3xl bg-card`, fenêtres en feuille du bas (`rounded-t-3xl`, `Portal`).
- Accessibilité : `role="dialog"` + `aria-label` sur les fenêtres, `aria-pressed` / `role="radio"` sur les choix, libellés sur les boutons icônes. Les tests e2e s'appuient sur ces rôles.

## Base de données : migrations

1. Nouveau fichier `supabase/migrations/NNN_nom.sql` (numéro suivant), avec un en-tête qui dit après quelle migration le lancer.
2. Toute nouvelle table : `ENABLE ROW LEVEL SECURITY` + politiques. Toute règle de sécurité : un test dans `supabase/tests/<nom>_tests.sql` (fonctions `t_eq`, `t_fails`), ajouté à `ORDER` dans `tests/db/run.mjs`.
3. **C'est Cheun qui lance les migrations** dans le SQL Editor de Supabase. Tant qu'elle n'est pas lancée, ne pas pousser le code qui en dépend : l'ajouter dans `SUIVI.md` (« Lancer … avant le push »).
4. Nouvelle donnée personnelle ou nouveau partage : mettre à jour la politique (`app/confidentialite/page.tsx`), la version dans `lib/legal.ts` et l'export (`app/api/export/route.ts`).

## Suivi et commits

- `SUIVI.md` à la racine : « À faire », « Idées », « Fait » (date, quoi, commit). Le mettre à jour à chaque tâche terminée. **Le dépôt est public** : rien de sensible dedans (ni clé, ni mot de passe, ni donnée d'utilisateur).
- Messages de commit en français : une ligne de résumé, puis le détail si utile.
- Avant de commiter : `npx tsc --noEmit`, `npm test`, et selon ce qui a changé `npm run test:db` / `npm run test:e2e` (voir docs/TESTS.md).

## Sécurité et secrets

- Ne jamais lire, demander ou afficher la clé secrète Supabase, ni un mot de passe (SMTP, comptes). `.env.local` contient seulement l'URL et la clé publique.
- Les réglages du tableau de bord Supabase / Vercel sont faits par Cheun : décrire les étapes plutôt que de les faire.
- Pas de service payant sans accord explicite.
