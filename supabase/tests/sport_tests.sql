-- Produits scannés partagés dans le foyer, séances privées
INSERT INTO auth.users (id, raw_user_meta_data) VALUES ('e0000000-0000-0000-0000-000000000005', '{"full_name":"Eve"}');
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000001', false);  -- Léa
INSERT INTO custom_foods (household_id, barcode, name, energy_kcal, proteins_g) VALUES (my_household_id(), '3017620422003', 'Pâte à tartiner', 539, 6.3);
SELECT t_fails('code-barres invalide refusé',
  $q$INSERT INTO custom_foods (household_id, barcode, name) VALUES (my_household_id(), 'abc', 'x')$q$);
SELECT t_fails('valeur aberrante refusée (> 100 g pour 100 g)',
  $q$INSERT INTO custom_foods (household_id, name, proteins_g) VALUES (my_household_id(), 'x', 150)$q$);
INSERT INTO activities (user_id, done_on, activity_key, label, duration_min, met, kcal_net) VALUES (auth.uid(), current_date, 'run_8', 'Course', 30, 8.5, 250);
SELECT t_fails('séance pour un autre utilisateur refusée',
  $q$INSERT INTO activities (user_id, done_on, activity_key, label, duration_min, met, kcal_net) VALUES ('e0000000-0000-0000-0000-000000000005', current_date, 'x', 'x', 10, 3, 10)$q$);
SELECT set_config('request.jwt.claim.sub', 'e0000000-0000-0000-0000-000000000005', false);  -- Eve, autre foyer
SELECT t_eq('Eve ne voit pas les produits du foyer de Léa', (SELECT count(*) FROM custom_foods), 0);
SELECT t_eq('Eve ne voit pas les séances de Léa', (SELECT count(*) FROM activities), 0);
RESET ROLE;
