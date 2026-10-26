-- Autorisation d'ajouter des recettes dans les catégories publiques
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS can_contribute boolean NOT NULL DEFAULT false;
