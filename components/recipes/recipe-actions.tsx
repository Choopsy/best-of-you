'use client'

import { useState, useEffect } from 'react'
import { Heart, BookmarkPlus, Check, Plus, Globe, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Category } from '@/lib/types'

interface Props {
  recipeId: string
  initialLiked: boolean
  userCategories: Category[]
}

export function RecipeActions({ recipeId, initialLiked, userCategories }: Props) {
  const [liked, setLiked] = useState(initialLiked)
  const [likeLoading, setLikeLoading] = useState(false)

  // Catégories locales (prop + nouvelles créées inline)
  const [localCategories, setLocalCategories] = useState<Category[]>(userCategories)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [loadingSaves, setLoadingSaves] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())

  // Formulaire de création inline
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newIsPublic, setNewIsPublic] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  useEffect(() => {
    if (!dialogOpen || localCategories.length === 0) return
    setLoadingSaves(true)
    setSaveError(null)
    const supabase = createClient()
    supabase
      .from('category_saves')
      .select('category_id')
      .eq('recipe_id', recipeId)
      .in('category_id', localCategories.map((c) => c.id))
      .then(({ data }) => {
        const ids = new Set(data?.map((d) => d.category_id) ?? [])
        setSavedIds(ids)
        setPendingIds(new Set(ids))
        setLoadingSaves(false)
      })
  }, [dialogOpen, recipeId, localCategories])

  const toggleLike = async () => {
    setLikeLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLikeLoading(false); return }
    if (liked) {
      await supabase.from('recipe_likes').delete().eq('user_id', user.id).eq('recipe_id', recipeId)
    } else {
      await supabase.from('recipe_likes').insert({ user_id: user.id, recipe_id: recipeId })
    }
    setLiked((prev) => !prev)
    setLikeLoading(false)
  }

  const togglePending = (id: string) => {
    setPendingIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleCancel = () => {
    setDialogOpen(false)
    setShowCreate(false)
    setNewName('')
    setSaveError(null)
    setCreateError(null)
  }

  const handleConfirm = async () => {
    setSaving(true)
    setSaveError(null)
    const supabase = createClient()

    const toAdd = [...pendingIds].filter((id) => !savedIds.has(id))
    const toRemove = [...savedIds].filter((id) => !pendingIds.has(id))

    const ops = [
      ...toAdd.map((category_id) =>
        supabase.from('category_saves').insert({ category_id, recipe_id: recipeId }).then((r) => r.error)
      ),
      ...toRemove.map((category_id) =>
        supabase.from('category_saves').delete()
          .eq('category_id', category_id).eq('recipe_id', recipeId).then((r) => r.error)
      ),
    ]

    const errors = (await Promise.all(ops)).filter(Boolean)
    if (errors.length > 0) {
      setSaveError(`Erreur : ${(errors[0] as { message: string }).message}`)
    } else {
      setSavedIds(new Set(pendingIds))
      setDialogOpen(false)
      setShowCreate(false)
      setNewName('')
    }
    setSaving(false)
  }

  const handleCreateCategory = async () => {
    if (!newName.trim()) return setCreateError('Le nom est obligatoire.')
    setCreating(true)
    setCreateError(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setCreating(false); return }

    // S'assurer que le profil existe
    await supabase.from('profiles').upsert(
      { id: user.id, full_name: user.user_metadata?.full_name ?? null },
      { onConflict: 'id', ignoreDuplicates: true },
    )

    const { data, error } = await supabase
      .from('categories')
      .insert({ author_id: user.id, name: newName.trim(), visibility: 'private' })
      .select('id, author_id, name, visibility, cover_image_url, created_at')
      .single()

    if (error || !data) {
      setCreateError(error?.message ?? 'Erreur lors de la création.')
    } else {
      const newCat = data as Category
      setLocalCategories((prev) => [...prev, newCat])
      setPendingIds((prev) => new Set([...prev, newCat.id]))
      setShowCreate(false)
      setNewName('')
      setNewIsPublic(false)
    }
    setCreating(false)
  }

  return (
    <>
      {/* Bouton cœur */}
      <Button
        variant="ghost" size="icon" className="h-9 w-9"
        onClick={toggleLike} disabled={likeLoading}
        aria-label={liked ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      >
        <Heart className={`h-4 w-4 transition-colors ${liked ? 'fill-red-500 text-red-500' : ''}`} />
      </Button>

      {/* Bouton sauvegarder */}
      <Button
        variant="ghost" size="icon" className="h-9 w-9"
        onClick={() => setDialogOpen(true)}
        aria-label="Ajouter à une catégorie"
      >
        <BookmarkPlus className="h-4 w-4" />
      </Button>

      {/* Dialog — s'ouvre juste sous la barre du haut */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={handleCancel} />

          <div className="absolute inset-x-4 top-14 mx-auto max-w-sm bg-background rounded-2xl shadow-xl overflow-hidden">
            <div className="px-5 pt-5 pb-4 space-y-4">
              <h3 className="font-semibold text-base">Ajouter à une catégorie</h3>

              {/* Liste des catégories */}
              {loadingSaves ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Chargement…</p>
              ) : localCategories.length === 0 && !showCreate ? (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Tu n&apos;as pas encore de catégorie.
                </p>
              ) : (
                <ul className="space-y-1 max-h-52 overflow-y-auto -mx-1 px-1">
                  {localCategories.map((cat) => {
                    const selected = pendingIds.has(cat.id)
                    return (
                      <li key={cat.id}>
                        <button
                          type="button"
                          onClick={() => togglePending(cat.id)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted active:bg-muted/60 transition-colors text-left"
                        >
                          <span className={`flex-none flex items-center justify-center h-5 w-5 rounded border-2 transition-colors ${selected ? 'bg-primary border-primary' : 'border-muted-foreground/30'}`}>
                            {selected && <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />}
                          </span>
                          <span className="text-sm font-medium flex-1">{cat.name}</span>
                          {cat.visibility === 'public'
                            ? <Globe className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                            : <Lock className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}

              {/* Formulaire de création inline */}
              {showCreate ? (
                <div className="border rounded-xl p-3 space-y-3">
                  <p className="text-sm font-medium">Nouvelle catégorie</p>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Nom de la catégorie"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateCategory()}
                    autoFocus
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewIsPublic(false)}
                      className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition-colors ${!newIsPublic ? 'border-foreground bg-muted' : 'border-border'}`}
                    >
                      <Lock className="h-3.5 w-3.5" /> Privée
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewIsPublic(true)}
                      className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition-colors ${newIsPublic ? 'border-foreground bg-muted' : 'border-border'}`}
                    >
                      <Globe className="h-3.5 w-3.5" /> Publique
                    </button>
                  </div>
                  {createError && <p className="text-xs text-destructive">{createError}</p>}
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => { setShowCreate(false); setNewName(''); setCreateError(null) }}>
                      Annuler
                    </Button>
                    <Button size="sm" className="flex-1" onClick={handleCreateCategory} disabled={creating}>
                      {creating ? 'Création…' : 'Créer'}
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowCreate(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed text-sm text-muted-foreground hover:bg-muted transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Nouvelle catégorie
                </button>
              )}

              {saveError && <p className="text-xs text-destructive">{saveError}</p>}
            </div>

            <div className="flex gap-3 px-5 pb-5">
              <Button variant="outline" className="flex-1" onClick={handleCancel} disabled={saving}>
                Annuler
              </Button>
              <Button className="flex-1" onClick={handleConfirm} disabled={saving || loadingSaves}>
                {saving ? 'Enregistrement…' : 'Confirmer'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
