-- ============================================================
-- seed.sql — Données de test Family Cookbook
-- ============================================================
-- Les UUIDs des profils ne correspondent pas à de vrais auth.users.
-- On désactive temporairement les FK pour pouvoir seeder sans Supabase Auth.
-- NE PAS utiliser en production.

SET session_replication_role = replica;

-- ── Profil de test ────────────────────────────────────────────

INSERT INTO profiles (id, full_name, avatar_url) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Marie Dupont', null);

-- ── Tags ──────────────────────────────────────────────────────

INSERT INTO tags (id, name, color) VALUES
  ('00000000-0000-0000-0000-000000000101', 'Classique',  '#F59E0B'),
  ('00000000-0000-0000-0000-000000000102', 'Végétarien', '#10B981'),
  ('00000000-0000-0000-0000-000000000103', 'Hiver',      '#3B82F6'),
  ('00000000-0000-0000-0000-000000000104', 'Dessert',    '#EC4899'),
  ('00000000-0000-0000-0000-000000000105', 'Familial',   '#8B5CF6');

-- ── Catégories ────────────────────────────────────────────────

INSERT INTO categories (id, author_id, name, is_public) VALUES
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000001', 'Plats principaux', true),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000001', 'Desserts',         true);

-- ════════════════════════════════════════════════════════════
-- Recette 1 — Quiche Lorraine
-- ════════════════════════════════════════════════════════════

INSERT INTO recipes (id, author_id, title, description, prep_time_min, cook_time_min, base_servings, difficulty, category_id) VALUES (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  'Quiche Lorraine',
  'La recette familiale par excellence : une pâte brisée croustillante, des lardons dorés et un appareil à la crème bien parfumé. Simple, rapide et toujours plébiscitée.',
  20, 35, 6, 'easy', '00000000-0000-0000-0000-000000000201'
);

INSERT INTO recipe_tags (recipe_id, tag_id) VALUES
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000101'),
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000105');

INSERT INTO ingredient_groups (id, recipe_id, name, position) VALUES
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000010', 'Pâte brisée', 0),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000010', 'Appareil',    1);

INSERT INTO ingredients (group_id, name, amount, unit, position) VALUES
  ('00000000-0000-0000-0000-000000000011', 'Farine',         200,  'g',   0),
  ('00000000-0000-0000-0000-000000000011', 'Beurre froid',   100,  'g',   1),
  ('00000000-0000-0000-0000-000000000011', 'Eau froide',     3,    'càs', 2),
  ('00000000-0000-0000-0000-000000000011', 'Sel',            1,    'pincée', 3),
  ('00000000-0000-0000-0000-000000000012', 'Lardons fumés',  200,  'g',   0),
  ('00000000-0000-0000-0000-000000000012', 'Crème fraîche',  20,   'cl',  1),
  ('00000000-0000-0000-0000-000000000012', 'Œufs',           3,    null,  2),
  ('00000000-0000-0000-0000-000000000012', 'Gruyère râpé',   80,   'g',   3),
  ('00000000-0000-0000-0000-000000000012', 'Noix de muscade',null, null,  4);

INSERT INTO steps (recipe_id, position, content) VALUES
  ('00000000-0000-0000-0000-000000000010', 1, 'Préparer la pâte brisée : mélanger la farine et le sel, sabler avec le beurre froid coupé en dés, puis lier avec l''eau froide. Former une boule, filmer et réfrigérer 30 min.'),
  ('00000000-0000-0000-0000-000000000010', 2, 'Préchauffer le four à 180 °C. Foncer un moule à tarte de 28 cm avec la pâte brisée. Piquer le fond à la fourchette et faire cuire à blanc 10 min.'),
  ('00000000-0000-0000-0000-000000000010', 3, 'Faire revenir les lardons dans une poêle sans matière grasse jusqu''à légère coloration. Égoutter et disposer sur le fond de tarte.'),
  ('00000000-0000-0000-0000-000000000010', 4, 'Battre les œufs avec la crème, saler légèrement, poivrer et râper un peu de noix de muscade. Verser sur les lardons. Parsemer de gruyère râpé.'),
  ('00000000-0000-0000-0000-000000000010', 5, 'Enfourner 25 min jusqu''à ce que l''appareil soit pris et légèrement doré. Servir tiède avec une salade verte.');

-- ════════════════════════════════════════════════════════════
-- Recette 2 — Tarte Tatin
-- ════════════════════════════════════════════════════════════

INSERT INTO recipes (id, author_id, title, description, prep_time_min, cook_time_min, base_servings, difficulty, category_id) VALUES (
  '00000000-0000-0000-0000-000000000020',
  '00000000-0000-0000-0000-000000000001',
  'Tarte Tatin aux pommes',
  'Le grand classique français renversé : des pommes fondantes caramélisées sous une pâte feuilletée dorée. La légende dit qu''elle fut inventée par accident par les sœurs Tatin au XIXe siècle.',
  25, 40, 6, 'medium', '00000000-0000-0000-0000-000000000202'
);

INSERT INTO recipe_tags (recipe_id, tag_id) VALUES
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000101'),
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000104'),
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000102');

INSERT INTO ingredient_groups (id, recipe_id, name, position) VALUES
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000020', 'Caramel & pommes', 0),
  ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000020', 'Pâte',            1);

INSERT INTO ingredients (group_id, name, amount, unit, position) VALUES
  ('00000000-0000-0000-0000-000000000021', 'Pommes Golden',     1.2,  'kg',  0),
  ('00000000-0000-0000-0000-000000000021', 'Sucre',             150,  'g',   1),
  ('00000000-0000-0000-0000-000000000021', 'Beurre demi-sel',   80,   'g',   2),
  ('00000000-0000-0000-0000-000000000021', 'Extrait de vanille',1,    'càc', 3),
  ('00000000-0000-0000-0000-000000000022', 'Pâte feuilletée',   1,    'rouleau', 0);

INSERT INTO steps (recipe_id, position, content) VALUES
  ('00000000-0000-0000-0000-000000000020', 1, 'Éplucher les pommes, les couper en quartiers et retirer le cœur. Réserver.'),
  ('00000000-0000-0000-0000-000000000020', 2, 'Dans une poêle allant au four (ou un moule à tatin), faire fondre le beurre à feu moyen. Ajouter le sucre et cuire sans remuer jusqu''à obtenir un caramel ambré.'),
  ('00000000-0000-0000-0000-000000000020', 3, 'Hors du feu, ajouter la vanille et disposer les quartiers de pomme debout, bien serrés, en cercles concentriques sur le caramel.'),
  ('00000000-0000-0000-0000-000000000020', 4, 'Cuire les pommes 15 min à feu doux pour les précuire dans le caramel. Préchauffer le four à 200 °C.'),
  ('00000000-0000-0000-0000-000000000020', 5, 'Dérouler la pâte feuilletée et la poser sur les pommes en rentrant les bords à l''intérieur du moule. Enfourner 25 min jusqu''à ce que la pâte soit bien dorée.'),
  ('00000000-0000-0000-0000-000000000020', 6, 'Laisser tiédir 5 min, puis retourner d''un geste rapide sur un plat de service. Servir tiède avec une boule de glace vanille.');

-- ════════════════════════════════════════════════════════════
-- Recette 3 — Bœuf Bourguignon
-- ════════════════════════════════════════════════════════════

INSERT INTO recipes (id, author_id, title, description, prep_time_min, cook_time_min, base_servings, difficulty, category_id) VALUES (
  '00000000-0000-0000-0000-000000000030',
  '00000000-0000-0000-0000-000000000001',
  'Bœuf Bourguignon',
  'Le plat mijoté emblématique de la cuisine française. Du bœuf tendre confit dans un vin de Bourgogne avec des champignons et des lardons. Se prépare idéalement la veille — il n''en sera que meilleur.',
  30, 180, 6, 'hard', '00000000-0000-0000-0000-000000000201'
);

INSERT INTO recipe_tags (recipe_id, tag_id) VALUES
  ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000101'),
  ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000103'),
  ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000105');

INSERT INTO ingredient_groups (id, recipe_id, name, position) VALUES
  ('00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000030', 'Viande & marinade',  0),
  ('00000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000030', 'Garniture',          1),
  ('00000000-0000-0000-0000-000000000033', '00000000-0000-0000-0000-000000000030', 'Liaison & aromates', 2);

INSERT INTO ingredients (group_id, name, amount, unit, position) VALUES
  ('00000000-0000-0000-0000-000000000031', 'Bœuf à braiser (paleron ou joue)', 1.2, 'kg',  0),
  ('00000000-0000-0000-0000-000000000031', 'Vin rouge de Bourgogne',           75,  'cl',  1),
  ('00000000-0000-0000-0000-000000000031', 'Cognac',                           2,   'càs', 2),
  ('00000000-0000-0000-0000-000000000032', 'Lardons fumés',                    150, 'g',   0),
  ('00000000-0000-0000-0000-000000000032', 'Champignons de Paris',             250, 'g',   1),
  ('00000000-0000-0000-0000-000000000032', 'Carottes',                         3,   null,  2),
  ('00000000-0000-0000-0000-000000000032', 'Oignons grelots',                  200, 'g',   3),
  ('00000000-0000-0000-0000-000000000032', 'Ail',                              3,   'gousses', 4),
  ('00000000-0000-0000-0000-000000000033', 'Bouquet garni (thym, laurier, persil)', null, null, 0),
  ('00000000-0000-0000-0000-000000000033', 'Farine',                           2,   'càs', 1),
  ('00000000-0000-0000-0000-000000000033', 'Concentré de tomate',              1,   'càs', 2),
  ('00000000-0000-0000-0000-000000000033', 'Bouillon de bœuf',                 20,  'cl',  3),
  ('00000000-0000-0000-0000-000000000033', 'Huile',                            2,   'càs', 4);

INSERT INTO steps (recipe_id, position, content) VALUES
  ('00000000-0000-0000-0000-000000000030', 1, 'Couper le bœuf en cubes de 5 cm. Les faire mariner dans le vin avec le cognac, les carottes en rondelles et l''ail écrasé pendant au moins 2 h (idéalement une nuit au réfrigérateur).'),
  ('00000000-0000-0000-0000-000000000030', 2, 'Égoutter et sécher la viande. Conserver la marinade. Dans une cocotte, faire revenir les lardons puis les réserver. Saisir les morceaux de bœuf en plusieurs fois jusqu''à belle coloration sur toutes les faces.'),
  ('00000000-0000-0000-0000-000000000030', 3, 'Singer la viande (saupoudrer de farine), mélanger et cuire 2 min. Ajouter le concentré de tomate, la marinade filtrée et le bouillon. Porter à ébullition.'),
  ('00000000-0000-0000-0000-000000000030', 4, 'Ajouter le bouquet garni et les lardons. Couvrir et laisser mijoter à feu très doux 2 h 30, en remuant de temps en temps.'),
  ('00000000-0000-0000-0000-000000000030', 5, 'Pendant ce temps, faire dorer les oignons grelots et les champignons séparément dans du beurre. Les ajouter dans la cocotte pour les 30 dernières minutes de cuisson.'),
  ('00000000-0000-0000-0000-000000000030', 6, 'Vérifier l''assaisonnement. La viande doit se défaire à la fourchette. Servir avec des pommes de terre vapeur, des tagliatelles fraîches ou du pain de campagne.');

-- ── Rétablir les vérifications FK ────────────────────────────

SET session_replication_role = DEFAULT;
