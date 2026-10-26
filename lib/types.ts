export type Difficulty = 'easy' | 'medium' | 'hard'
export type CategoryVisibility = 'public' | 'private' | 'shared'

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Facile',
  medium: 'Moyen',
  hard: 'Difficile',
}

export interface Category {
  id: string
  author_id: string
  name: string
  visibility: CategoryVisibility
  cover_image_url: string | null
  created_at: string
}

export interface Friendship {
  id: string
  requester_id: string
  addressee_id: string
  status: 'pending' | 'accepted'
  created_at: string
  requester?: { full_name: string | null; avatar_url: string | null }
  addressee?: { full_name: string | null; avatar_url: string | null }
}

export interface Tag {
  id: string
  name: string
  color: string | null
}

export interface Ingredient {
  id: string
  name: string
  amount: number | null
  unit: string | null
  position: number
}

export interface IngredientGroup {
  id: string
  name: string
  position: number
  ingredients: Ingredient[]
}

export interface Step {
  id: string
  position: number
  content: string
  image_url: string | null
  ingredient_ids: string[]
}

export interface RecipeAuthor {
  full_name: string | null
  avatar_url: string | null
}

export interface RecipeSummary {
  id: string
  title: string
  description: string | null
  cover_image_url: string | null
  prep_time_min: number | null
  cook_time_min: number | null
  base_servings: number | null
  difficulty: Difficulty | null
  category_id: string | null
  created_at: string
  tags: Tag[]
  author: RecipeAuthor | null
  avg_rating: number | null
}

export interface RecipeDetail extends RecipeSummary {
  author_id: string
  ingredient_groups: IngredientGroup[]
  steps: Step[]
}

export interface Review {
  id: string
  recipe_id: string
  user_id: string
  rating: number | null
  comment: string | null
  created_at: string
  author: RecipeAuthor | null
}

export interface CreateRecipeInput {
  title: string
  description: string
  cover_image_url: string
  prep_time_min: number | null
  cook_time_min: number | null
  base_servings: number
  difficulty: Difficulty
  category_id: string | null
  tag_ids: string[]
  groups: {
    name: string
    ingredients: { name: string; amount: number | null; unit: string }[]
  }[]
  steps: { content: string; image_url: string; ingredient_positions: Array<{ gi: number; ii: number }> }[]
}
