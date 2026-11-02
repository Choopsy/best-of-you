-- Produits dans les recettes (après tests-portions : Léa a un foyer et des produits, Eve un autre foyer, sans amitié)
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000001', false);  -- Léa
INSERT INTO custom_foods (id, household_id, name, energy_kcal) VALUES ('f0000000-0000-0000-0000-0000000000a1', my_household_id(), 'Crème Isigny', 300);
INSERT INTO recipes (id, author_id, title, visibility) VALUES ('d0000000-0000-0000-0000-0000000000a1', auth.uid(), 'Tarte de Léa', 'private');
INSERT INTO ingredient_groups (id, recipe_id, name) VALUES ('d1000000-0000-0000-0000-0000000000a1', 'd0000000-0000-0000-0000-0000000000a1', '');
INSERT INTO ingredients (recipe_id, group_id, name, amount, unit, custom_food_id)
  VALUES ('d0000000-0000-0000-0000-0000000000a1', 'd1000000-0000-0000-0000-0000000000a1', 'Crème Isigny', 200, 'g', 'f0000000-0000-0000-0000-0000000000a1');
SELECT t_eq('Léa lie son produit à sa recette', (SELECT count(*) FROM ingredients WHERE custom_food_id IS NOT NULL), 1);

SELECT set_config('request.jwt.claim.sub', 'e0000000-0000-0000-0000-000000000005', false);  -- Eve
SELECT t_eq('recette privée : Eve ne voit pas le produit de Léa', (SELECT count(*) FROM custom_foods WHERE id = 'f0000000-0000-0000-0000-0000000000a1'), 0);
INSERT INTO recipes (id, author_id, title, visibility) VALUES ('d0000000-0000-0000-0000-0000000000e1', auth.uid(), 'Recette d''Eve', 'private');
INSERT INTO ingredient_groups (id, recipe_id, name) VALUES ('d1000000-0000-0000-0000-0000000000e1', 'd0000000-0000-0000-0000-0000000000e1', '');
SELECT t_fails('Eve ne peut pas lier un produit qu''elle ne voit pas',
  $q$INSERT INTO ingredients (recipe_id, group_id, name, custom_food_id) VALUES ('d0000000-0000-0000-0000-0000000000e1', 'd1000000-0000-0000-0000-0000000000e1', 'x', 'f0000000-0000-0000-0000-0000000000a1')$q$);

SELECT set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000001', false);  -- Léa publie sa recette
UPDATE recipes SET visibility = 'public' WHERE id = 'd0000000-0000-0000-0000-0000000000a1';
SELECT set_config('request.jwt.claim.sub', 'e0000000-0000-0000-0000-000000000005', false);  -- Eve
SELECT t_eq('recette publique : Eve lit le produit utilisé (pour la nutrition)', (SELECT count(*) FROM custom_foods WHERE id = 'f0000000-0000-0000-0000-0000000000a1'), 1);
SELECT t_eq('… mais seulement celui-là, pas les autres produits du foyer de Léa', (SELECT count(*) FROM custom_foods WHERE name IN ('Yaourt', 'Menu burger')), 0);
UPDATE custom_foods SET energy_kcal = 1 WHERE id = 'f0000000-0000-0000-0000-0000000000a1';
RESET ROLE;
SELECT t_eq('Eve ne peut pas modifier le produit de Léa', (SELECT energy_kcal::int FROM custom_foods WHERE id = 'f0000000-0000-0000-0000-0000000000a1'), 300);
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000001', false);
DELETE FROM custom_foods WHERE id = 'f0000000-0000-0000-0000-0000000000a1';
SELECT t_eq('produit supprimé : l''ingrédient reste, sans lien', (SELECT count(*) FROM ingredients WHERE recipe_id = 'd0000000-0000-0000-0000-0000000000a1' AND custom_food_id IS NULL), 1);
RESET ROLE;
