# Équilibre

Appli perso de cuisine, nutrition et bien-être, issue du code de `family-cookbook`.

- **Recettes** : création, mode cuisine pas à pas, portions ajustables, favoris, avis, collections perso.
- **Nutrition** : chaque ingrédient est lié à un aliment de la table **Ciqual** (ANSES). La recette affiche ses valeurs par portion.
- **Profil santé** : sexe, âge, taille, poids, niveau d'activité, objectif (perdre, garder, prendre du muscle), régime (omnivore, pescétarien, végétarien, vegan) et exclusions (gluten, lactose).
- **Objectifs du jour** calculés à partir de références publiées, avec leur source affichée dans l'appli (page « Mes objectifs ») :
  - énergie : Mifflin-St Jeor × niveaux d'activité EFSA (1,4 / 1,6 / 1,8 / 2,0), ajustée selon l'objectif ;
  - protéines : 0,83 g/kg (EFSA), 1,2 g/kg en perte de poids (Leidy 2015) ou si très actif (AND/DC/ACSM 2016), 1,6 g/kg pour la prise de muscle (Morton 2018), avec le plancher en % de l'énergie de l'ANSES ;
  - lipides 35–40 %, glucides 40–55 %, AGS < 12 %, sucres < 100 g, fibres 30 g (ANSES 2016) ; sel < 5 g (OMS).
  - Garde-fous : pas d'objectif de perte sous un IMC de 18,5, plancher calorique (métabolisme de base, ou 1 200 / 1 500 kcal), adultes seulement.
- **Journal alimentaire** : recette (en portions) ou aliment Ciqual (en grammes), total du jour comparé aux objectifs.
- **Amis** : demandes d'amis, recettes visibles « privée / amis / publique », partage d'une recette avec des amis précis.
- **Inscription ouverte** avec confirmation par email et « mot de passe oublié ».

Le code du calcul est dans `lib/targets.ts`, testé par `npm test`.

## Installation

### 1. Créer un nouveau projet Supabase

Sur [supabase.com](https://supabase.com), crée un projet **neuf** (ne réutilise pas celui de family-cookbook).

### 2. Régénérer les données Ciqual (obligatoire)

L'ancien script tronquait les décimales (1,6 g était lu comme 1 g). Il est corrigé, mais le fichier SQL doit être régénéré :

```bash
node scripts/import-ciqual.mjs
```

Le script télécharge la table Ciqual depuis data.gouv.fr et réécrit `supabase/migrations/001_ciqual.sql`. Le message d'avertissement en tête du fichier doit avoir disparu.

### 3. Créer les tables

Dans Supabase > **SQL Editor**, exécute dans l'ordre :

1. `supabase/migrations/001_ciqual.sql` (table des aliments, environ 3 500 lignes)
2. `supabase/migrations/002_schema.sql` (tout le reste, avec les règles de sécurité)

Le fichier 001 est gros : s'il est trop lourd pour l'éditeur, utilise `npx supabase db push` après `npx supabase link`.

### 4. Réglages d'authentification

Dans Supabase > **Authentication** > **URL Configuration** :

- **Site URL** : `http://localhost:3000` en local, puis l'adresse du site en ligne.
- **Redirect URLs** : ajoute `http://localhost:3000/auth/callback` (et la version en ligne).

L'option « Confirm email » est conseillée : l'appli gère les deux cas.

### 5. Variables d'environnement

Copie `.env.example` en `.env.local` et remplis-le (Supabase > Project Settings > API).

### 6. Lancer

```bash
npm install
npm run dev
```

## Tests

- `npm test` vérifie le calcul des objectifs (formules recalculées à la main).
- Les règles de sécurité de la base ont été testées sur un Postgres local : 3 comptes, 34 vérifications (qui voit quelles recettes, profils santé privés, partage réservé aux amis, etc.).

## Avertissement

Les objectifs sont des repères pour des adultes en bonne santé. Ils ne remplacent pas l'avis d'un médecin ou d'un diététicien, et ne s'appliquent pas pendant une grossesse, l'allaitement ou en cas de maladie. L'appli l'indique aussi sur la page « Mes objectifs ».
