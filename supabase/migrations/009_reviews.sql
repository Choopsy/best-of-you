CREATE TABLE recipe_reviews (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id  uuid        NOT NULL REFERENCES recipes(id)  ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating     integer     CHECK (rating >= 1 AND rating <= 5),
  comment    text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (recipe_id, user_id),
  CHECK (rating IS NOT NULL OR comment IS NOT NULL)
);

CREATE INDEX recipe_reviews_recipe_idx ON recipe_reviews (recipe_id, created_at DESC);

ALTER TABLE recipe_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reviews_read" ON recipe_reviews
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "reviews_write" ON recipe_reviews
  FOR ALL TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
