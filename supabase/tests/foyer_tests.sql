-- Tests du foyer (RLS). Banc d'essai local uniquement, à lancer après rls_tests.sql. Ne pas exécuter sur la base en ligne.
-- Tests du foyer (exécutés après tests.sql, qui a supprimé Alice à la fin) : nouveaux comptes.
INSERT INTO auth.users (id, raw_user_meta_data) VALUES
  ('a0000000-0000-0000-0000-000000000001', '{"full_name":"Léa"}'),
  ('b0000000-0000-0000-0000-000000000002', '{"full_name":"Tom"}'),
  ('c0000000-0000-0000-0000-000000000003', '{"full_name":"Zoé"}');
SELECT t_eq('foyer créé à l''inscription pour chacun', (SELECT count(*) FROM household_members WHERE user_id::text LIKE '_0000000%'), 3);
INSERT INTO friendships (requester_id, addressee_id, status) VALUES ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'accepted');

SET ROLE authenticated;
-- Léa : une recette privée, un aliment au frigo
SELECT set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000001', false);
INSERT INTO recipes (id, author_id, title, visibility) VALUES ('d0000000-0000-0000-0000-000000000001', auth.uid(), 'Gratin privé', 'private');
INSERT INTO fridge_items (household_id, name, quantity, unit) VALUES (my_household_id(), 'Lait', 1000, 'ml');
SELECT t_fails('Léa ne peut pas inviter Zoé (pas amie)',
  $q$INSERT INTO household_invites (household_id, invited_user_id, invited_by) VALUES (my_household_id(), 'c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001')$q$);
INSERT INTO household_invites (household_id, invited_user_id, invited_by) VALUES (my_household_id(), 'b0000000-0000-0000-0000-000000000002', auth.uid());

-- Tom : a déjà un aliment, accepte l'invitation
SELECT set_config('request.jwt.claim.sub', 'b0000000-0000-0000-0000-000000000002', false);
INSERT INTO fridge_items (household_id, name, quantity, unit) VALUES (my_household_id(), 'Oeufs', 6, 'pièce');
SELECT t_eq('Tom voit le nom du foyer qui l''invite', (SELECT count(*) FROM households), 2);
SELECT t_fails('Tom ne peut pas s''ajouter seul dans le foyer de Léa',
  $q$INSERT INTO household_members (household_id, user_id) SELECT household_id, 'b0000000-0000-0000-0000-000000000002' FROM household_invites LIMIT 1$q$);
SELECT accept_household_invite((SELECT id FROM household_invites LIMIT 1));
SELECT t_eq('après acceptation : frigo commun (lait + œufs apportés)', (SELECT count(*) FROM fridge_items), 2);
SELECT t_eq('après acceptation : 2 membres visibles', (SELECT count(*) FROM household_members), 2);
SELECT t_eq('Tom ne voit pas encore la recette privée de Léa', (SELECT count(*) FROM recipes WHERE id = 'd0000000-0000-0000-0000-000000000001'), 0);
SELECT t_fails('Tom ne peut pas planifier une recette qu''il ne voit pas',
  $q$INSERT INTO meal_plan (household_id, planned_on, meal, recipe_id) VALUES (my_household_id(), current_date, 'dinner', 'd0000000-0000-0000-0000-000000000001')$q$);

-- Léa planifie sa recette privée : Tom peut alors la lire
SELECT set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000001', false);
INSERT INTO meal_plan (household_id, planned_on, meal, recipe_id, servings) VALUES (my_household_id(), current_date, 'dinner', 'd0000000-0000-0000-0000-000000000001', 2);
INSERT INTO shopping_items (household_id, name, source) VALUES (my_household_id(), 'Pain', 'manual');
SELECT set_config('request.jwt.claim.sub', 'b0000000-0000-0000-0000-000000000002', false);
SELECT t_eq('recette planifiée : Tom la lit', (SELECT count(*) FROM recipes WHERE id = 'd0000000-0000-0000-0000-000000000001'), 1);
SELECT t_eq('liste de courses commune', (SELECT count(*) FROM shopping_items), 1);
UPDATE shopping_items SET checked = true;
SELECT t_eq('Tom coche un article', (SELECT count(*) FROM shopping_items WHERE checked), 1);
UPDATE recipes SET title = 'piraté' WHERE id = 'd0000000-0000-0000-0000-000000000001';

-- Zoé ne voit rien du foyer
RESET ROLE;
SELECT set_config('test.lea_hid', (SELECT household_id::text FROM household_members WHERE user_id = 'a0000000-0000-0000-0000-000000000001'), false);
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'c0000000-0000-0000-0000-000000000003', false);
SELECT t_eq('Zoé : frigo du foyer invisible', (SELECT count(*) FROM fridge_items), 0);
SELECT t_eq('Zoé : planning invisible', (SELECT count(*) FROM meal_plan), 0);
SELECT t_eq('Zoé : courses invisibles', (SELECT count(*) FROM shopping_items), 0);
SELECT t_eq('Zoé : recette privée invisible', (SELECT count(*) FROM recipes WHERE id = 'd0000000-0000-0000-0000-000000000001'), 0);
SELECT t_fails('Zoé ne peut pas écrire dans le frigo du foyer',
  $q$INSERT INTO fridge_items (household_id, name) VALUES (current_setting('test.lea_hid')::uuid, 'x')$q$);
SELECT t_fails('Zoé ne peut pas accepter une invitation qui ne lui est pas destinée',
  $q$SELECT accept_household_invite(gen_random_uuid())$q$);

-- Tom quitte le foyer
SELECT set_config('request.jwt.claim.sub', 'b0000000-0000-0000-0000-000000000002', false);
SELECT leave_household();
SELECT t_eq('après départ : nouveau frigo vide', (SELECT count(*) FROM fridge_items), 0);
SELECT t_eq('après départ : recette privée de Léa de nouveau invisible', (SELECT count(*) FROM recipes WHERE id = 'd0000000-0000-0000-0000-000000000001'), 0);

RESET ROLE;
SELECT t_eq('Tom n''a pas pu renommer la recette de Léa', (SELECT count(*) FROM recipes WHERE title = 'piraté'), 0);
SELECT t_eq('le frigo de Léa garde les 2 aliments', (SELECT count(*) FROM fridge_items f JOIN household_members m ON m.household_id = f.household_id WHERE m.user_id = 'a0000000-0000-0000-0000-000000000001'), 2);
