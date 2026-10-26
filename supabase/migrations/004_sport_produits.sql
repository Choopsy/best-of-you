-- ============================================================
-- 004_sport_produits.sql
-- Produits scannés (code-barres), séances de sport, mode de prise
-- en compte du sport dans les objectifs.
-- À exécuter APRÈS 003_foyer.sql, dans Supabase > SQL Editor.
-- ============================================================

-- ── Produits scannés ou saisis à la main (partagés dans le foyer) ──
-- Valeurs pour 100 g, comme la table Ciqual.

CREATE TABLE custom_foods (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id    uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  barcode         text CHECK (barcode ~ '^[0-9]{8,14}$'),
  name            text NOT NULL,
  brand           text,
  image_url       text,
  -- 'off' = Open Food Facts, 'manual' = recopié depuis l'étiquette
  source          text NOT NULL DEFAULT 'manual' CHECK (source IN ('off', 'manual')),
  energy_kcal     numeric NOT NULL DEFAULT 0 CHECK (energy_kcal >= 0 AND energy_kcal <= 950),
  proteins_g      numeric NOT NULL DEFAULT 0 CHECK (proteins_g >= 0 AND proteins_g <= 100),
  carbs_g         numeric NOT NULL DEFAULT 0 CHECK (carbs_g >= 0 AND carbs_g <= 100),
  sugars_g        numeric NOT NULL DEFAULT 0 CHECK (sugars_g >= 0 AND sugars_g <= 100),
  fat_g           numeric NOT NULL DEFAULT 0 CHECK (fat_g >= 0 AND fat_g <= 100),
  saturated_fat_g numeric NOT NULL DEFAULT 0 CHECK (saturated_fat_g >= 0 AND saturated_fat_g <= 100),
  fiber_g         numeric NOT NULL DEFAULT 0 CHECK (fiber_g >= 0 AND fiber_g <= 100),
  salt_g          numeric NOT NULL DEFAULT 0 CHECK (salt_g >= 0 AND salt_g <= 100),
  created_by      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, barcode)
);
CREATE INDEX custom_foods_household_idx ON custom_foods (household_id, name);

ALTER TABLE food_logs ADD COLUMN custom_food_id uuid REFERENCES custom_foods(id) ON DELETE SET NULL;

-- ── Séances de sport (privées) ───────────────────────────────

CREATE TABLE activities (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  done_on      date NOT NULL,
  activity_key text NOT NULL,
  label        text NOT NULL,
  duration_min integer NOT NULL CHECK (duration_min BETWEEN 1 AND 600),
  -- Valeur MET du Compendium 2024 au moment de la saisie
  met          numeric NOT NULL CHECK (met > 1 AND met < 25),
  -- Dépense NETTE estimée (au-delà du repos), en kcal
  kcal_net     numeric NOT NULL CHECK (kcal_net >= 0),
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX activities_user_date_idx ON activities (user_id, done_on);

-- 'included' = le sport est compris dans le niveau d'activité du profil
-- 'logged'   = le niveau d'activité décrit la vie sans sport, les séances notées s'ajoutent
ALTER TABLE health_profiles ADD COLUMN sport_mode text NOT NULL DEFAULT 'included'
  CHECK (sport_mode IN ('included', 'logged'));

-- ── Sécurité ────────────────────────────────────────────────

ALTER TABLE custom_foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities   ENABLE ROW LEVEL SECURITY;

CREATE POLICY custom_foods_household ON custom_foods FOR ALL TO authenticated
  USING (household_id = my_household_id()) WITH CHECK (household_id = my_household_id());

CREATE POLICY activities_self ON activities FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
