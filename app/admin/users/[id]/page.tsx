import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Star, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Button } from '@/components/ui/button'
import { DeleteItemButton } from '@/components/admin/delete-item-button'
import { ChangePasswordForm } from '@/components/admin/change-password-form'
import { deleteRecipeAdmin, deleteCategoryAdmin, deleteReviewAdmin } from '@/actions/admin'

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdminUserPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user: me } } = await supabase.auth.getUser()

  if (!me || me.email !== process.env.ADMIN_EMAIL) notFound()

  const admin = createAdminClient()

  const [{ data: { user } }, { data: recipes }, { data: categories }, { data: reviews }] = await Promise.all([
    admin.auth.admin.getUserById(id),
    admin.from('recipes').select('id, title, created_at').eq('author_id', id).order('created_at', { ascending: false }),
    admin.from('categories').select('id, name, created_at').eq('author_id', id).order('created_at', { ascending: false }),
    admin.from('recipe_reviews')
      .select('id, rating, comment, created_at, recipes(title)')
      .eq('user_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (!user) notFound()

  const name = (user.user_metadata?.full_name as string | undefined) ?? '—'

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="min-h-svh pb-8">
      <header className="sticky top-0 md:top-14 z-10 bg-background/80 backdrop-blur-sm border-b px-2 py-2 flex items-center gap-2">
        <Link href="/admin">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="min-w-0">
          <p className="font-semibold truncate">{name}</p>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>
      </header>

      <div className="px-4 py-5 max-w-2xl mx-auto space-y-6">

        <ChangePasswordForm userId={id} />

        {/* Recettes */}
        <section className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Recettes ({recipes?.length ?? 0})
          </p>
          {!recipes?.length ? (
            <p className="text-sm text-muted-foreground">Aucune recette.</p>
          ) : (
            <ul className="space-y-2">
              {recipes.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{r.title}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(r.created_at)}</p>
                  </div>
                  <DeleteItemButton
                    label={r.title}
                    action={deleteRecipeAdmin.bind(null, id, r.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Catégories */}
        <section className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Catégories ({categories?.length ?? 0})
          </p>
          {!categories?.length ? (
            <p className="text-sm text-muted-foreground">Aucune catégorie.</p>
          ) : (
            <ul className="space-y-2">
              {categories.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(c.created_at)}</p>
                  </div>
                  <DeleteItemButton
                    label={c.name}
                    action={deleteCategoryAdmin.bind(null, id, c.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Avis */}
        <section className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Avis ({reviews?.length ?? 0})
          </p>
          {!reviews?.length ? (
            <p className="text-sm text-muted-foreground">Aucun avis.</p>
          ) : (
            <ul className="space-y-2">
              {reviews.map((rv) => {
                const recipeTitle = (rv.recipes as any)?.title ?? '—'
                return (
                  <li key={rv.id} className="flex items-start justify-between gap-3 rounded-xl border px-4 py-3">
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-sm font-medium truncate">{recipeTitle}</p>
                      <div className="flex items-center gap-1.5">
                        {rv.rating && (
                          <span className="flex items-center gap-0.5 text-xs text-amber-500">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            {rv.rating}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">{formatDate(rv.created_at)}</span>
                      </div>
                      {rv.comment && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{rv.comment}</p>
                      )}
                    </div>
                    <DeleteItemButton
                      label={`avis sur "${recipeTitle}"`}
                      action={deleteReviewAdmin.bind(null, id, rv.id)}
                    />
                  </li>
                )
              })}
            </ul>
          )}
        </section>

      </div>
    </div>
  )
}
