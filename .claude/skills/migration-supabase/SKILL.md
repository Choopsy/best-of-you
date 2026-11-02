---
name: migration-supabase
description: À utiliser pour toute modification du schéma Supabase de Dignis (nouvelle table, colonne, politique RLS, fonction SQL) — écrit la migration numérotée, ses tests de sécurité et met à jour politique, export et suivi.
---

# Modifier la base de Dignis

1. **Lire l'existant** : les migrations de `supabase/migrations/` qui touchent les tables concernées, et les tests correspondants dans `supabase/tests/`.
2. **Écrire `supabase/migrations/NNN_nom.sql`** (numéro suivant) :
   - en-tête : ce que fait la migration, « À exécuter après NNN-1, AVANT de mettre en ligne le code qui l'utilise » ;
   - idempotente quand c'est simple (`IF NOT EXISTS`, `DROP POLICY IF EXISTS`) ;
   - nouvelle table : `ENABLE ROW LEVEL SECURITY` et politiques (privé : `user_id = auth.uid()` ; foyer : `household_id = my_household_id()` ; recette : `can_view_recipe()` / `owns_recipe()`) ;
   - politiques qui se citent l'une l'autre : passer par une fonction `SECURITY DEFINER SET search_path = public`, `REVOKE … FROM public, anon` puis `GRANT EXECUTE … TO authenticated` ;
   - remplacer une contrainte de colonne : son nom est `<table>_<colonne>_check`.
3. **Tests** : `supabase/tests/<nom>_tests.sql` avec `t_eq(libellé, obtenu, attendu)` et `t_fails(libellé, requête)`, en jouant les utilisateurs via `set_config('request.jwt.claim.sub', …)` sous `SET ROLE authenticated`. Tester ce qui doit passer ET ce qui doit être refusé (autre foyer, non-ami, visiteur). Ajouter le nom à `ORDER` dans `tests/db/run.mjs`.
4. `npm run test:db` doit passer en entier.
5. **Code** : types (`lib/types.ts`), lectures (`select(...)`) et écritures (`actions/`), export RGPD (`app/api/export/route.ts`) si c'est une donnée de l'utilisateur.
6. **Vie privée** : nouvelle donnée personnelle ou nouveau partage → `app/confidentialite/page.tsx` et `version` dans `lib/legal.ts`.
7. **Suivi** : dans `SUIVI.md`, section « Mise en ligne » : « Lancer `supabase/migrations/NNN_nom.sql` dans le SQL Editor (avant le push) ». Le dire en tête de la réponse : c'est Cheun qui lance les migrations, jamais Claude.
