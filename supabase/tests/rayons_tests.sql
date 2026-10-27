-- Rayons : corrections et ordre réservés au foyer (après tests-rgpd : Léa a un foyer, Eve un autre)
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000001', false);  -- Léa
INSERT INTO aisle_overrides (household_id, name_norm, aisle) VALUES (my_household_id(), 'tofu fume', 'epicerie_salee');
SELECT t_fails('rayon inconnu refusé',
  $q$INSERT INTO aisle_overrides (household_id, name_norm, aisle) VALUES (my_household_id(), 'x', 'rayon_magique')$q$);
UPDATE households SET aisle_order = ARRAY['boissons', 'cremerie'] WHERE id = my_household_id();
SELECT t_eq('ordre enregistré', (SELECT array_length(aisle_order, 1) FROM households WHERE id = my_household_id()), 2);
SELECT t_fails('ordre avec un rayon inconnu refusé',
  $q$UPDATE households SET aisle_order = ARRAY['boissons', 'piscine'] WHERE id = my_household_id()$q$);

RESET ROLE;
SELECT set_config('test.lea_hh', (SELECT household_id::text FROM household_members WHERE user_id = 'a0000000-0000-0000-0000-000000000001'), false);
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'e0000000-0000-0000-0000-000000000005', false);  -- Eve, autre foyer
SELECT t_eq('Eve ne voit pas les corrections du foyer de Léa', (SELECT count(*) FROM aisle_overrides), 0);
SELECT t_fails('Eve ne peut pas écrire dans le foyer de Léa',
  $q$INSERT INTO aisle_overrides (household_id, name_norm, aisle) VALUES (current_setting('test.lea_hh')::uuid, 'pain', 'autre')$q$);
UPDATE households SET aisle_order = ARRAY['entretien'] WHERE id <> my_household_id();
RESET ROLE;
SELECT t_eq('Eve n''a pas pu changer l''ordre du foyer de Léa',
  ((SELECT aisle_order[1] FROM households h JOIN household_members m ON m.household_id = h.id WHERE m.user_id = 'a0000000-0000-0000-0000-000000000001') = 'boissons')::int, 1);
