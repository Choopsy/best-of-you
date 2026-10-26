-- ============================================================
-- 002_schema.sql
-- Schéma complet de l'application (base neuve).
-- À exécuter APRÈS 001_ciqual.sql, dans Supabase > SQL Editor.
--
-- Principe de sécurité : chaque utilisateur ne voit que
--   - ses propres données (profil santé, poids, journal, collections) ;
--   - les recettes publiques, celles de ses amis marquées « amis »,
--     et celles qu'on lui a partagées.
-- ============================================================

-- ── Types ────────────────────────────────────────────────────

CREATE TYPE difficulty_level  AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE recipe_visibility AS ENUM ('private', 'friends', 'public');
CREATE TYPE sex_type          AS ENUM ('male', 'female');
-- Niveaux d'activité physique (PAL) de l'EFSA : 1,4 / 1,6 / 1,8 / 2,0
CREATE TYPE activity_level    AS ENUM ('sedentary', 'moderate', 'active', 'very_active');
CREATE TYPE goal_type         AS ENUM ('lose', 'maintain', 'gain_muscle');
CREATE TYPE diet_type         AS ENUM ('omnivore', 'pescatarian', 'vegetarian', 'vegan');
CREATE TYPE meal_type         AS ENUM ('breakfast', 'lunch', 'dinner', 'snack');

-- ── Profils ──────────────────────────────────────────────────
-- Visible par tous les utilisateurs connectés (nom + avatar, pour les amis).
-- Les données de santé sont dans health_profiles, privée.

CREATE TABLE profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE health_profiles (
  user_id               uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  sex                   sex_type,
  birth_date            date,
  height_cm             numeric CHECK (height_cm BETWEEN 100 AND 250),
  activity_level        activity_level,
  goal                  goal_type NOT NULL DEFAULT 'maintain',
  -- Rythme visé en cas de perte de poids (kg / semaine)
  goal_rate_kg_week     numeric CHECK (goal_rate_kg_week IN (0.25, 0.5, 0.75)),
  target_weight_kg      numeric CHECK (target_weight_kg BETWEEN 30 AND 300),
  diet                  diet_type NOT NULL DEFAULT 'omnivore',
  -- Exclusions : 'gluten', 'lactose'
  exclusions            text[] NOT NULL DEFAULT '{}',
  weekly_sessions_goal  integer CHECK (weekly_sessions_goal BETWEEN 0 AND 21),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE weight_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  logged_on  date NOT NULL DEFAULT current_date,
  weight_kg  numeric NOT NULL CHECK (weight_kg BETWEEN 30 AND 300),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, logged_on)
);
CREATE INDEX weight_logs_user_date_idx ON weight_logs (user_id, logged_on DESC);

-- ── Amis ─────────────────────────────────────────────────────

CREATE TABLE friendships (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (requester_id, addressee_id),
  CHECK  (requester_id <> addressee_id)
);
CREATE INDEX friendships_requester_idx ON friendships (requester_id);
CREATE INDEX friendships_addressee_idx ON friendships (addressee_id);

-- ── Recettes ─────────────────────────────────────────────────

CREATE TABLE recipes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title           text NOT NULL,
  description     text,
  cover_image_url text,
  prep_time_min   integer CHECK (prep_time_min >= 0),
  cook_time_min   integer CHECK (cook_time_min >= 0),
  base_servings   integer NOT NULL DEFAULT 4 CHECK (base_servings > 0),
  difficulty      difficulty_level,
  visibility      recipe_visibility NOT NULL DEFAULT 'private',
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX recipes_author_idx     ON recipes (author_id);
CREATE INDEX recipes_created_at_idx ON recipes (created_at DESC);
CREATE INDEX recipes_visibility_idx ON recipes (visibility);

-- Partage d'une recette avec un ami précis
CREATE TABLE recipe_shares (
  recipe_id  uuid NOT NULL REFERENCES recipes(id)  ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shared_by  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (recipe_id, user_id)
);
CREATE INDEX recipe_shares_user_idx ON recipe_shares (user_id);

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
  name      text    NOT NULL DEFAULT '',
  position  integer NOT NULL DEFAULT 0
);
CREATE INDEX ingredient_groups_recipe_idx ON ingredient_groups (recipe_id, position);

CREATE TABLE ingredients (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id   uuid    NOT NULL REFERENCES recipes(id)           ON DELETE CASCADE,
  group_id    uuid    NOT NULL REFERENCES ingredient_groups(id) ON DELETE CASCADE,
  name        text    NOT NULL,
  amount      numeric CHECK (amount > 0),
  unit        text,
  -- Aliment Ciqual choisi dans l'autocomplétion (sert au calcul nutritionnel)
  ciqual_code text,
  -- Poids total en grammes quand l'unité n'est pas un poids (ex : 3 œufs ≈ 150 g)
  weight_g    numeric CHECK (weight_g > 0),
  position    integer NOT NULL DEFAULT 0
);
CREATE INDEX ingredients_group_idx  ON ingredients (group_id, position);
CREATE INDEX ingredients_recipe_idx ON ingredients (recipe_id);

CREATE TABLE steps (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid    NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  position  integer NOT NULL,
  content   text    NOT NULL,
  image_url text
);
CREATE INDEX steps_recipe_position_idx ON steps (recipe_id, position);

CREATE TABLE step_ingredients (
  step_id       uuid NOT NULL REFERENCES steps(id)       ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  PRIMARY KEY (step_id, ingredient_id)
);

CREATE TABLE recipe_likes (
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipe_id  uuid NOT NULL REFERENCES recipes(id)  ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, recipe_id)
);

CREATE TABLE recipe_reviews (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id  uuid NOT NULL REFERENCES recipes(id)  ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating     integer CHECK (rating BETWEEN 1 AND 5),
  comment    text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (recipe_id, user_id),
  CHECK (rating IS NOT NULL OR comment IS NOT NULL)
);
CREATE INDEX recipe_reviews_recipe_idx ON recipe_reviews (recipe_id, created_at DESC);

-- ── Collections personnelles ─────────────────────────────────

CREATE TABLE collections (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name            text NOT NULL,
  cover_image_url text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX collections_owner_idx ON collections (owner_id);

CREATE TABLE collection_recipes (
  collection_id uuid NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  recipe_id     uuid NOT NULL REFERENCES recipes(id)     ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (collection_id, recipe_id)
);

-- ── Journal alimentaire ──────────────────────────────────────
-- Les valeurs nutritionnelles sont copiées au moment de l'ajout :
-- modifier une recette plus tard ne change pas l'historique.

CREATE TABLE food_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  eaten_on        date NOT NULL,
  meal            meal_type NOT NULL,
  recipe_id       uuid REFERENCES recipes(id) ON DELETE SET NULL,
  ciqual_code     text,
  label           text NOT NULL,
  servings        numeric CHECK (servings > 0),
  grams           numeric CHECK (grams > 0),
  energy_kcal     numeric NOT NULL DEFAULT 0,
  proteins_g      numeric NOT NULL DEFAULT 0,
  carbs_g         numeric NOT NULL DEFAULT 0,
  sugars_g        numeric NOT NULL DEFAULT 0,
  fat_g           numeric NOT NULL DEFAULT 0,
  saturated_fat_g numeric NOT NULL DEFAULT 0,
  fiber_g         numeric NOT NULL DEFAULT 0,
  salt_g          numeric NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX food_logs_user_date_idx ON food_logs (user_id, eaten_on);

-- ── Fonctions d'aide pour la sécurité (RLS) ─────────────────
-- SECURITY DEFINER : lisent les tables sans repasser par la RLS,
-- ce qui évite les boucles entre politiques.

CREATE OR REPLACE FUNCTION is_friend(other uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM friendships f
    WHERE f.status = 'accepted'
      AND ((f.requester_id = auth.uid() AND f.addressee_id = other)
        OR (f.addressee_id = auth.uid() AND f.requester_id = other))
  );
$$;

CREATE OR REPLACE FUNCTION can_view_recipe(rid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM recipes r
    WHERE r.id = rid
      AND (
        r.author_id = auth.uid()
        OR r.visibility = 'public'
        OR (r.visibility = 'friends' AND is_friend(r.author_id))
        OR EXISTS (SELECT 1 FROM recipe_shares s WHERE s.recipe_id = r.id AND s.user_id = auth.uid())
      )
  );
$$;

CREATE OR REPLACE FUNCTION owns_recipe(rid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM recipes r WHERE r.id = rid AND r.author_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION owns_collection(cid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM collections c WHERE c.id = cid AND c.owner_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION recipe_of_step(sid uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT recipe_id FROM steps WHERE id = sid;
$$;

-- ── Création automatique du profil à l'inscription ──────────

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.health_profiles (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── Row Level Security ──────────────────────────────────────

ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships        ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_shares      ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags               ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_tags        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredient_groups  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients        ENABLE ROW LEVEL SECURITY;
ALTER TABLE steps              ENABLE ROW LEVEL SECURITY;
ALTER TABLE step_ingredients   ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_likes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_reviews     ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections        ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_logs          ENABLE ROW LEVEL SECURITY;

-- Profils : lecture par tous les connectés, écriture par soi-même
CREATE POLICY profiles_select ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY profiles_insert ON profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY profiles_update ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Données strictement personnelles
CREATE POLICY health_self ON health_profiles FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY weight_self ON weight_logs FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY food_logs_self ON food_logs FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY likes_self ON recipe_likes FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY collections_self ON collections FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY collection_recipes_self ON collection_recipes FOR ALL TO authenticated
  USING (owns_collection(collection_id)) WITH CHECK (owns_collection(collection_id));

-- Amis
CREATE POLICY friendships_select ON friendships FOR SELECT TO authenticated
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());
CREATE POLICY friendships_insert ON friendships FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid() AND status = 'pending');
CREATE POLICY friendships_update ON friendships FOR UPDATE TO authenticated
  USING (addressee_id = auth.uid()) WITH CHECK (addressee_id = auth.uid());
CREATE POLICY friendships_delete ON friendships FOR DELETE TO authenticated
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());

-- Recettes
CREATE POLICY recipes_select ON recipes FOR SELECT TO authenticated
  USING (
    author_id = auth.uid()
    OR visibility = 'public'
    OR (visibility = 'friends' AND is_friend(author_id))
    OR EXISTS (SELECT 1 FROM recipe_shares s WHERE s.recipe_id = recipes.id AND s.user_id = auth.uid())
  );
CREATE POLICY recipes_insert ON recipes FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY recipes_update ON recipes FOR UPDATE TO authenticated
  USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
CREATE POLICY recipes_delete ON recipes FOR DELETE TO authenticated USING (author_id = auth.uid());

-- Partages : visibles par l'expéditeur et le destinataire ;
-- seul l'auteur de la recette peut la partager, et uniquement à un ami.
CREATE POLICY shares_select ON recipe_shares FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR shared_by = auth.uid());
CREATE POLICY shares_insert ON recipe_shares FOR INSERT TO authenticated
  WITH CHECK (shared_by = auth.uid() AND owns_recipe(recipe_id) AND is_friend(user_id));
CREATE POLICY shares_delete ON recipe_shares FOR DELETE TO authenticated
  USING (shared_by = auth.uid() OR user_id = auth.uid());

-- Tags : lecture seule (liste gérée par l'admin de la base)
CREATE POLICY tags_select ON tags FOR SELECT TO authenticated USING (true);

-- Contenu d'une recette : lisible si la recette l'est, modifiable par son auteur
CREATE POLICY recipe_tags_select ON recipe_tags FOR SELECT TO authenticated USING (can_view_recipe(recipe_id));
CREATE POLICY recipe_tags_write  ON recipe_tags FOR ALL    TO authenticated
  USING (owns_recipe(recipe_id)) WITH CHECK (owns_recipe(recipe_id));

CREATE POLICY groups_select ON ingredient_groups FOR SELECT TO authenticated USING (can_view_recipe(recipe_id));
CREATE POLICY groups_write  ON ingredient_groups FOR ALL    TO authenticated
  USING (owns_recipe(recipe_id)) WITH CHECK (owns_recipe(recipe_id));

CREATE POLICY ingredients_select ON ingredients FOR SELECT TO authenticated USING (can_view_recipe(recipe_id));
CREATE POLICY ingredients_write  ON ingredients FOR ALL    TO authenticated
  USING (owns_recipe(recipe_id)) WITH CHECK (owns_recipe(recipe_id));

CREATE POLICY steps_select ON steps FOR SELECT TO authenticated USING (can_view_recipe(recipe_id));
CREATE POLICY steps_write  ON steps FOR ALL    TO authenticated
  USING (owns_recipe(recipe_id)) WITH CHECK (owns_recipe(recipe_id));

CREATE POLICY step_ingredients_select ON step_ingredients FOR SELECT TO authenticated
  USING (can_view_recipe(recipe_of_step(step_id)));
CREATE POLICY step_ingredients_write ON step_ingredients FOR ALL TO authenticated
  USING (owns_recipe(recipe_of_step(step_id))) WITH CHECK (owns_recipe(recipe_of_step(step_id)));

-- Avis : lisibles si la recette l'est ; chacun gère le sien
CREATE POLICY reviews_select ON recipe_reviews FOR SELECT TO authenticated USING (can_view_recipe(recipe_id));
CREATE POLICY reviews_write  ON recipe_reviews FOR ALL    TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND can_view_recipe(recipe_id));

-- ── Stockage des images ──────────────────────────────────────
-- Chaque utilisateur écrit dans son propre dossier : <user_id>/fichier.jpg

INSERT INTO storage.buckets (id, name, public)
VALUES ('recipe-images', 'recipe-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "images_public_read" ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'recipe-images');
CREATE POLICY "images_owner_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'recipe-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "images_owner_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'recipe-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ── Tags de départ (régimes et repères) ─────────────────────

INSERT INTO tags (name, color) VALUES
  ('Végétarien',          '#16A34A'),
  ('Vegan',               '#15803D'),
  ('Pescétarien',         '#0EA5E9'),
  ('Sans gluten',         '#D97706'),
  ('Sans lactose',        '#CA8A04'),
  ('Riche en protéines',  '#DC2626'),
  ('Petit-déjeuner',      '#F59E0B'),
  ('Rapide',              '#8B5CF6'),
  ('Batch cooking',       '#6366F1')
ON CONFLICT (name) DO NOTHING;
