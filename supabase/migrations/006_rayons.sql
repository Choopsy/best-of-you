-- ═════════════════════════════════════════════════════════════════════════════
-- 006 : Courses triées par rayon
-- À exécuter après 005_rgpd.sql
-- ═════════════════════════════════════════════════════════════════════════════

-- Rayon choisi à la main pour un article (mémorisé pour tout le foyer).
-- name_norm = nom sans accents ni ponctuation, en minuscules (« Crème fraîche » → « creme fraiche »).
CREATE TABLE aisle_overrides (
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name_norm    text NOT NULL CHECK (char_length(name_norm) BETWEEN 1 AND 120),
  aisle        text NOT NULL CHECK (aisle IN ('fruits_legumes', 'boulangerie', 'viande_poisson', 'cremerie',
                 'epicerie_salee', 'epicerie_sucree', 'boissons', 'surgeles', 'hygiene', 'entretien', 'autre')),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (household_id, name_norm)
);
ALTER TABLE aisle_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY aisle_overrides_household ON aisle_overrides FOR ALL TO authenticated
  USING (household_id = my_household_id()) WITH CHECK (household_id = my_household_id());

-- Ordre des rayons dans le magasin du foyer (NULL = ordre par défaut).
ALTER TABLE households ADD COLUMN IF NOT EXISTS aisle_order text[]
  CHECK (aisle_order <@ ARRAY['fruits_legumes', 'boulangerie', 'viande_poisson', 'cremerie', 'epicerie_salee',
    'epicerie_sucree', 'boissons', 'surgeles', 'hygiene', 'entretien', 'autre']::text[]);
