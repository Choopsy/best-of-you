'use client'

import { Portal } from '@/components/ui/portal'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Share2, Check, User, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { setRecipeShares } from '@/actions/shares'

export interface FriendOption {
  id: string
  full_name: string | null
  avatar_url: string | null
}

export function ShareRecipe({ recipeId, friends, sharedWith }: { recipeId: string; friends: FriendOption[]; sharedWith: string[] }) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set(sharedWith))
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const toggle = (id: string) => setSelected((s) => {
    const n = new Set(s)
    if (n.has(id)) n.delete(id)
    else n.add(id)
    return n
  })

  const save = () => start(async () => {
    const res = await setRecipeShares(recipeId, [...selected])
    if (res.error) setError(res.error)
    else setOpen(false)
  })

  return (
    <>
      <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setOpen(true)} aria-label="Partager avec des amis">
        <Share2 className="h-4 w-4" />
      </Button>
      <Portal>
      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-4 top-14 mx-auto max-w-sm bg-background rounded-2xl shadow-xl overflow-hidden">
            <div className="px-5 pt-5 pb-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Partager avec des amis</h3>
                <button type="button" onClick={() => setOpen(false)} className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted" aria-label="Fermer">
                  <X className="h-4 w-4" />
                </button>
              </div>
              {friends.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Tu n&apos;as pas encore d&apos;amis. <Link href="/friends" className="underline underline-offset-2">En ajouter</Link>
                </p>
              ) : (
                <ul className="space-y-1 max-h-64 overflow-y-auto">
                  {friends.map((f) => {
                    const on = selected.has(f.id)
                    return (
                      <li key={f.id}>
                        <button type="button" onClick={() => toggle(f.id)} className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-muted text-left">
                          {f.avatar_url
                            ? <img src={f.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                            : <span className="h-8 w-8 rounded-full bg-muted flex items-center justify-center"><User className="h-4 w-4 text-muted-foreground" /></span>}
                          <span className="flex-1 text-sm font-medium">{f.full_name ?? 'Sans nom'}</span>
                          <span className={`h-5 w-5 rounded border-2 flex items-center justify-center ${on ? 'bg-primary border-primary' : 'border-muted-foreground/30'}`}>
                            {on && <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
              <p className="text-xs text-muted-foreground">La recette apparaîtra dans « Partagées avec moi » chez tes amis, même si elle est privée.</p>
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
            {friends.length > 0 && (
              <div className="flex gap-3 px-5 pb-5">
                <Button variant="outline" className="flex-1" onClick={() => setOpen(false)} disabled={pending}>Annuler</Button>
                <Button className="flex-1" onClick={save} disabled={pending}>{pending ? 'Enregistrement…' : 'Enregistrer'}</Button>
              </div>
            )}
          </div>
        </div>
      )}
      </Portal>
    </>
  )
}
