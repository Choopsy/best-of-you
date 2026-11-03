# Tests

| Commande | Ce qu'elle vérifie | Durée |
| --- | --- | --- |
| `npx tsc --noEmit` | Typage | 20 s |
| `npm test` | Logique pure (`scripts/test-*.ts`) : objectifs, courses, rayons, hors connexion, idées, bilan, Open Food Facts, portions et nutrition des recettes, import de repas, frigo qui suit le journal | 10 s |
| `npm run test:db` | Règles de sécurité de la base : toutes les migrations sur un Postgres jetable, puis `supabase/tests/*.sql` | 30 s |
| `npm run test:e2e` | L'appli dans Chromium au format téléphone, scénario par scénario (`tests/e2e/specs`) | 3-4 min |
| `npm run test:all` | Les trois derniers | |
| `npm run test:security` | Linter de sécurité de Supabase (splinter) sur une base jetable, puis sonde HTTP de l'appli locale : en-têtes, accès sans compte, redirections, fuites (`tests/security/`) | 2-3 min |

## Avec Docker (conseillé)

Rien à installer sur la machine à part Docker Desktop : Node, paquets et Chromium sont dans le conteneur `test` (image officielle Playwright, voir `docker-compose.yml`).

- `docker compose run --rm test` : tout (typage + `test:all`).
- `docker compose run --rm test npm run test:e2e -- courses` : une commande précise.
- Les paquets sont réinstallés seulement quand `package-lock.json` change. Les captures arrivent dans `tests/e2e/captures/` comme d'habitude.
- La version de l'image (`v1.63.0`) doit suivre celle de `playwright` dans `package.json`.

## Sans Docker

Rien à installer à part `npm install` : Postgres (`embedded-postgres`) et PostgREST (`postgrest-dist`) arrivent par npm. Une seule fois : `npx playwright install chromium`. Sur Mac Apple Silicon, PostgREST n'existe pas dans `postgrest-dist` : `brew install postgrest` puis `POSTGREST_BIN=$(which postgrest)`.

## Tests e2e

- `npm run test:e2e -- courses bilan` : seulement ces scénarios ; `-- --no-build` pour ne pas reconstruire.
- Chaque scénario repart d'une base neuve : migrations + `tests/e2e/seed.sql` (Alice : foyer, recettes, frigo, journal ; Bob : ami d'Alice). Tous deux ont donné leur accord santé.
- L'appli de test est construite dans `.next-e2e` avec `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321` (une passerelle qui imite Supabase, `tests/e2e/stack.mjs`). Elle ne touche jamais la vraie base.
- Connexion : jeton signé localement (`tokenFor`), mis dans le cookie de session. `newPage(browser, { user, tourSeen, theme })` dans `tests/e2e/helpers.mjs`.
- Open Food Facts est simulé par `mockOff(page, respond)` (produit, inconnu, `'busy'`, `'down'`).
- Captures dans `tests/e2e/captures/` (ignoré par git) : les regarder pour vérifier une interface.
- Journal du serveur et de PostgREST : `E2E_VERBOSE=1` (PowerShell : `$env:E2E_VERBOSE=1`).

Écrire un scénario : copier un fichier de `tests/e2e/specs`, `export default async function ({ browser, db, metadata })`, vérifier avec `check(condition, 'message')`. `db` est un client Postgres superutilisateur pour préparer ou contrôler les données.

## Pièges connus

- `fill('9,4')` échoue sur un `<input type="number">` dans Playwright : utiliser `9.4`.
- `innerText` applique `text-transform` (titres en majuscules) ; les nombres français contiennent des espaces insécables : `textOf()` les remplace.
- Les sélecteurs Playwright sont stricts : `.first()` quand un texte peut apparaître plusieurs fois.
- La caméra n'existe pas dans le navigateur de test : `typeBarcode(page, code)` passe par la saisie manuelle.
- L'animation d'ouverture et la présentation recouvrent l'écran : `newPage` les marque comme vues (sauf `tourSeen: false`).
- RLS : un `INSERT … SELECT` refusé renvoie 0 ligne au lieu d'une erreur ; `t_eq` compare des `bigint` (caster avec `::int`).
- Deux politiques qui se citent (table A → table B → table A) : passer par une fonction `SECURITY DEFINER`.
- Les noms des contraintes `CHECK` de colonne sont `<table>_<colonne>_check` (utile pour les remplacer dans une migration).
