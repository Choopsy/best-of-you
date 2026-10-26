import Link from 'next/link'
import { Clock, ChefHat, User, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DifficultyBadge } from './difficulty-badge'
import type { RecipeSummary } from '@/lib/types'

export function RecipeCard({ recipe, fromCategoryId }: { recipe: RecipeSummary; fromCategoryId?: string }) {
  const totalTime = (recipe.prep_time_min ?? 0) + (recipe.cook_time_min ?? 0)
  const href = fromCategoryId ? `/recipes/${recipe.id}?from=${fromCategoryId}` : `/recipes/${recipe.id}`

  return (
    <Link href={href} className="group block">
      <div className="rounded-xl overflow-hidden border bg-card shadow-sm transition-shadow group-hover:shadow-md">
        <div className="aspect-[4/3] relative bg-muted flex items-center justify-center overflow-hidden">
          {recipe.cover_image_url ? (
            <img
              src={recipe.cover_image_url}
              alt={recipe.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <ChefHat className="h-10 w-10 text-muted-foreground/25" />
          )}
        </div>

        <div className="p-3 space-y-2">
          <h3 className="font-semibold text-sm leading-tight line-clamp-2">{recipe.title}</h3>

          <div className="flex items-center justify-between gap-2">
            {totalTime > 0 && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {totalTime} min
              </span>
            )}
            {recipe.difficulty && <DifficultyBadge difficulty={recipe.difficulty} />}
          </div>

          {recipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {recipe.tags.slice(0, 2).map((tag) => (
                <Badge
                  key={tag.id}
                  variant="secondary"
                  className="text-xs px-1.5 py-0 font-normal"
                  style={tag.color ? { backgroundColor: `${tag.color}20`, color: tag.color } : {}}
                >
                  {tag.name}
                </Badge>
              ))}
              {recipe.tags.length > 2 && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0 font-normal">
                  +{recipe.tags.length - 2}
                </Badge>
              )}
            </div>
          )}

          <div className="h-4 flex items-center gap-1">
            {recipe.avg_rating != null && (
              <>
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                <span className="text-xs text-muted-foreground">{recipe.avg_rating.toFixed(1)}</span>
              </>
            )}
          </div>

          {recipe.author && (
            <div className="flex items-center gap-1.5 pt-1 border-t">
              {recipe.author.avatar_url ? (
                <img src={recipe.author.avatar_url} alt="" className="h-4 w-4 rounded-full object-cover" />
              ) : (
                <div className="h-4 w-4 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-2.5 w-2.5 text-muted-foreground" />
                </div>
              )}
              <span className="text-xs text-muted-foreground truncate">
                {recipe.author.full_name ?? 'Anonyme'}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
