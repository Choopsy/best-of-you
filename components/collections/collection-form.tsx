'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ImagePicker } from '@/components/recipes/image-picker'
import { deleteCollection, saveCollection } from '@/actions/collections'
import type { Collection } from '@/lib/types'

export function CollectionForm({ collection }: { collection?: Collection }) {
  const [name, setName] = useState(collection?.name ?? '')
  const [cover, setCover] = useState(collection?.cover_image_url ?? '')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const fd = new FormData()
    fd.set('name', name)
    fd.set('cover_image_url', cover)
    start(async () => {
      const res = await saveCollection(collection?.id ?? null, fd)
      if (res?.error) setError(res.error)
    })
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="space-y-2">
        <Label htmlFor="name">Nom</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Repas rapides de la semaine" autoFocus />
      </div>
      <div className="space-y-2">
        <Label>Image (facultatif)</Label>
        <ImagePicker value={cover} onChange={setCover} compact />
      </div>
      <div className="flex gap-3">
        {collection && (
          <Button
            type="button"
            variant="outline"
            className="text-destructive border-destructive/30 hover:bg-destructive/5"
            disabled={pending}
            onClick={() => {
              if (window.confirm('Supprimer cette collection ? Les recettes, elles, ne sont pas supprimées.')) {
                start(async () => { const r = await deleteCollection(collection.id); if (r?.error) setError(r.error) })
              }
            }}
          >
            Supprimer
          </Button>
        )}
        <Button type="submit" className="flex-1" disabled={pending}>
          {pending ? 'Enregistrement…' : collection ? 'Enregistrer' : 'Créer la collection'}
        </Button>
      </div>
    </form>
  )
}
