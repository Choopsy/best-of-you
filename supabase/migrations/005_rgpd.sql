-- ═════════════════════════════════════════════════════════════════════════════
-- 005 : RGPD — consentement aux données de santé, retrait, suppression du compte
-- À exécuter après 004_sport_produits.sql
-- ═════════════════════════════════════════════════════════════════════════════

-- Date de l'accord explicite (art. 9 RGPD) pour les données de santé.
-- NULL = jamais donné : l'appli le redemande avant d'utiliser ces données.
ALTER TABLE health_profiles ADD COLUMN IF NOT EXISTS health_consent_at timestamptz;

-- ── Retrait de l'accord : efface toutes les données de santé, d'un seul coup ──
-- Exécutée avec les droits de l'utilisateur (les règles de sécurité s'appliquent).
CREATE OR REPLACE FUNCTION withdraw_health_data()
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non connecté'; END IF;
  DELETE FROM food_logs       WHERE user_id = auth.uid();
  DELETE FROM activities      WHERE user_id = auth.uid();
  DELETE FROM weight_logs     WHERE user_id = auth.uid();
  DELETE FROM health_profiles WHERE user_id = auth.uid();
END $$;

-- ── Suppression du compte ────────────────────────────────────────────────────
-- Supprime l'utilisateur ; tout ce qui lui appartient part en cascade
-- (profil, santé, journal, recettes, collections, amis, place dans le foyer).
-- Un foyer devenu vide est supprimé avec son frigo, son planning et ses courses ;
-- s'il reste un ou une partenaire, le foyer lui reste.
-- Les photos (Storage) doivent être supprimées AVANT, par l'appli : Supabase
-- refuse de supprimer un utilisateur qui possède encore des fichiers.
CREATE OR REPLACE FUNCTION delete_my_account()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  me  uuid := auth.uid();
  hid uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Non connecté'; END IF;
  SELECT household_id INTO hid FROM public.household_members WHERE user_id = me;

  DELETE FROM auth.users WHERE id = me;

  IF hid IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.household_members WHERE household_id = hid) THEN
    DELETE FROM public.households WHERE id = hid;
  END IF;
END $$;

REVOKE ALL ON FUNCTION delete_my_account() FROM PUBLIC;
REVOKE ALL ON FUNCTION delete_my_account() FROM anon;
GRANT EXECUTE ON FUNCTION delete_my_account() TO authenticated;
REVOKE ALL ON FUNCTION withdraw_health_data() FROM PUBLIC;
REVOKE ALL ON FUNCTION withdraw_health_data() FROM anon;
GRANT EXECUTE ON FUNCTION withdraw_health_data() TO authenticated;
