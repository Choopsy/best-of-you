'use client'

import { Portal } from '@/components/ui/portal'
import { useState, useEffect } from 'react'
import { Heart, BookmarkPlus, Check, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Collection } from '@/lib/types'

interface Props {
  recipeId: string
  initialLiked: boolean
  userCollections: Collection[]
}

export function RecipeActions({ recipeId, initialLiked, userCollections }: Props) {
  const [liked, setLiked] = useState(initialLiked)
  const [likeLoading, setLikeLoading] = useState(false)

  // Collections locales (prop + nouvelles créées inline)
  const [localCollections, setLocalCollections] = useState<Collection[]>(userCollections)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [loadingSaves, setLoadingSaves] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())

  // Formulaire de création inline
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  useEffect(() => {
    if (!dialogOpen || localCollections.length === 0) return
    setLoadingSaves(true)
    setSaveError(null)
    const supabase = createClient()
    supabase
      .from('collection_recipes')
      .select('collection_id')
      .eq('recipe_id', recipeId)
      .in('collection_id', localCollections.map((c) => c.id))
      .then(({ data }) => {
        const ids = new Set(data?.map((d) => d.collection_id) ?? [])
        setSavedIds(ids)
        setPendingIds(new Set(ids))
        setLoadingSaves(false)
      })
  }, [dialogOpen, recipeId, localCollections])

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
      ...toAdd.map((collection_id) =>
        supabase.from('collection_recipes').insert({ collection_id, recipe_id: recipeId }).then((r) => r.error)
      ),
      ...toRemove.map((collection_id) =>
        supabase.from('collection_recipes').delete()
          .eq('collection_id', collection_id).eq('recipe_id', recipeId).then((r) => r.error)
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

  const handleCreateCollection = async () => {
    if (!newName.trim()) return setCreateError('Le nom est obligatoire.')
    setCreating(true)
    setCreateError(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setCreating(false); return }

    const { data, error } = await supabase
      .from('collections')
      .insert({ owner_id: user.id, name: newName.trim() })
      .select('id, owner_id, name, cover_image_url, created_at')
      .single()

    if (error || !data) {
      setCreateError(error?.message ?? 'Erreur lors de la création.')
    } else {
      const newCat = data as Collection
      setLocalCollections((prev) => [...prev, newCat])
      setPendingIds((prev) => new Set([...prev, newCat.id]))
      setShowCreate(false)
      setNewName('')
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
        aria-label="Ajouter à une collection"
      >
        <BookmarkPlus className="h-4 w-4" />
      </Button>

      {/* Dialog — s'ouvre juste sous la barre du haut */}
      <Portal>
      {dialogOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={handleCancel} />

          <div className="absolute inset-x-4 top-14 mx-auto max-w-sm bg-background rounded-2xl shadow-xl overflow-hidden">
            <div className="px-5 pt-5 pb-4 space-y-4">
              <h3 className="font-semibold text-base">Ajouter à une collection</h3>

              {/* Liste des collections */}
              {loadingSaves ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Chargement…</p>
              ) : localCollections.length === 0 && !showCreate ? (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Tu n&apos;as pas encore de collection.
                </p>
              ) : (
                <ul className="space-y-1 max-h-52 overflow-y-auto -mx-1 px-1">
                  {localCollections.map((cat) => {
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
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}

              {/* Formulaire de création inline */}
              {showCreate ? (
                <div className="border rounded-xl p-3 space-y-3">
                  <p className="text-sm font-medium">Nouvelle collection</p>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Nom de la collection"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateCollection()}
                    autoFocus
                  />
                  {createError && <p className="text-xs text-destructive">{createError}</p>}
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => { setShowCreate(false); setNewName(''); setCreateError(null) }}>
                      Annuler
                    </Button>
                    <Button size="sm" className="flex-1" onClick={handleCreateCollection} disabled={creating}>
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
                  Nouvelle collection
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
      </Portal>
    </>
  )
}
