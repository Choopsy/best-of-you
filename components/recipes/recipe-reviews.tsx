'use client'

import { useState, useTransition } from 'react'
import { Star, Trash2, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  AlertDialog, AlertDialogCancel, AlertDialogClose, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { upsertReview, deleteReview } from '@/actions/reviews'
import type { Review } from '@/lib/types'

function Stars({
  value,
  onSelect,
  size = 'md',
}: {
  value: number
  onSelect?: (n: number) => void
  size?: 'sm' | 'md'
}) {
  const [hover, setHover] = useState(0)
  const cls = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onSelect?.(n === value ? 0 : n)}
          onMouseEnter={() => onSelect && setHover(n)}
          onMouseLeave={() => onSelect && setHover(0)}
          disabled={!onSelect}
          className={onSelect ? 'cursor-pointer' : 'cursor-default'}
        >
          <Star
            className={`${cls} transition-colors ${
              n <= (hover || value)
                ? 'fill-amber-400 text-amber-400'
                : 'text-muted-foreground/40'
            }`}
          />
        </button>
      ))}
    </div>
  )
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function ReviewForm({ recipeId, myReview }: { recipeId: string; myReview: Review | null }) {
  const [rating, setRating] = useState(myReview?.rating ?? 0)
  const [comment, setComment] = useState(myReview?.comment ?? '')
  const [isPending, startTransition] = useTransition()

  const canSubmit = !isPending && (rating > 0 || comment.trim().length > 0)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => { await upsertReview(recipeId, rating || null, comment) })
  }

  function handleDelete() {
    startTransition(async () => { await deleteReview(recipeId) })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border p-4 bg-muted/30">
      <p className="text-sm font-medium">{myReview ? 'Ton avis' : 'Laisser un avis'}</p>
      <Stars value={rating} onSelect={setRating} />
      <Textarea
        placeholder="Ajouter un commentaire (optionnel)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        className="resize-none text-sm"
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={!canSubmit}>
          {isPending ? 'Envoi…' : myReview ? 'Modifier' : 'Publier'}
        </Button>
        {myReview && (
          <AlertDialog>
            <AlertDialogTrigger
              render={<Button type="button" variant="ghost" size="sm" disabled={isPending} />}
            >
              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer ton avis ?</AlertDialogTitle>
                <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogClose
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={handleDelete}
                >
                  Supprimer
                </AlertDialogClose>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </form>
  )
}

interface Props {
  recipeId: string
  myReview: Review | null
  otherReviews: Review[]
}

export function RecipeReviews({ recipeId, myReview, otherReviews }: Props) {
  const allRatings = [myReview, ...otherReviews]
    .filter((r): r is Review => r !== null && r.rating !== null)
    .map((r) => r.rating as number)

  const avgRating = allRatings.length
    ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length
    : 0

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="font-semibold">Avis</h2>
        {avgRating > 0 && (
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            {avgRating.toFixed(1)} ({allRatings.length})
          </span>
        )}
      </div>

      <ReviewForm key={myReview?.id ?? 'new'} recipeId={recipeId} myReview={myReview} />

      {(myReview || otherReviews.length > 0) && (
        <div className="space-y-4 pt-1">
          {[...(myReview ? [myReview] : []), ...otherReviews].map((review) => (
            <div key={review.id} className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                {review.author?.avatar_url ? (
                  <img src={review.author.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover" />
                ) : (
                  <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                )}
                <span className="text-sm font-medium">{review.author?.full_name ?? 'Anonyme'}</span>
                {review.rating != null && <Stars value={review.rating} size="sm" />}
                <span className="text-xs text-muted-foreground ml-auto">{formatDate(review.created_at)}</span>
              </div>
              {review.comment?.trim() && (
                <p className="text-sm text-muted-foreground pl-8 leading-relaxed">{review.comment}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
