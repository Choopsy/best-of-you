-- ═════════════════════════════════════════════════════════════════════════════
-- 007 : Portions pour les aliments enregistrés
-- À exécuter après 006_rayons.sql, AVANT de mettre en ligne le code qui l'utilise.
-- ═════════════════════════════════════════════════════════════════════════════

-- per_portion = false : valeurs pour 100 g (étiquette, Ciqual). portion_grams facultatif
--                       permet de noter « 1 pot » (125 g) au lieu de grammes.
-- per_portion = true  : valeurs pour 1 portion (fast-food, restaurant : burger, menu…).
--                       portion_grams = poids d'une portion s'il est connu.
ALTER TABLE custom_foods
  ADD COLUMN IF NOT EXISTS per_portion boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS portion_grams numeric CHECK (portion_grams > 0 AND portion_grams <= 3000);

-- Les plafonds « pour 100 g » (950 kcal, 100 g) ne valent pas pour une portion :
-- un menu de fast-food peut dépasser 1 200 kcal. On les remplace par une règle selon le mode.
ALTER TABLE custom_foods
  DROP CONSTRAINT IF EXISTS custom_foods_energy_kcal_check,
  DROP CONSTRAINT IF EXISTS custom_foods_proteins_g_check,
  DROP CONSTRAINT IF EXISTS custom_foods_carbs_g_check,
  DROP CONSTRAINT IF EXISTS custom_foods_sugars_g_check,
  DROP CONSTRAINT IF EXISTS custom_foods_fat_g_check,
  DROP CONSTRAINT IF EXISTS custom_foods_saturated_fat_g_check,
  DROP CONSTRAINT IF EXISTS custom_foods_fiber_g_check,
  DROP CONSTRAINT IF EXISTS custom_foods_salt_g_check;

ALTER TABLE custom_foods ADD CONSTRAINT custom_foods_values_check CHECK (
  least(energy_kcal, proteins_g, carbs_g, sugars_g, fat_g, saturated_fat_g, fiber_g, salt_g) >= 0
  AND CASE WHEN per_portion
    THEN energy_kcal <= 5000 AND greatest(proteins_g, carbs_g, sugars_g, fat_g, saturated_fat_g, fiber_g, salt_g) <= 1000
    ELSE energy_kcal <= 950 AND greatest(proteins_g, carbs_g, sugars_g, fat_g, saturated_fat_g, fiber_g, salt_g) <= 100
  END
);
