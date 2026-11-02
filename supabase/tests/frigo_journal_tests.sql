-- Frigo relié aux produits, retraits gardés dans le journal (après produits_recettes : Léa et Eve, foyers différents)
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000001', false);  -- Léa
INSERT INTO custom_foods (id, household_id, name, energy_kcal) VALUES ('f0000000-0000-0000-0000-0000000000b1', my_household_id(), 'Muesli croustillant', 450);
INSERT INTO fridge_items (household_id, name, quantity, unit, custom_food_id)
  VALUES (my_household_id(), 'Muesli croustillant', 500, 'g', 'f0000000-0000-0000-0000-0000000000b1');
SELECT t_eq('Léa relie un article du frigo à son produit', (SELECT count(*) FROM fridge_items WHERE custom_food_id = 'f0000000-0000-0000-0000-0000000000b1')::int, 1);

-- Le produit devient lisible par Eve via une recette publique… sans pouvoir entrer dans son frigo
INSERT INTO recipes (id, author_id, title, visibility) VALUES ('d0000000-0000-0000-0000-0000000000b1', auth.uid(), 'Bol de Léa', 'public');
INSERT INTO ingredient_groups (id, recipe_id, name) VALUES ('d1000000-0000-0000-0000-0000000000b1', 'd0000000-0000-0000-0000-0000000000b1', '');
INSERT INTO ingredients (recipe_id, group_id, name, amount, unit, custom_food_id)
  VALUES ('d0000000-0000-0000-0000-0000000000b1', 'd1000000-0000-0000-0000-0000000000b1', 'Muesli', 60, 'g', 'f0000000-0000-0000-0000-0000000000b1');

SELECT set_config('request.jwt.claim.sub', 'e0000000-0000-0000-0000-000000000005', false);  -- Eve
SELECT t_eq('Eve lit le produit (recette publique)', (SELECT count(*) FROM custom_foods WHERE id = 'f0000000-0000-0000-0000-0000000000b1')::int, 1);
SELECT t_fails('… mais ne peut pas le relier à son frigo',
  $q$INSERT INTO fridge_items (household_id, name, custom_food_id) VALUES (my_household_id(), 'x', 'f0000000-0000-0000-0000-0000000000b1')$q$);
SELECT t_eq('Eve ne voit pas le frigo de Léa', (SELECT count(*) FROM fridge_items WHERE name = 'Muesli croustillant')::int, 0);

-- Retraits gardés dans l'entrée du journal : privés
SELECT set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000001', false);  -- Léa
INSERT INTO food_logs (user_id, eaten_on, meal, label, energy_kcal, fridge_moves)
  VALUES (auth.uid(), '2026-11-02', 'breakfast', 'Muesli croustillant', 270, '[{"name": "Muesli croustillant", "unit": "g", "amount": 60}]');
SELECT t_eq('Léa enregistre les retraits avec son entrée', (SELECT count(*) FROM food_logs WHERE fridge_moves IS NOT NULL)::int, 1);
SELECT t_fails('les retraits sont une liste', $q$INSERT INTO food_logs (user_id, eaten_on, meal, label, fridge_moves) VALUES (auth.uid(), '2026-11-02', 'lunch', 'x', '{"a": 1}')$q$);
SELECT set_config('request.jwt.claim.sub', 'e0000000-0000-0000-0000-000000000005', false);  -- Eve
SELECT t_eq('Eve ne voit pas le journal de Léa', (SELECT count(*) FROM food_logs WHERE label = 'Muesli croustillant')::int, 0);
RESET ROLE;
