-- ============================================================
-- 005_default_categories.sql
-- Catégories globales par défaut (publiques, non modifiables)
-- ============================================================
-- Ces catégories sont attachées à un profil système fictif.
-- Aucun utilisateur réel ne possède cet UUID → la RLS empêche
-- toute modification ou suppression par un utilisateur connecté.

SET session_replication_role = replica;

INSERT INTO profiles (id, full_name) VALUES
  ('00000000-0000-0000-0000-000000000000', 'Système')
ON CONFLICT DO NOTHING;

INSERT INTO categories (id, author_id, name, is_public) VALUES
  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000000', 'Entrées',  true),
  ('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000000', 'Plats',    true),
  ('00000000-0000-0000-0000-000000000303', '00000000-0000-0000-0000-000000000000', 'Desserts', true)
ON CONFLICT DO NOTHING;

SET session_replication_role = DEFAULT;
