-- ═════════════════════════════════════════════════════════════════════════════
-- 009 : Le frigo suit ce qui est mangé
--   - un article du frigo peut être relié à un produit du foyer (scanné ou créé) :
--     le produit devient cherchable (journal, ingrédients) et la correspondance est sûre ;
--   - une entrée du journal garde ce qu'elle a retiré du frigo, pour le remettre
--     si l'entrée est supprimée.
-- À exécuter après 008_produits_recettes.sql, AVANT de mettre en ligne le code qui l'utilise.
-- ═════════════════════════════════════════════════════════════════════════════

ALTER TABLE fridge_items
  ADD COLUMN IF NOT EXISTS custom_food_id uuid REFERENCES custom_foods(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS fridge_items_custom_food_idx ON fridge_items (custom_food_id) WHERE custom_food_id IS NOT NULL;

-- Seulement un produit de son propre foyer : un produit d'un autre foyer peut être lisible
-- (via une recette publique, migration 008) mais n'a rien à faire dans mon frigo.
DROP POLICY IF EXISTS fridge_household ON fridge_items;
CREATE POLICY fridge_household ON fridge_items FOR ALL TO authenticated
  USING (household_id = my_household_id())
  WITH CHECK (household_id = my_household_id() AND (custom_food_id IS NULL OR EXISTS (
    SELECT 1 FROM custom_foods f WHERE f.id = custom_food_id AND f.household_id = my_household_id())));

-- Liste des retraits faits au frigo par cette entrée : [{ item_id, name, unit, amount, removed, … }].
-- Privée comme le reste du journal ; elle ne donne aucun droit sur le frigo (la remise en place
-- passe par les règles du frigo, réservées au foyer).
ALTER TABLE food_logs
  ADD COLUMN IF NOT EXISTS fridge_moves jsonb;
ALTER TABLE food_logs DROP CONSTRAINT IF EXISTS food_logs_fridge_moves_check;
ALTER TABLE food_logs ADD CONSTRAINT food_logs_fridge_moves_check
  CHECK (fridge_moves IS NULL OR (jsonb_typeof(fridge_moves) = 'array' AND jsonb_array_length(fridge_moves) <= 50));
