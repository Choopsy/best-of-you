-- Tests des règles de sécurité (RLS). Prévus pour un Postgres local avec des bouchons
-- auth.users / auth.uid() / storage (voir le README). Ne pas exécuter sur la base en ligne.
-- Tests de sécurité (RLS) : 3 utilisateurs. Alice et Bob sont amis, Carol non.
CREATE FUNCTION t_eq(label text, got bigint, want bigint) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF got IS DISTINCT FROM want THEN RAISE EXCEPTION 'ÉCHEC % : obtenu %, attendu %', label, got, want; END IF;
  RAISE NOTICE 'ok %', label;
END $$;

CREATE FUNCTION t_fails(label text, stmt text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE stmt;
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'ok % (refusé : %)', label, SQLERRM;
    RETURN;
  END;
  RAISE EXCEPTION 'ÉCHEC % : la requête aurait dû être refusée', label;
END $$;

INSERT INTO auth.users (id, raw_user_meta_data) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', '{"full_name":"Alice"}'),
  ('bbbbbbbb-0000-0000-0000-000000000002', '{"full_name":"Bob"}'),
  ('cccccccc-0000-0000-0000-000000000003', '{"full_name":"Carol"}');

SELECT t_eq('profils créés par le trigger', (SELECT count(*) FROM profiles), 3);
SELECT t_eq('profils santé créés par le trigger', (SELECT count(*) FROM health_profiles), 3);

-- ── Alice crée 3 recettes ──
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', false);

INSERT INTO recipes (id, author_id, title, visibility) VALUES
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Privée', 'private'),
  ('11111111-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Amis', 'friends'),
  ('11111111-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'Publique', 'public');
INSERT INTO ingredient_groups (id, recipe_id, name) VALUES
  ('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', ''),
  ('22222222-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000002', ''),
  ('22222222-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000003', '');
INSERT INTO ingredients (recipe_id, group_id, name, amount, unit, ciqual_code) VALUES
  ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'Farine', 200, 'g', '9410'),
  ('11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002', 'Lait',   250, 'ml', '19024'),
  ('11111111-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000003', 'Oeuf',   2, 'pièce', '22000');
INSERT INTO steps (id, recipe_id, position, content) VALUES
  ('33333333-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 1, 'Mélanger');
INSERT INTO step_ingredients (step_id, ingredient_id)
  SELECT '33333333-0000-0000-0000-000000000001', id FROM ingredients WHERE recipe_id = '11111111-0000-0000-0000-000000000001';
UPDATE health_profiles SET sex = 'female', height_cm = 165 WHERE user_id = auth.uid();
INSERT INTO weight_logs (user_id, weight_kg) VALUES (auth.uid(), 62);
INSERT INTO food_logs (user_id, eaten_on, meal, label, energy_kcal) VALUES (auth.uid(), current_date, 'lunch', 'Test', 500);
INSERT INTO collections (id, owner_id, name) VALUES ('44444444-0000-0000-0000-000000000001', auth.uid(), 'Ma collection');
INSERT INTO collection_recipes (collection_id, recipe_id) VALUES ('44444444-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001');
SELECT t_eq('alice voit ses 3 recettes', (SELECT count(*) FROM recipes), 3);

-- Insertion dans le dossier d'un autre utilisateur refusée
SELECT t_fails('alice ne peut pas écrire dans le dossier image de bob',
  $q$INSERT INTO storage.objects (bucket_id, name) VALUES ('recipe-images', 'bbbbbbbb-0000-0000-0000-000000000002/x.jpg')$q$);
INSERT INTO storage.objects (bucket_id, name) VALUES ('recipe-images', 'aaaaaaaa-0000-0000-0000-000000000001/x.jpg');

-- ── Bob envoie une demande d'ami ──
SELECT set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', false);
SELECT t_fails('bob ne peut pas créer une amitié déjà acceptée',
  $q$INSERT INTO friendships (requester_id, addressee_id, status) VALUES ('bbbbbbbb-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'accepted')$q$);
INSERT INTO friendships (requester_id, addressee_id) VALUES ('bbbbbbbb-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001');
SELECT t_eq('demande en attente : bob ne voit que la recette publique', (SELECT count(*) FROM recipes), 1);
-- Bob ne peut pas accepter sa propre demande
UPDATE friendships SET status = 'accepted';
SELECT t_eq('bob ne peut pas accepter sa propre demande', (SELECT count(*) FROM friendships WHERE status = 'accepted'), 0);

-- ── Alice accepte ──
SELECT set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', false);
UPDATE friendships SET status = 'accepted' WHERE addressee_id = auth.uid();

-- ── Bob (ami) ──
SELECT set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', false);
SELECT t_eq('ami : voit publique + amis', (SELECT count(*) FROM recipes), 2);
SELECT t_eq('ami : voit les ingrédients des 2 recettes visibles', (SELECT count(*) FROM ingredients), 2);
SELECT t_eq('ami : ne voit pas les étapes de la recette privée', (SELECT count(*) FROM steps), 0);
SELECT t_eq('ami : ne voit pas les liens étape-ingrédient privés', (SELECT count(*) FROM step_ingredients), 0);
UPDATE recipes SET title = 'piraté';
SELECT t_eq('ami : ne peut modifier aucune recette d''alice', (SELECT count(*) FROM recipes WHERE title = 'piraté'), 0);
UPDATE ingredients SET name = 'piraté';
SELECT t_eq('ami : ne peut modifier aucun ingrédient d''alice', (SELECT count(*) FROM ingredients WHERE name = 'piraté'), 0);
DELETE FROM ingredients;
SELECT t_fails('ami : ne peut pas ajouter un ingrédient à la recette d''alice',
  $q$INSERT INTO ingredients (recipe_id, group_id, name) VALUES ('11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002', 'x')$q$);
SELECT t_eq('ami : ne voit pas le profil santé d''alice', (SELECT count(*) FROM health_profiles WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000001'), 0);
SELECT t_eq('ami : ne voit pas les pesées d''alice', (SELECT count(*) FROM weight_logs), 0);
SELECT t_eq('ami : ne voit pas le journal d''alice', (SELECT count(*) FROM food_logs), 0);
SELECT t_eq('ami : ne voit pas les collections d''alice', (SELECT count(*) FROM collections), 0);
SELECT t_fails('ami : ne peut pas ajouter dans la collection d''alice',
  $q$INSERT INTO collection_recipes (collection_id, recipe_id) VALUES ('44444444-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000003')$q$);
INSERT INTO recipe_reviews (recipe_id, user_id, rating) VALUES ('11111111-0000-0000-0000-000000000002', auth.uid(), 5);
SELECT t_fails('ami : ne peut pas noter la recette privée',
  $q$INSERT INTO recipe_reviews (recipe_id, user_id, rating) VALUES ('11111111-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 5)$q$);
SELECT t_fails('ami : ne peut pas partager la recette d''alice',
  $q$INSERT INTO recipe_shares (recipe_id, user_id, shared_by) VALUES ('11111111-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002')$q$);

-- ── Alice partage la recette privée avec Bob, et tente avec Carol ──
SELECT set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', false);
INSERT INTO recipe_shares (recipe_id, user_id, shared_by) VALUES ('11111111-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', auth.uid());
SELECT t_fails('alice ne peut pas partager avec carol (pas amie)',
  $q$INSERT INTO recipe_shares (recipe_id, user_id, shared_by) VALUES ('11111111-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001')$q$);
SELECT t_eq('alice voit l''avis de bob', (SELECT count(*) FROM recipe_reviews), 1);

SELECT set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', false);
SELECT t_eq('après partage : bob voit les 3 recettes', (SELECT count(*) FROM recipes), 3);
SELECT t_eq('après partage : bob voit les étapes de la recette partagée', (SELECT count(*) FROM steps), 1);

-- ── Carol (inconnue) ──
SELECT set_config('request.jwt.claim.sub', 'cccccccc-0000-0000-0000-000000000003', false);
SELECT t_eq('inconnue : voit seulement la recette publique', (SELECT count(*) FROM recipes), 1);
SELECT t_eq('inconnue : voit les noms des profils (recherche d''amis)', (SELECT count(*) FROM profiles), 3);
SELECT t_eq('inconnue : ne voit aucun profil santé sauf le sien', (SELECT count(*) FROM health_profiles), 1);
SELECT t_eq('inconnue : ne voit pas l''avis sur la recette amis', (SELECT count(*) FROM recipe_reviews), 0);
SELECT t_eq('inconnue : ne voit pas les partages des autres', (SELECT count(*) FROM recipe_shares), 0);
UPDATE profiles SET full_name = 'piraté' WHERE id = 'aaaaaaaa-0000-0000-0000-000000000001';

-- ── Fin ──
RESET ROLE;
SELECT t_eq('le profil d''alice n''a pas été modifié par carol', (SELECT count(*) FROM profiles WHERE full_name = 'piraté'), 0);
SELECT t_eq('ingrédients d''alice intacts', (SELECT count(*) FROM ingredients), 3);
-- Suppression d'un utilisateur : tout part en cascade
DELETE FROM auth.users WHERE id = 'aaaaaaaa-0000-0000-0000-000000000001';
SELECT t_eq('suppression du compte : recettes supprimées', (SELECT count(*) FROM recipes), 0);
SELECT t_eq('suppression du compte : journal supprimé', (SELECT count(*) FROM food_logs), 0);
