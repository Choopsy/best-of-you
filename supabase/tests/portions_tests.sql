-- Portions : limites selon le mode (après tests-rayons : Léa a un foyer)
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000001', false);  -- Léa
INSERT INTO custom_foods (household_id, name, per_portion, energy_kcal, proteins_g, carbs_g, fat_g)
  VALUES (my_household_id(), 'Menu burger', true, 1264, 43, 119, 67);
SELECT t_eq('menu à 1 264 kcal la portion accepté', (SELECT count(*)::int FROM custom_foods WHERE name = 'Menu burger'), 1);
INSERT INTO custom_foods (household_id, name, per_portion, energy_kcal, proteins_g, carbs_g, sugars_g, fat_g, saturated_fat_g, fiber_g, salt_g)
  VALUES (my_household_id(), 'Pizza entière', true, 2400, 110, 260, 120, 105, 101, 102, 103);
SELECT t_eq('portion avec plus de 100 g de chaque nutriment acceptée (anciennes limites retirées)', (SELECT count(*)::int FROM custom_foods WHERE name = 'Pizza entière'), 1);
INSERT INTO custom_foods (household_id, name, energy_kcal, portion_grams) VALUES (my_household_id(), 'Yaourt', 60, 125);
SELECT t_eq('portion de 125 g sur un aliment « pour 100 g »', (SELECT portion_grams::int FROM custom_foods WHERE name = 'Yaourt'), 125);
SELECT t_fails('1 264 kcal « pour 100 g » refusé',
  $q$INSERT INTO custom_foods (household_id, name, energy_kcal) VALUES (my_household_id(), 'x', 1264)$q$);
SELECT t_fails('120 g de lipides « pour 100 g » refusé',
  $q$INSERT INTO custom_foods (household_id, name, energy_kcal, fat_g) VALUES (my_household_id(), 'x', 500, 120)$q$);
SELECT t_fails('valeur négative refusée',
  $q$INSERT INTO custom_foods (household_id, name, per_portion, energy_kcal, salt_g) VALUES (my_household_id(), 'x', true, 100, -1)$q$);
SELECT t_fails('portion de 0 g refusée',
  $q$INSERT INTO custom_foods (household_id, name, energy_kcal, portion_grams) VALUES (my_household_id(), 'x', 100, 0)$q$);
RESET ROLE;
