import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Clock, Users, Pencil, ChefHat, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { DifficultyBadge } from '@/components/recipes/difficulty-badge'
import { ServingAdjuster } from '@/components/recipes/serving-adjuster'
import { RecipeActions } from '@/components/recipes/recipe-actions'
import { RecipeNutrition } from '@/components/recipes/recipe-nutrition'
import { RecipeReviews } from '@/components/recipes/recipe-reviews'
import { calcRecipeNutrition } from '@/lib/nutrition'
import type { RecipeDetail, Category, Review } from '@/lib/types'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ from?: string }>
}

export default async function RecipeDetailPage({ params, searchParams }: Props) {
  const { id } = await params
  const { from } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: raw }, { data: likeRow }, { data: userCats }, { data: reviewsData }] = await Promise.all([
    supabase
      .from('recipes')
      .select(`
        id, title, description, cover_image_url,
        prep_time_min, cook_time_min, base_servings, difficulty, category_id, created_at, author_id,
        recipe_tags ( tags ( id, name, color ) ),
        profiles!author_id ( full_name, avatar_url ),
        ingredient_groups (
          id, name, position,
          ingredients ( id, name, amount, unit, position )
        ),
        steps ( id, position, content, image_url )
      `)
      .eq('id', id)
      .single(),
    // Statut like de l'utilisateur courant
    user
      ? supabase.from('recipe_likes')
          .select('recipe_id')
          .eq('user_id', user.id)
          .eq('recipe_id', id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    // Catégories de l'utilisateur (pour le panneau de sauvegarde)
    user
      ? supabase.from('categories')
          .select('id, author_id, name, visibility, cover_image_url, created_at')
          .eq('author_id', user.id)
          .order('name')
      : Promise.resolve({ data: [] }),
    // Avis sur la recette
    supabase.from('recipe_reviews')
      .select('id, recipe_id, user_id, rating, comment, created_at, profiles!user_id(full_name, avatar_url)')
      .eq('recipe_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (!raw) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawAny = raw as any
  const author = rawAny.profiles ?? null
  const recipe: RecipeDetail = {
    ...raw,
    tags: (raw.recipe_tags as any[]).map((rt) => rt.tags).filter(Boolean),
    author,
    avg_rating: null,
    ingredient_groups: (raw.ingredient_groups as any[])
      .sort((a, b) => a.position - b.position)
      .map((g) => ({
        ...g,
        ingredients: (g.ingredients as any[]).sort((a: any, b: any) => a.position - b.position),
      })),
    steps: (raw.steps as any[]).sort((a, b) => a.position - b.position),
  }

  const reviews: Review[] = (reviewsData ?? []).map((r) => ({
    ...(r as any),
    author: (r as any).profiles ?? null,
  }))
  const myReview = reviews.find((r) => r.user_id === user?.id) ?? null
  const otherReviews = reviews.filter((r) => r.user_id !== user?.id)

  const totalTime = (recipe.prep_time_min ?? 0) + (recipe.cook_time_min ?? 0)
  const isOwner = user?.id === recipe.author_id
  const initialLiked = !!likeRow
  const userCategories = (userCats as Category[]) ?? []

  const allIngredients = recipe.ingredient_groups.flatMap((g) => g.ingredients)
  const nutrition = await calcRecipeNutrition(supabase, allIngredients, recipe.base_servings ?? 1)

  return (
    <div className="min-h-svh pb-8">
      <header className="sticky top-0 md:top-14 z-10 bg-background/80 backdrop-blur-sm border-b px-2 py-2 flex items-center justify-between">
        <Link href={from ? `/categories/${from}` : recipe.category_id ? `/categories/${recipe.category_id}` : '/'}>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>

        <div className="flex items-center gap-1">
          <RecipeActions
            recipeId={id}
            initialLiked={initialLiked}
            userCategories={userCategories}
          />
          {isOwner && (
            <Link href={`/recipes/${id}/edit`}>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Pencil className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      </header>

      {recipe.cover_image_url && (
        <div className="aspect-video w-full bg-muted overflow-hidden">
          <img src={recipe.cover_image_url} alt={recipe.title} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="px-4 py-5 space-y-5 max-w-2xl mx-auto">
        {/* Titre & méta */}
        <div className="space-y-3">
          <h1 className="text-2xl font-bold leading-tight">{recipe.title}</h1>

          {author && (
            <div className="flex items-center gap-2">
              {author.avatar_url ? (
                <img src={author.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover" />
              ) : (
                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              )}
              <span className="text-sm text-muted-foreground">{author.full_name ?? 'Anonyme'}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {recipe.difficulty && <DifficultyBadge difficulty={recipe.difficulty} />}
            {totalTime > 0 && (
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {totalTime} min
              </span>
            )}
            {recipe.base_servings && (
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                {recipe.base_servings} portions
              </span>
            )}
          </div>

          {recipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {recipe.tags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="secondary"
                  style={tag.color ? { backgroundColor: `${tag.color}20`, color: tag.color } : {}}
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}

          {recipe.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{recipe.description}</p>
          )}
        </div>

        {/* Temps détaillés */}
        {(recipe.prep_time_min || recipe.cook_time_min) && (
          <>
            <Separator />
            <div className="flex gap-6">
              {recipe.prep_time_min && (
                <div>
                  <p className="text-xs text-muted-foreground">Préparation</p>
                  <p className="font-semibold">{recipe.prep_time_min} min</p>
                </div>
              )}
              {recipe.cook_time_min && (
                <div>
                  <p className="text-xs text-muted-foreground">Cuisson</p>
                  <p className="font-semibold">{recipe.cook_time_min} min</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Ingrédients avec ajusteur */}
        {recipe.ingredient_groups.length > 0 && (
          <>
            <Separator />
            <ServingAdjuster
              baseServings={recipe.base_servings ?? 4}
              groups={recipe.ingredient_groups}
            />
            {nutrition && <RecipeNutrition nutrition={nutrition} />}
          </>
        )}

        {/* Étapes */}
        {recipe.steps.length > 0 && (
          <>
            <Separator />
            <div className="space-y-4">
              <h2 className="font-semibold">Préparation</h2>
              <ol className="space-y-5">
                {recipe.steps.map((step, i) => (
                  <li key={step.id} className="flex gap-3">
                    <span className="flex-none flex items-center justify-center h-7 w-7 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <div className="space-y-2 flex-1">
                      <p className="text-sm leading-relaxed">{step.content}</p>
                      {step.image_url && (
                        <img
                          src={step.image_url}
                          alt={`Étape ${i + 1}`}
                          className="rounded-lg w-full object-cover max-h-52"
                        />
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <Separator />
            <Link href={`/recipes/${id}/cook`}>
              <Button className="w-full h-14 text-lg rounded-2xl font-bold flex gap-2">
                <ChefHat className="h-5 w-5" />
                Cuisiner
              </Button>
            </Link>
          </>
        )}

        <Separator />
        <RecipeReviews recipeId={id} myReview={myReview} otherReviews={otherReviews} />
      </div>
    </div>
  )
}
