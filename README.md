# Équilibre

**Cuisine perso, nutrition et bien-être — une appli web pensée pour le téléphone.**

Équilibre réunit tes recettes, ce que tu manges et tes objectifs du jour au même endroit. Les objectifs ne sortent pas d'un chapeau : chaque chiffre est calculé à partir de références scientifiques publiées (ANSES, EFSA, OMS…), et l'appli montre d'où il vient.

![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs)
![React](https://img.shields.io/badge/React-19-149ECA?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth-3FCF8E?logo=supabase&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4-06B6D4?logo=tailwindcss&logoColor=white)

---

## Fonctionnalités

### 🍲 Recettes
- Création de recettes avec groupes d'ingrédients, étapes et photos.
- **Mode cuisine** pas à pas et portions ajustables.
- Chaque ingrédient est relié à un aliment de la **table Ciqual** : les valeurs nutritionnelles par portion sont calculées automatiquement.
- Favoris, avis, et collections pour ranger ses recettes (« Batch du dimanche », « Petits-déj protéinés »…).

### 🎯 Objectifs du jour
- Un profil santé (âge, taille, poids, niveau d'activité, objectif, régime) donne des objectifs personnalisés : calories, protéines, lipides, glucides, fibres, sucres, gras saturés, sel.
- La page **Mes objectifs** détaille chaque calcul, avec ses sources cliquables.
- Garde-fous : pas d'objectif de perte de poids sous un IMC de 18,5, un plancher calorique, réservé aux adultes.

### 📒 Journal alimentaire
- Ajout d'un repas en un geste : une recette (en portions) ou un aliment Ciqual (en grammes).
- Des **ronds de progression** pour la journée, et un rond par jour pour la semaine.

### 👥 Entre amis
- Demandes d'amis, recettes privées, visibles des amis ou publiques.
- Partage d'une recette avec des amis précis.
- Onglet « Découvrir », filtrable selon son régime (végétarien, vegan, sans gluten…).

### 🎨 Confort
- Design « Fournil » : crème, terracotta, sauge et miel.
- **Mode clair, mode sombre ou automatique** (suit le réglage du téléphone).
- Interface mobile d'abord, avec une barre de navigation en bas de l'écran.

---

## Comment sont calculés les objectifs

| Repère | Calcul | Source |
|---|---|---|
| Métabolisme de base | Équation de Mifflin-St Jeor | [Mifflin et al., 1990](https://pubmed.ncbi.nlm.nih.gov/2305711/) |
| Dépense du jour | Métabolisme × niveau d'activité 1,4 / 1,6 / 1,8 / 2,0 | [EFSA, 2013](https://www.efsa.europa.eu/en/efsajournal/pub/3005) |
| Perte de poids | Déficit selon le rythme choisi (≈ 7 700 kcal par kg) | [Hall, 2008](https://pubmed.ncbi.nlm.nih.gov/17848938/) |
| Prise de muscle | Surplus de +10 % | [Iraki et al., 2019](https://pubmed.ncbi.nlm.nih.gov/31247944/) |
| Protéines | 0,83 g/kg ; 1,2 g/kg en perte de poids ou si très actif ; 1,6 g/kg pour la prise de muscle | [EFSA](https://www.efsa.europa.eu/sites/default/files/assets/DRV_Summary_tables_jan_17.pdf), [Leidy, 2015](https://pubmed.ncbi.nlm.nih.gov/25926512/), [Morton, 2018](https://pubmed.ncbi.nlm.nih.gov/28698222/) |
| Lipides, glucides, fibres, sucres | 35–40 %, 40–55 % de l'énergie ; 30 g de fibres ; moins de 100 g de sucres | [ANSES, 2016](https://www.anses.fr/fr/system/files/NUT2012SA0103Ra-1.pdf) |
| Sel | Moins de 5 g par jour | OMS |

Le code du calcul est dans [`lib/targets.ts`](lib/targets.ts) et ses tests dans [`scripts/test-targets.ts`](scripts/test-targets.ts).

> ⚠️ Ces objectifs sont des repères pour des adultes en bonne santé. Ils ne remplacent pas l'avis d'un médecin ou d'un diététicien, et ne s'appliquent pas pendant une grossesse, l'allaitement ou en cas de maladie.

---

## Stack technique

- **[Next.js 16](https://nextjs.org)** (App Router, Server Components, Server Actions, Turbopack) et **React 19**
- **[Supabase](https://supabase.com)** : base Postgres, authentification, stockage des photos
- **Tailwind CSS 4** et composants [shadcn/ui](https://ui.shadcn.com) (Base UI)
- **TypeScript** de bout en bout
- Données nutritionnelles : **[table Ciqual 2025](https://ciqual.anses.fr)** de l'ANSES

## Structure du projet

```
app/                   Pages (App Router)
  journal/             Journal alimentaire du jour
  recipes/             Liste, détail, création et mode cuisine des recettes
  profile/health/      Profil santé et explication des objectifs
  collections/ friends/ favorites/ onboarding/ (auth)/
actions/               Server Actions (journal, recettes, profil, amis…)
components/            Composants d'interface (journal, recettes, navigation, thème…)
lib/
  targets.ts           Calcul des objectifs (formules et sources)
  nutrition.ts         Calcul nutritionnel à partir de Ciqual
  auth.ts              Session côté serveur
supabase/migrations/   Schéma SQL et données Ciqual
scripts/               Import Ciqual et tests
```

---

## Lancer le projet en local

### 1. Base de données Supabase

1. Crée un projet sur [supabase.com](https://supabase.com).
2. Dans **SQL Editor**, exécute dans l'ordre :
   - `supabase/migrations/001_ciqual.sql` : les quelque 3 500 aliments de la table Ciqual ;
   - `supabase/migrations/002_schema.sql` : les tables, les règles de sécurité et le stockage des photos.
3. Dans **Authentication > URL Configuration**, indique `http://localhost:3000` en Site URL et ajoute `http://localhost:3000/auth/callback` aux Redirect URLs.

### 2. Variables d'environnement

Copie `.env.example` en `.env.local`, puis remplis-le avec les valeurs de **Project Settings > API** :

```env
NEXT_PUBLIC_SUPABASE_URL=https://<ton-projet>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3. Démarrer

**Avec Docker** (rien d'autre à installer) :

```bash
docker compose up --build                          # développement, rechargement automatique
docker compose --profile prod up --build web-prod  # version optimisée, pour juger la vitesse réelle
```

**Avec Node.js 22** :

```bash
npm install
npm run dev
```

Ouvre ensuite [http://localhost:3000](http://localhost:3000) et crée ton compte.

---

## Déploiement

L'appli a besoin d'un serveur (Server Actions, authentification). Elle ne peut donc **pas** être hébergée sur GitHub Pages. Le plus simple est **[Vercel](https://vercel.com)** :

1. Importe le dépôt GitHub dans Vercel.
2. Ajoute les trois variables d'environnement ci-dessus, avec `NEXT_PUBLIC_SITE_URL` = l'adresse du site.
3. Dans Supabase, ajoute cette adresse et `<adresse>/auth/callback` dans **URL Configuration**.

Chaque `git push` sur `main` redéploie automatiquement.

---

## Données Ciqual

`001_ciqual.sql` est généré à partir des fichiers XML publiés par l'ANSES :

```bash
node scripts/import-ciqual.mjs                       # télécharge les fichiers puis génère le SQL
node scripts/import-ciqual.mjs alim.xml compo.xml    # à partir de fichiers déjà téléchargés
```

Le script gère les particularités du format : virgule décimale, « traces », valeurs « < 0,5 ».

## Tests et sécurité

- `npm test` vérifie le calcul des objectifs : chaque cas est recalculé à la main à partir des formules publiées.
- **Sécurité de la base (Row Level Security)** : chaque utilisateur ne voit que ses propres données de santé, son poids, son journal et ses collections. Une recette n'est visible que de son auteur, de ses amis (si elle est en mode « amis »), de tout le monde (si elle est publique) ou des amis avec qui elle est partagée. Ces règles sont testées dans [`supabase/tests/rls_tests.sql`](supabase/tests/rls_tests.sql) (34 vérifications).

---

## Feuille de route

- [x] Recettes, mode cuisine, nutrition par portion
- [x] Profil santé et objectifs sourcés
- [x] Journal alimentaire et ronds de progression
- [x] Amis et partage de recettes
- [x] Mode clair / sombre
- [ ] Activités physiques et calories dépensées
- [ ] Objectif de séances par semaine
- [ ] Courbe de poids et poids cible

---

## Crédits

- Données nutritionnelles : **Table de composition nutritionnelle des aliments Ciqual**, ANSES, sous [Licence Ouverte / Open Licence](https://www.etalab.gouv.fr/licence-ouverte-open-licence/).
- Projet personnel de **Perret Cheun** ([@Choopsy](https://github.com/Choopsy)).
