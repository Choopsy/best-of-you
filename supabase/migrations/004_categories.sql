-- ============================================================
-- 004_categories.sql
-- Remplacement du champ course par une table categories
-- ============================================================

-- ── Table categories ─────────────────────────────────────────

CREATE TABLE categories (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name            text NOT NULL,
  is_public       boolean NOT NULL DEFAULT false,
  cover_image_url text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX categories_author_idx    ON categories(author_id);
CREATE INDEX categories_public_idx    ON categories(is_public);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Lecture : catégories publiques + les miennes
CREATE POLICY "categories_select" ON categories FOR SELECT TO authenticated
USING (is_public = true OR author_id = auth.uid());

-- Création/modification/suppression : uniquement le propriétaire
CREATE POLICY "categories_insert" ON categories FOR INSERT TO authenticated
WITH CHECK (author_id = auth.uid());

CREATE POLICY "categories_update" ON categories FOR UPDATE TO authenticated
USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());

CREATE POLICY "categories_delete" ON categories FOR DELETE TO authenticated
USING (author_id = auth.uid());

-- ── Migration de recipes ─────────────────────────────────────

-- Ajouter la FK vers categories
ALTER TABLE recipes ADD COLUMN category_id uuid REFERENCES categories(id) ON DELETE SET NULL;
CREATE INDEX recipes_category_idx ON recipes(category_id);

-- Supprimer l'ancienne colonne course et le type enum
ALTER TABLE recipes DROP COLUMN IF EXISTS course;
DROP TYPE IF EXISTS course_type;

-- ── Mise à jour RLS sur recipes ──────────────────────────────

-- Supprimer la politique permissive initiale
DROP POLICY IF EXISTS "authenticated full access" ON recipes;

-- Lecture : mes recettes + recettes dans une catégorie publique
CREATE POLICY "recipes_select" ON recipes FOR SELECT TO authenticated
USING (
  author_id = auth.uid()
  OR (
    category_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM categories c
      WHERE c.id = recipes.category_id
        AND c.is_public = true
    )
  )
);

-- Écriture : uniquement l'auteur
CREATE POLICY "recipes_insert" ON recipes FOR INSERT TO authenticated
WITH CHECK (author_id = auth.uid());

CREATE POLICY "recipes_update" ON recipes FOR UPDATE TO authenticated
USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());

CREATE POLICY "recipes_delete" ON recipes FOR DELETE TO authenticated
USING (author_id = auth.uid());
