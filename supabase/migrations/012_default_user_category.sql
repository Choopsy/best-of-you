-- ============================================================
-- 012_default_user_category.sql
-- Crée automatiquement une catégorie "Mes recettes" pour chaque
-- nouvel utilisateur + rétroactif pour les utilisateurs existants
-- ============================================================

-- Fonction déclenchée à chaque création de profil
CREATE OR REPLACE FUNCTION create_default_category()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO categories (author_id, name, visibility, cover_image_url)
  VALUES (
    NEW.id,
    'Mes recettes',
    'private',
    'https://lkwqnkopcgdplznrccni.supabase.co/storage/v1/object/public/recipe-images/hanna-balan-2qdfvGXlV1g-unsplash.jpg'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_category();

-- Rétroactif : utilisateurs existants sans catégorie "Mes recettes"
INSERT INTO categories (author_id, name, visibility, cover_image_url)
SELECT p.id, 'Mes recettes', 'private', 'https://lkwqnkopcgdplznrccni.supabase.co/storage/v1/object/public/recipe-images/hanna-balan-2qdfvGXlV1g-unsplash.jpg'
FROM profiles p
WHERE p.id != '00000000-0000-0000-0000-000000000000'
  AND NOT EXISTS (
    SELECT 1 FROM categories c
    WHERE c.author_id = p.id AND c.name = 'Mes recettes'
  );
