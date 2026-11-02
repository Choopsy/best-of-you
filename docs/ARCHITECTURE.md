# Architecture de Dignis

Appli web mobile d'abord (installable, PWA) : journal alimentaire, objectifs nutritionnels, cuisine du foyer (recettes, frigo, semaine, courses), forme (séances, poids) et bilan hebdomadaire. Interface entièrement en français.

## Stack

- **Next.js 16** (App Router, Server Components, Server Actions, Turbopack) et **React 19**. Ce n'est pas le Next.js des données d'entraînement : lire `node_modules/next/dist/docs/` avant d'utiliser une API (ex. `middleware.ts` s'appelle maintenant `proxy.ts`).
- **Supabase** : Postgres avec Row Level Security, Auth (email + mot de passe, confirmation par email), Storage (photos de recettes). Projet en Irlande (UE).
- **Vercel** pour l'hébergement, région `dub1` (Dublin, à côté de la base : voir `vercel.json`).
- **Tailwind CSS 4** + composants shadcn/ui sur Base UI (`components/ui`).
- Données nutritionnelles : **table Ciqual 2025** de l'ANSES (migration `001_ciqual.sql`, table `canonical_ingredients`), produits du commerce via **Open Food Facts**.

## Dossiers

```
app/                  Pages (App Router). Une page = un dossier ; les pages serveur lisent la base directement.
  api/products/       Code-barres : produits du foyer, puis Open Food Facts en secours côté serveur
  api/ingredients/    Recherche d'aliments (Ciqual + produits du foyer avec ?products=1)
  api/export/         Export JSON de toutes les données de l'utilisateur (RGPD)
actions/              Server Actions ('use server') : toutes les écritures passent par là
components/           Interface, rangée par domaine (journal, recipes, kitchen, scan, forme, onboarding…)
lib/                  Logique pure et accès aux données (testable sans navigateur)
supabase/migrations/  Schéma SQL numéroté, appliqué à la main dans Supabase (voir CONVENTIONS)
supabase/tests/       Tests SQL des règles de sécurité (npm run test:db)
scripts/              Tests unitaires TypeScript (npm test) et import Ciqual
tests/                Bancs d'essai : base jetable (db), navigateur (e2e) — voir docs/TESTS.md
public/sw.js          Service worker écrit à la main (liste de courses hors connexion)
proxy.ts              Session Supabase + redirection vers /login (ex-middleware)
```

## Données et sécurité

Tout passe par la clé publique Supabase côté navigateur et serveur : **la sécurité repose entièrement sur la RLS**. Une nouvelle table sans politique est soit fermée, soit (pire) ouverte : chaque table a `ENABLE ROW LEVEL SECURITY` et des politiques testées dans `supabase/tests/`.

Qui voit quoi :
- **Privé (soi seul)** : `health_profiles`, `weight_logs`, `food_logs`, `activities`, collections. Ce sont des données de santé (RGPD art. 9) : accord explicite `health_profiles.health_consent_at` ; sans accord, `getHealthContext` redirige vers `/consentement`.
- **Foyer** (`households`, `household_members`, `my_household_id()`, `ensure_household()`) : `fridge_items`, `meal_plan`, `shopping_items`, `aisle_overrides`, `custom_foods` (produits scannés ou créés).
- **Recettes** : `recipes.visibility` = private / friends / public, plus `recipe_shares` et les recettes prévues dans la semaine du foyer (`can_view_recipe()`). Les tables filles (`ingredients`, `steps`…) suivent `can_view_recipe` / `owns_recipe`.
- **Exception produits** : un produit du foyer utilisé comme ingrédient est lisible par ceux qui voient la recette (`custom_food_in_visible_recipe`, migration 008). Les requêtes « mes produits » filtrent donc explicitement sur `household_id`.
- Fonctions `SECURITY DEFINER` (`SET search_path = public`) quand deux politiques se citent l'une l'autre (sinon Postgres : « infinite recursion detected in policy »).
- RGPD : `withdraw_health_data()`, `delete_my_account()` (photos supprimées avant via l'API Storage), export JSON, politique `/confidentialite`, page `/profile/donnees`.

Tables : profiles, health_profiles, weight_logs, food_logs, activities, recipes, ingredient_groups, ingredients, steps, step_ingredients, tags, recipe_tags, recipe_likes, recipe_reviews, recipe_shares, collections, collection_recipes, friendships, households, household_members, household_invites, fridge_items, meal_plan, shopping_items, aisle_overrides, custom_foods, canonical_ingredients (Ciqual).

## Modules clés de `lib/`

| Fichier | Rôle |
| --- | --- |
| `auth.ts` | `getSession()` : utilisateur via `getClaims()` (jeton vérifié localement, pas d'appel réseau). `user.tourDone` lit les métadonnées du jeton (mises à jour seulement au renouvellement du jeton). |
| `health.ts` / `targets.ts` | Profil santé et objectifs du jour (formules sourcées EFSA/ANSES, testées dans `scripts/test-targets.ts`). |
| `nutrition.ts` | Nutriments, conversion des quantités en grammes, `fetchFoods()` (Ciqual + produits du foyer), `computeRecipeNutrition()`. |
| `portions.ts` | Quantités en grammes ou en portions : un produit a ses valeurs « pour 100 g » ou « pour 1 portion », et un poids de portion facultatif. |
| `off.ts` | Open Food Facts : appelé **depuis le téléphone** (limite de 15 produits/min par IP ; depuis Vercel toutes les IP sont partagées), serveur en secours. |
| `journal.ts`, `weekly.ts`, `weekly-data.ts` | Journal du jour, récents, bilan de la semaine (moyennes sur les jours notés). |
| `meal-import.ts` | Import d'un repas en JSON (`/journal/importer`, lien discret dans Mes données) : lecture et vérification, relue côté serveur. Champ `type` prévu pour les recettes. |
| `shopping.ts`, `aisles.ts`, `offline-list.ts` | Liste de courses (semaine moins le frigo), rayons (dictionnaire + corrections du foyer), file d'attente hors connexion. |
| `suggest.ts` | « Qu'est-ce qu'on mange ? » selon le frigo. |
| `activities.ts`, `weight.ts` | MET (Compendium 2024), repères OMS, tendance du poids (moyenne lissée). |
| `brand.ts`, `legal.ts` | Nom, signature, mentions légales (responsable, contact, région, version de la politique). |

## Comportements à connaître

- **Navigation rapide** : `staleTimes` (next.config.ts) et `Link prefetch` sur la barre du bas et les onglets Cuisine. Après une écriture, les actions appellent `revalidatePath`.
- **Hors connexion** : `public/sw.js` garde `/courses` (réseau d'abord) et les fichiers `/_next/static` ; la liste hors ligne est dans `localStorage` (`dignis:courses:<foyer>:…`), envoyée au retour du réseau avec des identifiants générés côté client.
- **Scan** : `components/scan/barcode-scanner.tsx` (zxing, double lecture pour éviter les erreurs, saisie manuelle de secours) puis `scanned-product.tsx` (trouvé / à compléter / à recopier ; mode `onPicked` pour les recettes).
- **Bouton +** (`components/nav/new-item-sheet.tsx`) : raccourcis repas, scan, séance, frigo, recette, pesée.
- **Premier lancement** : inscription → `/onboarding` (profil santé) → accueil, où `components/onboarding/welcome-tour.tsx` montre la présentation (vue = `localStorage` + `user_metadata.tour_done`). Animation d'ouverture : `components/brand/splash.tsx` (une fois par session).
- **Emails** : Gmail en SMTP dans Supabase (temporaire, sans accord de traitement : à remplacer avant d'ouvrir largement), modèles en français avec liens `token_hash`.
