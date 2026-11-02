-- ═════════════════════════════════════════════════════════════════════════════
-- 008 : Produits scannés (ou créés) utilisables comme ingrédients de recette
-- À exécuter après 007_portions.sql, AVANT de mettre en ligne le code qui l'utilise.
-- ═════════════════════════════════════════════════════════════════════════════

-- Un ingrédient est lié soit à un aliment Ciqual (ciqual_code), soit à un produit du foyer.
ALTER TABLE ingredients
  ADD COLUMN IF NOT EXISTS custom_food_id uuid REFERENCES custom_foods(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS ingredients_custom_food_idx ON ingredients (custom_food_id) WHERE custom_food_id IS NOT NULL;

-- Les produits restent réservés au foyer, sauf un cas : quelqu'un qui peut voir une recette
-- (ami, recette publique, partage) peut lire les produits qu'elle utilise, pour calculer
-- sa nutrition. Les politiques s'additionnent : celle du foyer (écriture) reste inchangée.
-- Fonctions SECURITY DEFINER : les politiques de custom_foods et d'ingredients se citent
-- l'une l'autre, ce que Postgres refuse (récursion) si elles passent par la RLS.
CREATE OR REPLACE FUNCTION custom_food_in_visible_recipe(fid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM ingredients i WHERE i.custom_food_id = fid AND can_view_recipe(i.recipe_id));
$$;

CREATE OR REPLACE FUNCTION can_see_custom_food(fid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM custom_foods f WHERE f.id = fid AND f.household_id = my_household_id())
      OR custom_food_in_visible_recipe(fid);
$$;

REVOKE ALL ON FUNCTION custom_food_in_visible_recipe(uuid), can_see_custom_food(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION custom_food_in_visible_recipe(uuid), can_see_custom_food(uuid) TO authenticated;

DROP POLICY IF EXISTS custom_foods_via_recipe ON custom_foods;
CREATE POLICY custom_foods_via_recipe ON custom_foods FOR SELECT TO authenticated
  USING (custom_food_in_visible_recipe(id));

-- On ne peut lier à sa recette qu'un produit qu'on voit déjà (son foyer, ou une recette visible) :
-- sinon, connaître l'identifiant d'un produit d'un autre foyer suffirait pour en lire les valeurs.
DROP POLICY IF EXISTS ingredients_write ON ingredients;
CREATE POLICY ingredients_write ON ingredients FOR ALL TO authenticated
  USING (owns_recipe(recipe_id))
  WITH CHECK (owns_recipe(recipe_id) AND (custom_food_id IS NULL OR can_see_custom_food(custom_food_id)));
