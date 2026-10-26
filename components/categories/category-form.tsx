'use client'

import { useState, useTransition } from 'react'
import { Globe, Lock, Check, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ImagePicker } from '@/components/recipes/image-picker'
import {
  AlertDialog, AlertDialogCancel, AlertDialogClose, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { createCategory, updateCategory, deleteCategory } from '@/actions/categories'
import type { Category } from '@/lib/types'

interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
}

interface Props {
  initialData?: Category
  availableFriends?: Profile[]
  initialMemberIds?: string[]
}

export function CategoryForm({ initialData, availableFriends = [], initialMemberIds = [] }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState(initialData?.name ?? '')
  const [coverUrl, setCoverUrl] = useState(initialData?.cover_image_url ?? '')

  const initBase = initialData?.visibility === 'public' ? 'public' : 'private'
  const initShared = initialData?.visibility === 'shared'
  const [baseVis, setBaseVis] = useState<'public' | 'private'>(initBase)
  const [shared, setShared] = useState(initShared)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialMemberIds))

  const visibility = baseVis === 'public' ? 'public' : shared ? 'shared' : 'private'

  const toggleFriend = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSubmit = () => {
    if (!name.trim()) return setError('Le nom est obligatoire.')
    setError(null)
    const fd = new FormData()
    fd.set('name', name.trim())
    fd.set('visibility', visibility)
    fd.set('cover_image_url', coverUrl)
    if (visibility === 'shared') {
      fd.set('member_ids', JSON.stringify([...selectedIds]))
    }

    startTransition(async () => {
      const result = initialData
        ? await updateCategory(initialData.id, fd)
        : await createCategory(fd)
      if (result?.error) setError(result.error)
    })
  }

  const handleDelete = () => {
    if (!initialData) return
    startTransition(async () => { await deleteCategory(initialData.id) })
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Nom *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Desserts de Grand-mère"
        />
      </div>

      <div className="space-y-3">
        <Label>Visibilité</Label>

        {/* 2 boutons */}
        <div className="grid grid-cols-2 gap-2">
          {([
            { value: 'private' as const, icon: Lock,  label: 'Privée',   desc: 'Visible uniquement par toi' },
            { value: 'public'  as const, icon: Globe, label: 'Publique', desc: 'Visible par tous les membres' },
          ] as const).map(({ value, icon: Icon, label, desc }) => (
            <button
              key={value}
              type="button"
              onClick={() => { setBaseVis(value); if (value === 'public') setShared(false) }}
              className={`flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-colors ${
                baseVis === value ? 'border-foreground bg-muted' : 'border-border'
              }`}
            >
              <Icon className="h-5 w-5" />
              <div className="text-center">
                <p className="text-sm font-semibold">{label}</p>
                <p className="text-xs text-muted-foreground leading-snug mt-0.5">{desc}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Case "Partager avec des amis" — uniquement si Privée et qu'on a des amis */}
        {baseVis === 'private' && availableFriends.length > 0 && (
          <button
            type="button"
            onClick={() => { setShared((v) => !v); if (shared) setSelectedIds(new Set()) }}
            className="w-full flex items-center gap-3 p-3 rounded-xl border hover:bg-muted/50 transition-colors text-left"
          >
            <span className={`flex-none flex items-center justify-center h-5 w-5 rounded border-2 transition-colors ${shared ? 'bg-primary border-primary' : 'border-muted-foreground/30'}`}>
              {shared && <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />}
            </span>
            <div>
              <p className="text-sm font-medium">Partager avec des amis</p>
              <p className="text-xs text-muted-foreground">Choisir les amis qui ont accès</p>
            </div>
          </button>
        )}

        {/* Sélecteur d'amis */}
        {baseVis === 'private' && shared && availableFriends.length > 0 && (
          <div className="border rounded-xl overflow-hidden">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 pt-3 pb-2">
              Amis avec accès
            </p>
            <ul className="max-h-48 overflow-y-auto divide-y">
              {availableFriends.map((friend) => {
                const selected = selectedIds.has(friend.id)
                return (
                  <li key={friend.id}>
                    <button
                      type="button"
                      onClick={() => toggleFriend(friend.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors"
                    >
                      {friend.avatar_url ? (
                        <img src={friend.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                      )}
                      <span className="text-sm font-medium flex-1 text-left">
                        {friend.full_name ?? 'Anonyme'}
                      </span>
                      <span className={`flex-none flex items-center justify-center h-5 w-5 rounded border-2 transition-colors ${selected ? 'bg-primary border-primary' : 'border-muted-foreground/30'}`}>
                        {selected && <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Image de couverture</Label>
        <ImagePicker value={coverUrl} onChange={setCoverUrl} />
      </div>

      <div className="flex gap-3 pt-2">
        {initialData && (
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  className="text-destructive border-destructive/30 hover:bg-destructive/5"
                  disabled={isPending}
                />
              }
            >
              Supprimer
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer cette catégorie ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Les recettes de la catégorie seront dissociées mais pas supprimées. Cette action est irréversible.
                </AlertDialogDescription>
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
        <Button type="button" onClick={handleSubmit} disabled={isPending} className="flex-1">
          {initialData ? 'Enregistrer' : 'Créer la catégorie'}
        </Button>
      </div>
    </div>
  )
}
