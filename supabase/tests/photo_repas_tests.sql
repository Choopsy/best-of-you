-- Photo du repas : accès activé à la main, accord, quota de 3 par jour (après frigo_journal : Léa et Eve)
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000001', false);  -- Léa

-- ── Sans accès ──
SELECT t_eq('sans accès : photo_status dit non', (SELECT count(*) FROM photo_status() WHERE NOT enabled AND remaining = 0)::int, 1);
SELECT t_fails('sans accès : analyse refusée', $q$SELECT * FROM claim_photo_analysis(encode(sha256('j0'::bytea), 'hex'))$q$);
SELECT t_fails('sans accès : accord refusé', $q$SELECT accept_photo_consent()$q$);
SELECT t_fails('Léa ne peut pas s''activer elle-même', $q$INSERT INTO photo_access (user_id) VALUES (auth.uid())$q$);
SELECT t_fails('… ni écrire une analyse', $q$INSERT INTO photo_analyses (user_id, release_hash) VALUES (auth.uid(), 'x')$q$);

-- ── Cheun active Léa (SQL Editor) ; 3 analyses d'hier qui ne comptent pas aujourd'hui ──
RESET ROLE;
INSERT INTO photo_access (user_id) VALUES ('a0000000-0000-0000-0000-000000000001');
INSERT INTO photo_analyses (user_id, created_at, release_hash)
  SELECT 'a0000000-0000-0000-0000-000000000001', photo_day_start() - interval '1 minute', 'hier' FROM generate_series(1, 3);
SET ROLE authenticated;

SELECT t_eq('Léa voit sa ligne d''accès', (SELECT count(*) FROM photo_access)::int, 1);
SELECT t_fails('Léa ne peut pas modifier son accès', $q$UPDATE photo_access SET enabled_at = now(), consent_at = now()$q$);
SELECT t_fails('… ni le supprimer', $q$DELETE FROM photo_access$q$);
SELECT t_fails('… ni effacer ses analyses pour regagner des photos', $q$DELETE FROM photo_analyses$q$);
SELECT t_fails('sans accord : analyse refusée', $q$SELECT * FROM claim_photo_analysis(encode(sha256('j0'::bytea), 'hex'))$q$);

SELECT accept_photo_consent();
SELECT t_eq('accord enregistré', (SELECT count(*) FROM photo_access WHERE consent_at IS NOT NULL)::int, 1);
SELECT t_eq('les analyses d''hier ne comptent pas', (SELECT remaining FROM photo_status()), 3);
SELECT t_fails('jeton d''annulation obligatoire', $q$SELECT * FROM claim_photo_analysis('pas une empreinte')$q$);

-- ── Quota ──
SELECT t_eq('1re analyse : encore 2', (SELECT remaining FROM claim_photo_analysis(encode(sha256('j1'::bytea), 'hex'))), 2);
SELECT t_eq('2e analyse : encore 1', (SELECT remaining FROM claim_photo_analysis(encode(sha256('j2'::bytea), 'hex'))), 1);
SELECT set_config('test.photo3', (SELECT analysis_id::text FROM claim_photo_analysis(encode(sha256('j3'::bytea), 'hex'))), false);
SELECT t_eq('3e analyse : plus rien', (SELECT remaining FROM photo_status()), 0);
SELECT t_fails('4e analyse du jour refusée', $q$SELECT * FROM claim_photo_analysis(encode(sha256('j4'::bytea), 'hex'))$q$);

-- ── Annulation quand l'appel à Claude échoue ──
SELECT t_eq('mauvais jeton : pas d''annulation', release_photo_analysis(current_setting('test.photo3')::uuid, 'j1')::int, 0);
SELECT t_eq('bon jeton : analyse rendue', release_photo_analysis(current_setting('test.photo3')::uuid, 'j3')::int, 1);
SELECT t_eq('une photo de nouveau possible', (SELECT remaining FROM photo_status()), 1);
SELECT set_config('test.photo3', (SELECT analysis_id::text FROM claim_photo_analysis(encode(sha256('j5'::bytea), 'hex'))), false);
SELECT t_fails('puis de nouveau refusée', $q$SELECT * FROM claim_photo_analysis(encode(sha256('j6'::bytea), 'hex'))$q$);

-- ── Rien de visible chez un autre utilisateur ──
SELECT set_config('request.jwt.claim.sub', 'e0000000-0000-0000-0000-000000000005', false);  -- Eve
SELECT t_eq('Eve ne voit pas l''accès de Léa', (SELECT count(*) FROM photo_access)::int, 0);
SELECT t_eq('Eve ne voit pas les analyses de Léa', (SELECT count(*) FROM photo_analyses)::int, 0);
SELECT t_eq('Eve n''a pas l''accès', (SELECT count(*) FROM photo_status() WHERE NOT enabled)::int, 1);
SELECT t_eq('Eve ne peut pas rendre une analyse de Léa, même avec le jeton',
  release_photo_analysis(current_setting('test.photo3')::uuid, 'j5')::int, 0);
SELECT t_fails('Eve ne peut pas activer Léa', $q$INSERT INTO photo_access (user_id) VALUES ('e0000000-0000-0000-0000-000000000005')$q$);

-- ── Une analyse ancienne ne peut plus être rendue ; retrait de l'accord ──
SELECT set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000001', false);  -- Léa
RESET ROLE;
UPDATE photo_analyses SET created_at = now() - interval '20 minutes' WHERE id = current_setting('test.photo3')::uuid;
SET ROLE authenticated;
SELECT t_eq('après 15 minutes : plus d''annulation', release_photo_analysis(current_setting('test.photo3')::uuid, 'j5')::int, 0);
SELECT withdraw_photo_consent();
SELECT t_eq('accord retiré', (SELECT count(*) FROM photo_access WHERE consent_at IS NULL)::int, 1);
SELECT t_fails('sans accord : plus d''analyse', $q$SELECT * FROM claim_photo_analysis(encode(sha256('j7'::bytea), 'hex'))$q$);

-- ── Visiteur non connecté ──
SET ROLE anon;
SELECT set_config('request.jwt.claim.sub', '', false);
SELECT t_fails('visiteur : pas de lecture', $q$SELECT count(*) FROM photo_access$q$);
SELECT t_fails('visiteur : pas d''analyse', $q$SELECT * FROM claim_photo_analysis(encode(sha256('j8'::bytea), 'hex'))$q$);
RESET ROLE;
