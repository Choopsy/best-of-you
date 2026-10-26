-- ============================================================
-- 006_likes.sql
-- Favoris et sauvegardes de recettes
-- ============================================================

-- ── Favoris (cœur) ───────────────────────────────────────────

CREATE TABLE recipe_likes (
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipe_id  uuid NOT NULL REFERENCES recipes(id)  ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, recipe_id)
);

ALTER TABLE recipe_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recipe_likes_self" ON recipe_likes FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── Sauvegardes dans des catégories ─────────────────────────

CREATE TABLE category_saves (
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  recipe_id   uuid NOT NULL REFERENCES recipes(id)    ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (category_id, recipe_id)
);

ALTER TABLE category_saves ENABLE ROW LEVEL SECURITY;

-- Lecture et écriture : uniquement pour le propriétaire de la catégorie
CREATE POLICY "category_saves_self" ON category_saves FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM categories c WHERE c.id = category_id AND c.author_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM categories c WHERE c.id = category_id AND c.author_id = auth.uid())
);
