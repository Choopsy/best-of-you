-- ── Fix category_saves RLS ──────────────────────────────────────────────────
-- La policy "FOR ALL" limitait la lecture aux seuls propriétaires de catégorie.
-- Les membres d'une catégorie partagée ne voyaient donc pas les recettes sauvegardées.

DROP POLICY IF EXISTS "category_saves_self" ON category_saves;

-- Lecture : propriétaire + membres de catégorie partagée + toute catégorie publique
CREATE POLICY "category_saves_read" ON category_saves FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM categories c WHERE c.id = category_id
      AND (
        c.author_id = auth.uid()
        OR c.visibility = 'public'
        OR (c.visibility = 'shared' AND EXISTS (
          SELECT 1 FROM category_members cm
          WHERE cm.category_id = c.id AND cm.user_id = auth.uid()
        ))
      )
    )
  );

-- Écriture : uniquement le propriétaire de la catégorie
CREATE POLICY "category_saves_write" ON category_saves
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM categories c WHERE c.id = category_id AND c.author_id = auth.uid())
  );

CREATE POLICY "category_saves_delete" ON category_saves
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM categories c WHERE c.id = category_id AND c.author_id = auth.uid())
  );

-- ── Fix recipes RLS ──────────────────────────────────────────────────────────
-- Une recette sauvegardée dans une catégorie partagée/publique doit être visible
-- même si sa catégorie native est privée.

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
    OR EXISTS (
      SELECT 1 FROM category_saves cs
      JOIN categories c ON c.id = cs.category_id
      WHERE cs.recipe_id = recipes.id
        AND (
          c.visibility = 'public'
          OR (c.visibility = 'shared' AND EXISTS (
            SELECT 1 FROM category_members cm
            WHERE cm.category_id = c.id AND cm.user_id = auth.uid()
          ))
        )
    )
  );
