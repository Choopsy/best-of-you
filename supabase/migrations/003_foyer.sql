-- ============================================================
-- 003_foyer.sql
-- Foyer partagé : frigo, planning de la semaine, liste de courses.
-- À exécuter APRÈS 002_schema.sql, dans Supabase > SQL Editor.
--
-- Chaque utilisateur appartient à UN foyer (créé automatiquement).
-- Il peut inviter un ami à le rejoindre : le frigo, le planning et
-- la liste de courses deviennent communs.
-- ============================================================

CREATE TABLE households (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL DEFAULT 'Mon foyer',
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE household_members (
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,  -- un seul foyer par personne
  joined_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (household_id, user_id)
);

CREATE TABLE household_invites (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id    uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  invited_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invited_by      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, invited_user_id)
);

CREATE TABLE fridge_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name         text NOT NULL,
  ciqual_code  text,
  quantity     numeric CHECK (quantity > 0),
  unit         text,
  expires_on   date,
  added_by     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX fridge_items_household_idx ON fridge_items (household_id, expires_on);

CREATE TABLE meal_plan (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  planned_on   date NOT NULL,
  meal         meal_type NOT NULL,
  recipe_id    uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  servings     numeric NOT NULL DEFAULT 2 CHECK (servings > 0 AND servings <= 50),
  added_by     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX meal_plan_household_idx ON meal_plan (household_id, planned_on);
CREATE INDEX meal_plan_recipe_idx ON meal_plan (recipe_id);

CREATE TABLE shopping_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name         text NOT NULL,
  ciqual_code  text,
  quantity     numeric CHECK (quantity > 0),
  unit         text,
  -- « déjà au frigo : 1 pièce » quand les unités ne se comparent pas
  note         text,
  -- 'plan' = généré depuis le planning (remplacé à chaque génération), 'manual' = ajouté à la main
  source       text NOT NULL DEFAULT 'manual' CHECK (source IN ('plan', 'manual')),
  checked      boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX shopping_items_household_idx ON shopping_items (household_id, checked);

-- ── Fonctions d'aide ────────────────────────────────────────

CREATE OR REPLACE FUNCTION my_household_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT household_id FROM household_members WHERE user_id = auth.uid();
$$;

-- Renvoie le foyer de l'utilisateur, en le créant au besoin.
CREATE OR REPLACE FUNCTION ensure_household()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE hid uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non connecté'; END IF;
  SELECT household_id INTO hid FROM household_members WHERE user_id = auth.uid();
  IF hid IS NULL THEN
    INSERT INTO households (created_by) VALUES (auth.uid()) RETURNING id INTO hid;
    INSERT INTO household_members (household_id, user_id) VALUES (hid, auth.uid());
  END IF;
  RETURN hid;
END;
$$;

-- Accepter une invitation : on rejoint le foyer. Si on était seul dans
-- son ancien foyer, son contenu (frigo, planning, courses) est apporté.
CREATE OR REPLACE FUNCTION accept_household_invite(invite uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  target uuid;
  old_hid uuid;
  old_count int;
BEGIN
  SELECT household_id INTO target FROM household_invites
    WHERE id = invite AND invited_user_id = auth.uid();
  IF target IS NULL THEN RAISE EXCEPTION 'Invitation introuvable'; END IF;

  SELECT household_id INTO old_hid FROM household_members WHERE user_id = auth.uid();
  IF old_hid IS NOT NULL AND old_hid <> target THEN
    SELECT count(*) INTO old_count FROM household_members WHERE household_id = old_hid;
    DELETE FROM household_members WHERE household_id = old_hid AND user_id = auth.uid();
    IF old_count = 1 THEN
      UPDATE fridge_items   SET household_id = target WHERE household_id = old_hid;
      UPDATE meal_plan      SET household_id = target WHERE household_id = old_hid;
      UPDATE shopping_items SET household_id = target WHERE household_id = old_hid;
      DELETE FROM households WHERE id = old_hid;
    END IF;
  END IF;

  INSERT INTO household_members (household_id, user_id) VALUES (target, auth.uid())
    ON CONFLICT DO NOTHING;
  DELETE FROM household_invites WHERE invited_user_id = auth.uid();
  RETURN target;
END;
$$;

-- Quitter le foyer : on repart avec un foyer vide, à soi.
CREATE OR REPLACE FUNCTION leave_household()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE old_hid uuid; hid uuid;
BEGIN
  SELECT household_id INTO old_hid FROM household_members WHERE user_id = auth.uid();
  IF old_hid IS NULL OR (SELECT count(*) FROM household_members WHERE household_id = old_hid) = 1 THEN
    RETURN old_hid;  -- déjà seul : rien à faire
  END IF;
  DELETE FROM household_members WHERE household_id = old_hid AND user_id = auth.uid();
  INSERT INTO households (created_by) VALUES (auth.uid()) RETURNING id INTO hid;
  INSERT INTO household_members (household_id, user_id) VALUES (hid, auth.uid());
  RETURN hid;
END;
$$;

-- Une recette prévue dans le planning du foyer est lisible par tout le foyer
CREATE OR REPLACE FUNCTION in_my_household_plan(rid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM meal_plan mp
    WHERE mp.recipe_id = rid AND mp.household_id = my_household_id()
  );
$$;

CREATE OR REPLACE FUNCTION can_view_recipe(rid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM recipes r
    WHERE r.id = rid
      AND (
        r.author_id = auth.uid()
        OR r.visibility = 'public'
        OR (r.visibility = 'friends' AND is_friend(r.author_id))
        OR EXISTS (SELECT 1 FROM recipe_shares s WHERE s.recipe_id = r.id AND s.user_id = auth.uid())
        OR in_my_household_plan(r.id)
      )
  );
$$;

DROP POLICY IF EXISTS recipes_select ON recipes;
CREATE POLICY recipes_select ON recipes FOR SELECT TO authenticated
  USING (
    author_id = auth.uid()
    OR visibility = 'public'
    OR (visibility = 'friends' AND is_friend(author_id))
    OR EXISTS (SELECT 1 FROM recipe_shares s WHERE s.recipe_id = recipes.id AND s.user_id = auth.uid())
    OR in_my_household_plan(id)
  );

-- ── Création du foyer à l'inscription (+ comptes existants) ─

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE hid uuid;
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.health_profiles (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  IF NOT EXISTS (SELECT 1 FROM public.household_members WHERE user_id = NEW.id) THEN
    INSERT INTO public.households (created_by) VALUES (NEW.id) RETURNING id INTO hid;
    INSERT INTO public.household_members (household_id, user_id) VALUES (hid, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE p record; hid uuid;
BEGIN
  FOR p IN SELECT id FROM profiles WHERE id NOT IN (SELECT user_id FROM household_members) LOOP
    INSERT INTO households (created_by) VALUES (p.id) RETURNING id INTO hid;
    INSERT INTO household_members (household_id, user_id) VALUES (hid, p.id);
  END LOOP;
END $$;

-- ── Sécurité (RLS) ──────────────────────────────────────────

ALTER TABLE households        ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE fridge_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plan         ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_items    ENABLE ROW LEVEL SECURITY;

-- Mon foyer, et ceux qui m'invitent (pour afficher leur nom)
CREATE POLICY households_select ON households FOR SELECT TO authenticated
  USING (id = my_household_id()
    OR EXISTS (SELECT 1 FROM household_invites i WHERE i.household_id = households.id AND i.invited_user_id = auth.uid()));
CREATE POLICY households_update ON households FOR UPDATE TO authenticated
  USING (id = my_household_id()) WITH CHECK (id = my_household_id());

-- Les membres de mon foyer (adhésions : seulement via les fonctions ci-dessus)
CREATE POLICY members_select ON household_members FOR SELECT TO authenticated
  USING (household_id = my_household_id());

-- Invitations : un membre invite un ami ; l'invité la voit et peut la refuser
CREATE POLICY invites_select ON household_invites FOR SELECT TO authenticated
  USING (invited_user_id = auth.uid() OR household_id = my_household_id());
CREATE POLICY invites_insert ON household_invites FOR INSERT TO authenticated
  WITH CHECK (household_id = my_household_id() AND invited_by = auth.uid() AND is_friend(invited_user_id));
CREATE POLICY invites_delete ON household_invites FOR DELETE TO authenticated
  USING (invited_user_id = auth.uid() OR household_id = my_household_id());

-- Contenu partagé du foyer
CREATE POLICY fridge_household ON fridge_items FOR ALL TO authenticated
  USING (household_id = my_household_id()) WITH CHECK (household_id = my_household_id());
CREATE POLICY shopping_household ON shopping_items FOR ALL TO authenticated
  USING (household_id = my_household_id()) WITH CHECK (household_id = my_household_id());
CREATE POLICY plan_select ON meal_plan FOR SELECT TO authenticated
  USING (household_id = my_household_id());
CREATE POLICY plan_write ON meal_plan FOR INSERT TO authenticated
  WITH CHECK (household_id = my_household_id() AND can_view_recipe(recipe_id));
CREATE POLICY plan_update ON meal_plan FOR UPDATE TO authenticated
  USING (household_id = my_household_id()) WITH CHECK (household_id = my_household_id());
CREATE POLICY plan_delete ON meal_plan FOR DELETE TO authenticated
  USING (household_id = my_household_id());

GRANT EXECUTE ON FUNCTION ensure_household(), accept_household_invite(uuid), leave_household() TO authenticated;
