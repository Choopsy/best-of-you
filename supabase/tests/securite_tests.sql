-- Corrections de l'audit (migration 011) : stockage non listable, fonctions fermées aux visiteurs
-- (après photo_repas : Alice a une photo dans son dossier depuis rls_tests ; Léa, Eve existent)

-- ── Stockage : chacun ne liste que son dossier ──
RESET ROLE;
INSERT INTO storage.objects (bucket_id, name) VALUES ('recipe-images', 'e0000000-0000-0000-0000-000000000005/eve.jpg');
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', false);  -- Alice
SELECT t_eq('Alice liste son propre dossier', (SELECT count(*) FROM storage.objects WHERE name LIKE 'aaaaaaaa-%')::int, 1);
SELECT t_eq('… et pas celui d''Eve', (SELECT count(*) FROM storage.objects WHERE name LIKE 'e0000000-%')::int, 0);
SET ROLE anon;
SELECT set_config('request.jwt.claim.sub', '', false);
SELECT t_eq('visiteur : ne liste aucune photo', (SELECT count(*) FROM storage.objects)::int, 0);

-- ── Fonctions : rien d'exécutable sans compte ──
SELECT t_fails('visiteur : ensure_household refusé', $q$SELECT ensure_household()$q$);
SELECT t_fails('visiteur : can_view_recipe refusé', $q$SELECT can_view_recipe('11111111-0000-0000-0000-000000000003')$q$);
SELECT t_fails('visiteur : is_friend refusé', $q$SELECT is_friend('aaaaaaaa-0000-0000-0000-000000000001')$q$);
SELECT t_fails('visiteur : accept_household_invite refusé', $q$SELECT accept_household_invite('00000000-0000-0000-0000-000000000000')$q$);
SELECT t_fails('visiteur : handle_new_user refusé', $q$SELECT handle_new_user()$q$);

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'e0000000-0000-0000-0000-000000000005', false);  -- Eve
SELECT t_eq('connectée : can_view_recipe répond toujours (recette publique de Léa)', can_view_recipe('d0000000-0000-0000-0000-0000000000b1')::int, 1);
SELECT t_eq('connectée : les règles qui appellent ces fonctions marchent (ingrédients visibles)', (SELECT count(*) FROM ingredients WHERE recipe_id = 'd0000000-0000-0000-0000-0000000000b1')::int, 1);
SELECT t_fails('connectée : handle_new_user refusé (déclencheur seulement)', $q$SELECT handle_new_user()$q$);
RESET ROLE;

-- L'inscription crée toujours le profil (le déclencheur n'a pas besoin de EXECUTE)
INSERT INTO auth.users (id, raw_user_meta_data) VALUES ('f0000000-0000-0000-0000-000000000099', '{"full_name":"Zoé"}');
SELECT t_eq('inscription : profil créé par le déclencheur', (SELECT count(*) FROM profiles WHERE id = 'f0000000-0000-0000-0000-000000000099')::int, 1);
