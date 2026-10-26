-- ============================================================
-- 003_storage.sql
-- Bucket Supabase Storage pour les images de recettes
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('recipe-images', 'recipe-images', true)
ON CONFLICT (id) DO NOTHING;

-- Lecture publique (pour afficher les images sans auth)
CREATE POLICY "Public can view recipe images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'recipe-images');

-- Upload réservé aux utilisateurs connectés
CREATE POLICY "Authenticated users can upload recipe images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'recipe-images');

-- Suppression réservée aux utilisateurs connectés
CREATE POLICY "Authenticated users can delete recipe images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'recipe-images');
