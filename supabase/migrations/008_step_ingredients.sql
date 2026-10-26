CREATE TABLE step_ingredients (
  step_id     uuid NOT NULL REFERENCES steps(id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  PRIMARY KEY (step_id, ingredient_id)
);

ALTER TABLE step_ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "step_ingredients_read" ON step_ingredients
  FOR SELECT USING (true);

CREATE POLICY "step_ingredients_write" ON step_ingredients
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
