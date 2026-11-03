-- ═════════════════════════════════════════════════════════════════════════════
-- 010 : Photo du repas (analyse par Claude, accès réservé)
--   - photo_access : comptes autorisés, activés à la main par Cheun dans le SQL Editor
--     (futur premium) ; l'utilisateur lit sa ligne mais ne peut jamais l'écrire ;
--   - photo_analyses : une ligne par analyse, pour le quota de 3 par jour (jour de Paris) ;
--   - tout passe par des fonctions : accept_photo_consent(), claim_photo_analysis(),
--     release_photo_analysis(), withdraw_photo_consent(), photo_status().
-- La photo elle-même n'est jamais enregistrée : seule la date de l'analyse est gardée.
-- À exécuter après 009_frigo_journal.sql, AVANT de mettre en ligne le code qui l'utilise.
--
-- Activer un compte :
--   INSERT INTO photo_access (user_id) VALUES ('<User UID>') ON CONFLICT DO NOTHING;
-- Retirer l'accès :
--   DELETE FROM photo_access WHERE user_id = '<User UID>';
-- ═════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS photo_access (
  user_id    uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  enabled_at timestamptz NOT NULL DEFAULT now(),
  -- Accord pour l'envoi de la photo à Anthropic ; NULL = pas encore donné (ou retiré)
  consent_at timestamptz
);

CREATE TABLE IF NOT EXISTS photo_analyses (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  -- Empreinte du jeton d'annulation : seul le serveur qui a demandé l'analyse connaît le jeton,
  -- donc seul lui peut la rendre si l'appel à Claude échoue (voir release_photo_analysis)
  release_hash text NOT NULL
);
CREATE INDEX IF NOT EXISTS photo_analyses_user_day_idx ON photo_analyses (user_id, created_at);

ALTER TABLE photo_access   ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_analyses ENABLE ROW LEVEL SECURITY;

-- Lecture de ses propres lignes seulement ; aucune politique d'écriture
DROP POLICY IF EXISTS photo_access_own ON photo_access;
CREATE POLICY photo_access_own ON photo_access FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS photo_analyses_own ON photo_analyses;
CREATE POLICY photo_analyses_own ON photo_analyses FOR SELECT TO authenticated USING (user_id = auth.uid());

-- En plus de la RLS : Supabase donne par défaut tous les droits sur les tables à anon et
-- authenticated. On les retire, pour qu'une politique ajoutée par erreur n'ouvre rien.
REVOKE ALL ON photo_access, photo_analyses FROM anon, PUBLIC;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON photo_access, photo_analyses FROM authenticated;
GRANT SELECT ON photo_access, photo_analyses TO authenticated;

-- Nombre d'analyses par jour et par personne (le même pour tous pour l'instant)
CREATE OR REPLACE FUNCTION photo_daily_limit()
RETURNS int LANGUAGE sql IMMUTABLE AS $$ SELECT 3 $$;

-- Début du jour de Paris (minuit heure française), pour le quota
CREATE OR REPLACE FUNCTION photo_day_start()
RETURNS timestamptz LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT date_trunc('day', now() AT TIME ZONE 'Europe/Paris') AT TIME ZONE 'Europe/Paris'
$$;

-- ── Accord à la première utilisation ────────────────────────────────────────
CREATE OR REPLACE FUNCTION accept_photo_consent()
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me uuid := auth.uid();
  at timestamptz;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Non connecté' USING ERRCODE = '28000'; END IF;
  -- Seule la date d'accord change : impossible de s'activer soi-même par ici
  UPDATE photo_access SET consent_at = coalesce(consent_at, now()) WHERE user_id = me RETURNING consent_at INTO at;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'La photo du repas n''est pas activée pour ton compte.' USING ERRCODE = 'PH001';
  END IF;
  RETURN at;
END $$;

-- Retrait de l'accord : aussi simple que de le donner (RGPD art. 7)
CREATE OR REPLACE FUNCTION withdraw_photo_consent()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non connecté' USING ERRCODE = '28000'; END IF;
  UPDATE photo_access SET consent_at = NULL WHERE user_id = auth.uid();
END $$;

-- ── Réserver une analyse ────────────────────────────────────────────────────
-- Vérifie accès + accord + quota du jour et enregistre l'analyse, d'un seul coup :
-- la ligne photo_access est verrouillée, donc deux demandes simultanées passent l'une
-- après l'autre et ne peuvent pas dépasser le quota ensemble.
-- p_release_hash : empreinte (sha256, hexadécimal) d'un jeton tiré au hasard par le serveur.
-- Renvoie l'identifiant de l'analyse et le nombre d'analyses encore possibles aujourd'hui.
-- Erreurs : PH001 pas d'accès, PH002 pas d'accord, PH003 quota atteint.
CREATE OR REPLACE FUNCTION claim_photo_analysis(p_release_hash text)
RETURNS TABLE (analysis_id uuid, remaining int) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me      uuid := auth.uid();
  daily   constant int := photo_daily_limit();
  acc     photo_access%ROWTYPE;
  used    int;
  new_id  uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Non connecté' USING ERRCODE = '28000'; END IF;
  IF p_release_hash IS NULL OR p_release_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'Jeton d''annulation invalide' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO acc FROM photo_access WHERE user_id = me FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'La photo du repas n''est pas activée pour ton compte.' USING ERRCODE = 'PH001';
  END IF;
  IF acc.consent_at IS NULL THEN
    RAISE EXCEPTION 'Il faut d''abord accepter l''envoi de la photo pour l''analyse.' USING ERRCODE = 'PH002';
  END IF;

  SELECT count(*) INTO used FROM photo_analyses WHERE user_id = me AND created_at >= photo_day_start();
  IF used >= daily THEN
    RAISE EXCEPTION 'Tu as déjà utilisé tes % photos aujourd''hui : rendez-vous demain.', daily USING ERRCODE = 'PH003';
  END IF;

  INSERT INTO photo_analyses (user_id, release_hash) VALUES (me, p_release_hash) RETURNING id INTO new_id;
  RETURN QUERY SELECT new_id, daily - used - 1;
END $$;

-- ── Rendre une analyse (l'appel à Claude a échoué) ──────────────────────────
-- Il faut le jeton dont l'empreinte a été donnée à la réservation : le serveur le garde pour
-- lui, donc un utilisateur ne peut pas rendre après coup une analyse réussie pour en refaire.
-- Limité aux 15 dernières minutes. Renvoie true si l'analyse a bien été rendue.
CREATE OR REPLACE FUNCTION release_photo_analysis(p_id uuid, p_token text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non connecté' USING ERRCODE = '28000'; END IF;
  DELETE FROM photo_analyses
   WHERE id = p_id AND user_id = auth.uid()
     AND created_at > now() - interval '15 minutes'
     AND release_hash = encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex');
  RETURN FOUND;
END $$;

-- ── État pour l'interface : accès, accord, analyses restantes aujourd'hui ───
-- Avec les droits de l'utilisateur : il ne lit que ses propres lignes.
CREATE OR REPLACE FUNCTION photo_status()
RETURNS TABLE (enabled boolean, consented boolean, remaining int) LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT a.user_id IS NOT NULL,
         a.consent_at IS NOT NULL,
         CASE WHEN a.user_id IS NULL THEN 0 ELSE greatest(0, photo_daily_limit() - (
           SELECT count(*) FROM photo_analyses p WHERE p.user_id = auth.uid() AND p.created_at >= photo_day_start()))::int END
  FROM (SELECT auth.uid() AS me) u
  LEFT JOIN photo_access a ON a.user_id = u.me
$$;

REVOKE ALL ON FUNCTION photo_daily_limit(), photo_day_start(), accept_photo_consent(), withdraw_photo_consent(),
  claim_photo_analysis(text), release_photo_analysis(uuid, text), photo_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION photo_daily_limit(), photo_day_start(), accept_photo_consent(), withdraw_photo_consent(),
  claim_photo_analysis(text), release_photo_analysis(uuid, text), photo_status() TO authenticated;
