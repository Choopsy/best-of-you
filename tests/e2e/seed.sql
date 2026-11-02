-- Données de démo pour les tests dans le navigateur (tests/e2e). Jamais sur la base en ligne.
-- Alice (foyer, recettes, frigo, journal) et Bob (ami d'Alice). Les deux ont donné leur accord santé.
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'alice@test.fr', '{"full_name":"Alice Martin"}'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'bob@test.fr', '{"full_name":"Bob Leroy"}');
UPDATE health_profiles SET sex='female', birth_date='1996-03-12', height_cm=165, activity_level='moderate',
  goal='lose', goal_rate_kg_week=0.5, target_weight_kg=60, diet='vegetarian', weekly_sessions_goal=3
  WHERE user_id='aaaaaaaa-0000-0000-0000-000000000001';
INSERT INTO weight_logs (user_id, weight_kg) VALUES ('aaaaaaaa-0000-0000-0000-000000000001', 64.5);
INSERT INTO friendships (requester_id, addressee_id, status) VALUES ('bbbbbbbb-0000-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000001','accepted');
INSERT INTO recipes (id, author_id, title, description, base_servings, difficulty, visibility, prep_time_min, cook_time_min) VALUES
 ('11111111-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','Crêpes protéinées','Pâte à crêpes avec du lait et des œufs.',4,'easy','friends',10,20),
 ('11111111-0000-0000-0000-000000000002','bbbbbbbb-0000-0000-0000-000000000002','Dahl de lentilles corail','Plat végétarien rassasiant.',4,'easy','public',10,25);
INSERT INTO ingredient_groups (id, recipe_id, name, position) VALUES
 ('22222222-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000001','',0),
 ('22222222-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000002','',0);
INSERT INTO ingredients (recipe_id, group_id, name, amount, unit, ciqual_code, weight_g, position)
SELECT '11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000001', v.name, v.amount, v.unit, ci.ciqual_code, v.w, v.pos
FROM (VALUES ('Farine de blé tendre ou froment T55 (pour pains)',200::numeric,'g',NULL::numeric,0),
             ('Lait demi-écrémé, pasteurisé',500,'ml',NULL,1),
             ('Oeuf, cru',3,'pièce',150,2),
             ('Sucre blanc',1,'c.s',NULL,3)) AS v(name, amount, unit, w, pos)
LEFT JOIN canonical_ingredients ci ON ci.name_fr = v.name;
INSERT INTO ingredients (recipe_id, group_id, name, amount, unit, position) VALUES
 ('11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000001','Vanille',1,'gousse',4);
INSERT INTO steps (recipe_id, position, content) VALUES
 ('11111111-0000-0000-0000-000000000001',1,'Mélanger la farine et les œufs, puis ajouter le lait petit à petit.'),
 ('11111111-0000-0000-0000-000000000001',2,'Cuire dans une poêle chaude.');
INSERT INTO recipe_tags (recipe_id, tag_id) SELECT '11111111-0000-0000-0000-000000000002', id FROM tags WHERE name IN ('Végétarien','Vegan');
INSERT INTO food_logs (user_id, eaten_on, meal, label, grams, energy_kcal, proteins_g, carbs_g, sugars_g, fat_g, saturated_fat_g, fiber_g, salt_g, ciqual_code)
VALUES ('aaaaaaaa-0000-0000-0000-000000000001', (now() AT TIME ZONE 'Europe/Paris')::date, 'breakfast', 'Yaourt nature', 125, 70, 5, 6, 6, 3, 2, 0, 0.1, null);
INSERT INTO fridge_items (household_id, name, ciqual_code, quantity, unit, expires_on)
SELECT m.household_id, v.name, v.code, v.q, v.u, (now() AT TIME ZONE 'Europe/Paris')::date + v.d
FROM household_members m,
  (VALUES ('Lait demi-écrémé, pasteurisé', '19042', 200::numeric, 'ml', 1),
          ('Yaourt nature', NULL, 4, 'pot', 0),
          ('Farine de blé tendre ou froment T55 (pour pains)', '9436', 1, 'kg', 120),
          ('Jambon blanc', NULL, 4, 'tranche', -1)) AS v(name, code, q, u, d)
WHERE m.user_id = 'aaaaaaaa-0000-0000-0000-000000000001';

UPDATE health_profiles SET health_consent_at = now();
