import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Clock, Users, Pencil, ChefHat, User, Globe, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { PageHeader } from '@/components/layout/page-header'
import { DifficultyBadge } from '@/components/recipes/difficulty-badge'
import { ServingAdjuster } from '@/components/recipes/serving-adjuster'
import { RecipeActions } from '@/components/recipes/recipe-actions'
import { RecipeNutrition } from '@/components/recipes/recipe-nutrition'
import { RecipeReviews } from '@/components/recipes/recipe-reviews'
import { ShareRecipe, type FriendOption } from '@/components/recipes/share-recipe'
import { AddEntry } from '@/components/journal/add-entry'
import { calcRecipeNutrition } from '@/lib/nutrition'
import { getHealthContext } from '@/lib/health'
import { loadRecipe } from '@/lib/recipes'
import { todayISO } from '@/lib/dates'
import { VISIBILITY_LABELS, type Collection, type Review } from '@/lib/types'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ from?: string }>
}

export default async function RecipeDetailPage({ params, searchParams }: Props) {
  const { id } = await params
  const { from } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [recipe, { data: likeRow }, { data: userCols }, { data: reviewsData }, ctx] = await Promise.all([
    loadRecipe(supabase, id),
    supabase.from('recipe_likes').select('recipe_id').eq('user_id', user.id).eq('recipe_id', id).maybeSingle(),
    supabase.from('collections').select('id, owner_id, name, cover_image_url, created_at').eq('owner_id', user.id).order('name'),
    supabase.from('recipe_reviews')
      .select('id, recipe_id, user_id, rating, comment, created_at, profiles!user_id(full_name, avatar_url)')
      .eq('recipe_id', id)
      .order('created_at', { ascending: false }),
    getHealthContext(supabase, user.id),
  ])

  if (!recipe) notFound()
  const isOwner = user.id === recipe.author_id

  // Amis (pour le partage) — seulement pour l'auteur
  let friends: FriendOption[] = []
  let sharedWith: string[] = []
  if (isOwner) {
    const [{ data: fs }, { data: shares }] = await Promise.all([
      supabase.from('friendships')
        .select('requester_id, addressee_id, requester:profiles!requester_id(id, full_name, avatar_url), addressee:profiles!addressee_id(id, full_name, avatar_url)')
        .eq('status', 'accepted'),
      supabase.from('recipe_shares').select('user_id').eq('recipe_id', id),
    ])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    friends = (fs ?? []).map((f: any) => (f.requester_id === user.id ? f.addressee : f.requester)).filter(Boolean)
    sharedWith = (shares ?? []).map((s) => s.user_id)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reviews: Review[] = (reviewsData ?? []).map((r: any) => ({ ...r, author: r.profiles ?? null }))
  const myReview = reviews.find((r) => r.user_id === user.id) ?? null
  const otherReviews = reviews.filter((r) => r.user_id !== user.id)

  const author = recipe.author
  const totalTime = (recipe.prep_time_min ?? 0) + (recipe.cook_time_min ?? 0)
  const nutrition = await calcRecipeNutrition(
    supabase,
    recipe.ingredient_groups.flatMap((g) => g.ingredients),
    recipe.base_servings ?? 1,
  )
  const t = ctx.targets
  const goals = t ? {
    energy_kcal: t.energyKcal, proteins_g: t.proteinsG, carbs_g: t.carbsG, fat_g: t.fatG,
    sugars_g: t.sugarsMaxG, saturated_fat_g: t.saturatedFatMaxG, fiber_g: t.fiberMinG, salt_g: t.saltMaxG,
  } : null
  const VisIcon = recipe.visibility === 'public' ? Globe : recipe.visibility === 'friends' ? Users : Lock

  return (
    <div className="min-h-svh pb-24">
      <PageHeader title="" back={from?.startsWith('/') ? from : '/recipes'}>
        <RecipeActions recipeId={id} initialLiked={!!likeRow} userCollections={(userCols as Collection[]) ?? []} />
        {isOwner && <ShareRecipe recipeId={id} friends={friends} sharedWith={sharedWith} />}
        {isOwner && (
          <Link href={`/recipes/${id}/edit`}>
            <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Modifier">
              <Pencil className="h-4 w-4" />
            </Button>
          </Link>
        )}
      </PageHeader>

      {recipe.cover_image_url && (
        <div className="aspect-video w-full max-w-3xl mx-auto bg-muted overflow-hidden md:mt-4 md:rounded-2xl">
          <img src={recipe.cover_image_url} alt={recipe.title} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="px-4 py-5 space-y-5 max-w-2xl mx-auto">
        <div className="space-y-3">
          <h1 className="text-2xl font-bold leading-tight">{recipe.title}</h1>

          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {author && (
              <span className="flex items-center gap-2">
                {author.avatar_url ? (
                  <img src={author.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover" />
                ) : (
                  <span className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-3.5 w-3.5" />
                  </span>
                )}
                {isOwner ? 'Toi' : author.full_name ?? 'Anonyme'}
              </span>
            )}
            <span className="flex items-center gap-1 text-xs">
              <VisIcon className="h-3.5 w-3.5" /> {VISIBILITY_LABELS[recipe.visibility].label}
            </span>
          </div>

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
            {nutrition ? (
              <RecipeNutrition nutrition={nutrition} goals={goals} />
            ) : (
              <p className="text-xs text-muted-foreground rounded-xl bg-muted/50 px-4 py-3">
                Aucun ingrédient n&apos;est lié à la base Ciqual : les valeurs nutritionnelles ne peuvent pas être calculées.
                {isOwner && ' Modifie la recette et choisis les ingrédients dans la liste proposée.'}
              </p>
            )}
            {nutrition && (
              <AddEntry
                date={todayISO()}
                recipes={[]}
                recipe={{ id: recipe.id, title: recipe.title, cover_image_url: recipe.cover_image_url }}
                trigger="wide"
              />
            )}
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
