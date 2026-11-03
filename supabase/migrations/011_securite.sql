-- ═════════════════════════════════════════════════════════════════════════════
-- 011 : Corrections de l'audit de sécurité du 3 novembre 2026
--   - photos de recettes : plus personne ne peut lister tout le stockage (noms des photos
--     des recettes privées, identifiants des comptes) ; chacun ne liste que son dossier.
--     Les images restent affichables par leur lien (bucket public) ;
--   - fonctions SECURITY DEFINER : plus exécutables sans compte (anon) ; handle_new_user
--     (déclencheur de l'inscription) n'est appelable par personne ;
--   - photo_daily_limit : search_path fixé.
-- À exécuter après 010_photo_repas.sql, AVANT de mettre en ligne le code qui l'utilise.
-- ═════════════════════════════════════════════════════════════════════════════

-- ── Stockage ────────────────────────────────────────────────────────────────
-- L'ancienne règle laissait tout le monde lister le bucket. Un bucket public sert ses fichiers
-- par leur adresse sans passer par ces règles : elle n'était pas nécessaire pour les afficher.
DROP POLICY IF EXISTS "images_public_read" ON storage.objects;
DROP POLICY IF EXISTS "images_owner_read" ON storage.objects;
-- Lister son propre dossier reste possible : la suppression du compte efface ses photos ainsi
CREATE POLICY "images_owner_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'recipe-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ── Fonctions ───────────────────────────────────────────────────────────────
-- Postgres (et Supabase, par ses droits par défaut) donne EXECUTE à tout le monde. Toutes
-- refusent déjà sans session, mais on ne compte plus sur ce seul contrôle.
REVOKE EXECUTE ON FUNCTION
  accept_household_invite(uuid), can_see_custom_food(uuid), can_view_recipe(uuid),
  custom_food_in_visible_recipe(uuid), ensure_household(), in_my_household_plan(uuid),
  is_friend(uuid), leave_household(), my_household_id(), owns_collection(uuid),
  owns_recipe(uuid), recipe_of_step(uuid)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION
  accept_household_invite(uuid), can_see_custom_food(uuid), can_view_recipe(uuid),
  custom_food_in_visible_recipe(uuid), ensure_household(), in_my_household_plan(uuid),
  is_friend(uuid), leave_household(), my_household_id(), owns_collection(uuid),
  owns_recipe(uuid), recipe_of_step(uuid)
TO authenticated;

-- Déclencheur de l'inscription : Postgres ne vérifie pas EXECUTE quand un déclencheur s'exécute,
-- l'inscription continue donc de créer le profil ; un appel direct par l'API devient impossible
REVOKE EXECUTE ON FUNCTION handle_new_user() FROM PUBLIC, anon, authenticated;

-- ── search_path ─────────────────────────────────────────────────────────────
ALTER FUNCTION photo_daily_limit() SET search_path = public;
