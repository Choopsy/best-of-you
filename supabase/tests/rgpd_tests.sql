-- RGPD : retrait de l'accord santé, suppression du compte (après tests-foyer : Léa et Tom partagent un foyer, Zoé est seule)
-- Point de départ explicite : Tom dans le foyer de Léa
DELETE FROM household_members WHERE user_id = 'b0000000-0000-0000-0000-000000000002';
INSERT INTO household_members (household_id, user_id)
  SELECT household_id, 'b0000000-0000-0000-0000-000000000002' FROM household_members WHERE user_id = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM households h WHERE NOT EXISTS (SELECT 1 FROM household_members m WHERE m.household_id = h.id);

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000001', false);  -- Léa
INSERT INTO health_profiles (user_id, sex, health_consent_at) VALUES (auth.uid(), 'female', now())
  ON CONFLICT (user_id) DO UPDATE SET health_consent_at = now();
INSERT INTO weight_logs (user_id, weight_kg) VALUES (auth.uid(), 60) ON CONFLICT DO NOTHING;

SELECT set_config('request.jwt.claim.sub', 'b0000000-0000-0000-0000-000000000002', false);  -- Tom
INSERT INTO health_profiles (user_id, sex, health_consent_at) VALUES (auth.uid(), 'male', now())
  ON CONFLICT (user_id) DO UPDATE SET health_consent_at = now();
INSERT INTO weight_logs (user_id, weight_kg) VALUES (auth.uid(), 80) ON CONFLICT DO NOTHING;
INSERT INTO activities (user_id, done_on, activity_key, label, duration_min, met, kcal_net) VALUES (auth.uid(), current_date, 'run_8', 'Course', 30, 8.5, 250);
INSERT INTO food_logs (user_id, eaten_on, meal, label, energy_kcal) VALUES (auth.uid(), current_date, 'lunch', 'Pâtes', 500);
SELECT withdraw_health_data();
SELECT t_eq('retrait : profil santé de Tom effacé', (SELECT count(*) FROM health_profiles), 0);
SELECT t_eq('retrait : pesées de Tom effacées', (SELECT count(*) FROM weight_logs), 0);
SELECT t_eq('retrait : séances de Tom effacées', (SELECT count(*) FROM activities), 0);
SELECT t_eq('retrait : journal de Tom effacé', (SELECT count(*) FROM food_logs), 0);
RESET ROLE;
SELECT t_eq('retrait : les données de Léa ne bougent pas', least((SELECT count(*) FROM weight_logs WHERE user_id = 'a0000000-0000-0000-0000-000000000001'), 1), 1);

SET ROLE anon;
SELECT t_fails('un visiteur non connecté ne peut pas appeler la suppression', $q$SELECT delete_my_account()$q$);
RESET ROLE;

-- Tom supprime son compte : le foyer reste à Léa
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'b0000000-0000-0000-0000-000000000002', false);
INSERT INTO recipes (id, author_id, title, visibility) VALUES ('d0000000-0000-0000-0000-0000000000f1', auth.uid(), 'Chili de Tom', 'friends');
SELECT delete_my_account();
RESET ROLE;
SELECT t_eq('suppression : compte de Tom effacé', (SELECT count(*) FROM auth.users WHERE id = 'b0000000-0000-0000-0000-000000000002'), 0);
SELECT t_eq('suppression : profil de Tom effacé', (SELECT count(*) FROM profiles WHERE id = 'b0000000-0000-0000-0000-000000000002'), 0);
SELECT t_eq('suppression : recettes de Tom effacées', (SELECT count(*) FROM recipes WHERE id = 'd0000000-0000-0000-0000-0000000000f1'), 0);
SELECT t_eq('suppression : amitiés de Tom effacées', (SELECT count(*) FROM friendships WHERE 'b0000000-0000-0000-0000-000000000002' IN (requester_id, addressee_id)), 0);
SELECT t_eq('suppression : le foyer partagé reste à Léa', (SELECT count(*) FROM household_members m JOIN households h ON h.id = m.household_id WHERE m.user_id = 'a0000000-0000-0000-0000-000000000001'), 1);
SELECT t_eq('suppression : le frigo du foyer reste à Léa', least((SELECT count(*) FROM fridge_items f JOIN household_members m ON m.household_id = f.household_id WHERE m.user_id = 'a0000000-0000-0000-0000-000000000001'), 1), 1);
SELECT t_eq('suppression : Léa garde ses données de santé', (SELECT count(*) FROM health_profiles WHERE user_id = 'a0000000-0000-0000-0000-000000000001'), 1);

-- Zoé, seule dans son foyer : le foyer disparaît avec elle
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'c0000000-0000-0000-0000-000000000003', false);
INSERT INTO fridge_items (household_id, name) VALUES (my_household_id(), 'Beurre');
CREATE TEMP TABLE zoe_house AS SELECT my_household_id() AS id;
SELECT delete_my_account();
RESET ROLE;
SELECT t_eq('suppression : le foyer vide de Zoé est effacé', (SELECT count(*) FROM households WHERE id = (SELECT id FROM zoe_house)), 0);
SELECT t_eq('suppression : son frigo aussi', (SELECT count(*) FROM fridge_items WHERE household_id = (SELECT id FROM zoe_house)), 0);
