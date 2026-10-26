-- ============================================================
-- 001_initial_schema.sql
-- Family Cookbook — schéma initial
-- ============================================================

-- ── Types ────────────────────────────────────────────────────

CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard');

-- ── Tables ───────────────────────────────────────────────────

CREATE TABLE profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE recipes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title           text NOT NULL,
  description     text,
  cover_image_url text,
  prep_time_min   integer CHECK (prep_time_min >= 0),
  cook_time_min   integer CHECK (cook_time_min >= 0),
  base_servings   integer CHECK (base_servings > 0),
  difficulty      difficulty_level,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE tags (
  id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name  text NOT NULL UNIQUE,
  color text
);

CREATE TABLE recipe_tags (
  recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  tag_id    uuid NOT NULL REFERENCES tags(id)    ON DELETE CASCADE,
  PRIMARY KEY (recipe_id, tag_id)
);

CREATE TABLE ingredient_groups (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid    NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  name      text    NOT NULL,
  position  integer NOT NULL DEFAULT 0
);

CREATE TABLE ingredients (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid    NOT NULL REFERENCES ingredient_groups(id) ON DELETE CASCADE,
  name     text    NOT NULL,
  amount   decimal CHECK (amount > 0),
  unit     text,
  position integer NOT NULL DEFAULT 0
);

CREATE TABLE steps (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid    NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  position  integer NOT NULL,
  content   text    NOT NULL,
  image_url text
);

-- ── Index utiles ──────────────────────────────────────────────

CREATE INDEX recipes_author_id_idx        ON recipes(author_id);
CREATE INDEX recipes_created_at_idx       ON recipes(created_at DESC);
CREATE INDEX ingredient_groups_recipe_idx ON ingredient_groups(recipe_id, position);
CREATE INDEX ingredients_group_idx        ON ingredients(group_id, position);
CREATE INDEX steps_recipe_position_idx    ON steps(recipe_id, position);

-- ── Trigger : création automatique du profil à l'inscription ──

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── Row Level Security ────────────────────────────────────────

ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags              ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_tags       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredient_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients       ENABLE ROW LEVEL SECURITY;
ALTER TABLE steps             ENABLE ROW LEVEL SECURITY;

-- Politique unique par table : tout utilisateur authentifié peut tout faire.
-- Usage familial — pas de restriction d'accès entre membres.

CREATE POLICY "authenticated full access"
  ON profiles FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "authenticated full access"
  ON recipes FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "authenticated full access"
  ON tags FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "authenticated full access"
  ON recipe_tags FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "authenticated full access"
  ON ingredient_groups FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "authenticated full access"
  ON ingredients FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "authenticated full access"
  ON steps FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
