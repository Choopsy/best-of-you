-- ── Friendships ──────────────────────────────────────────────────────────────

CREATE TABLE friendships (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (requester_id, addressee_id),
  CHECK  (requester_id != addressee_id)
);

CREATE INDEX friendships_requester_idx ON friendships(requester_id);
CREATE INDEX friendships_addressee_idx ON friendships(addressee_id);

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "friendships_read"   ON friendships FOR SELECT TO authenticated
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());
CREATE POLICY "friendships_insert" ON friendships FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid());
CREATE POLICY "friendships_update" ON friendships FOR UPDATE TO authenticated
  USING (addressee_id = auth.uid());
CREATE POLICY "friendships_delete" ON friendships FOR DELETE TO authenticated
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());

-- ── Category members ──────────────────────────────────────────────────────────

CREATE TABLE category_members (
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES profiles(id)   ON DELETE CASCADE,
  PRIMARY KEY (category_id, user_id)
);

ALTER TABLE category_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "category_members_read" ON category_members FOR SELECT TO authenticated
  USING (true);
-- FOR INSERT / DELETE séparés (pas FOR ALL) pour éviter la récursion infinie :
-- categories_select → category_members → categories → ...
CREATE POLICY "category_members_insert" ON category_members FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM categories WHERE id = category_id AND author_id = auth.uid()));
CREATE POLICY "category_members_delete" ON category_members FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM categories WHERE id = category_id AND author_id = auth.uid()));

-- ── Visibility on categories ──────────────────────────────────────────────────

ALTER TABLE categories
  ADD COLUMN visibility text NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('public', 'private', 'shared'));

UPDATE categories SET visibility = CASE WHEN is_public THEN 'public' ELSE 'private' END;

ALTER TABLE categories DROP COLUMN is_public;
DROP INDEX IF EXISTS categories_public_idx;

DROP POLICY IF EXISTS "categories_select" ON categories;
CREATE POLICY "categories_select" ON categories FOR SELECT TO authenticated
  USING (
    author_id = auth.uid()
    OR visibility = 'public'
    OR (visibility = 'shared' AND EXISTS (
      SELECT 1 FROM category_members WHERE category_id = id AND user_id = auth.uid()
    ))
  );

-- ── Update recipes RLS ────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "recipes_select" ON recipes;
CREATE POLICY "recipes_select" ON recipes FOR SELECT TO authenticated
  USING (
    author_id = auth.uid()
    OR (category_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM categories c
      WHERE c.id = recipes.category_id
        AND (
          c.visibility = 'public'
          OR (c.visibility = 'shared' AND EXISTS (
            SELECT 1 FROM category_members cm
            WHERE cm.category_id = c.id AND cm.user_id = auth.uid()
          ))
        )
    ))
  );
