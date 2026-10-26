import type { ActivityLevel, Goal, Sex } from './targets'

export type Difficulty = 'easy' | 'medium' | 'hard'
export type RecipeVisibility = 'private' | 'friends' | 'public'
export type Diet = 'omnivore' | 'pescatarian' | 'vegetarian' | 'vegan'
export type Exclusion = 'gluten' | 'lactose'
export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Facile',
  medium: 'Moyen',
  hard: 'Difficile',
}

export const VISIBILITY_LABELS: Record<RecipeVisibility, { label: string; hint: string }> = {
  private: { label: 'Privée', hint: 'Toi seul' },
  friends: { label: 'Amis', hint: 'Tes amis' },
  public:  { label: 'Publique', hint: 'Tous les utilisateurs' },
}

export const DIET_LABELS: Record<Diet, string> = {
  omnivore: 'Omnivore',
  pescatarian: 'Pescétarien',
  vegetarian: 'Végétarien',
  vegan: 'Vegan',
}

export const EXCLUSION_LABELS: Record<Exclusion, string> = {
  gluten: 'Sans gluten',
  lactose: 'Sans lactose',
}

/** Tags de recette qui correspondent à chaque régime (pour filtrer) */
export const DIET_TAGS: Record<Diet, string[]> = {
  omnivore: [],
  pescatarian: ['Pescétarien', 'Végétarien', 'Vegan'],
  vegetarian: ['Végétarien', 'Vegan'],
  vegan: ['Vegan'],
}
export const EXCLUSION_TAGS: Record<Exclusion, string> = {
  gluten: 'Sans gluten',
  lactose: 'Sans lactose',
}

export const MEAL_LABELS: Record<Meal, string> = {
  breakfast: 'Petit-déjeuner',
  lunch: 'Déjeuner',
  dinner: 'Dîner',
  snack: 'Collation',
}
export const MEALS: Meal[] = ['breakfast', 'lunch', 'dinner', 'snack']

export interface HealthProfile {
  user_id: string
  sex: Sex | null
  birth_date: string | null
  height_cm: number | null
  activity_level: ActivityLevel | null
  goal: Goal
  goal_rate_kg_week: number | null
  target_weight_kg: number | null
  diet: Diet
  exclusions: Exclusion[]
  weekly_sessions_goal: number | null
}

export interface Collection {
  id: string
  owner_id: string
  name: string
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
  ciqual_code: string | null
  weight_g: number | null
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
  visibility: RecipeVisibility
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

export interface FoodLog {
  id: string
  eaten_on: string
  meal: Meal
  recipe_id: string | null
  ciqual_code: string | null
  label: string
  servings: number | null
  grams: number | null
  energy_kcal: number
  proteins_g: number
  carbs_g: number
  sugars_g: number
  fat_g: number
  saturated_fat_g: number
  fiber_g: number
  salt_g: number
}

export interface CreateRecipeInput {
  title: string
  description: string
  cover_image_url: string
  prep_time_min: number | null
  cook_time_min: number | null
  base_servings: number
  difficulty: Difficulty
  visibility: RecipeVisibility
  collection_id: string | null
  tag_ids: string[]
  groups: {
    name: string
    ingredients: {
      name: string
      amount: number | null
      unit: string
      ciqual_code: string | null
      weight_g: number | null
    }[]
  }[]
  steps: { content: string; image_url: string; ingredient_positions: Array<{ gi: number; ii: number }> }[]
}

export interface FoodSuggestion {
  code: string
  name: string
  kcal: number | null
  proteins: number | null
}

export interface PickableRecipe {
  id: string
  title: string
  cover_image_url: string | null
}
