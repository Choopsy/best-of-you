'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PlusCircle, BookOpen, FolderPlus, X } from 'lucide-react'

export function NewItemSheet() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const go = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  return (
    <>
      {/* Bouton déclencheur */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex flex-col items-center gap-0.5 py-2 px-3"
      >
        <span className="flex items-center justify-center h-9 w-9 rounded-full bg-primary/90 transition-colors">
          <PlusCircle className="h-5 w-5 text-primary-foreground" strokeWidth={2} />
        </span>
        <span className="text-[10px] font-medium text-muted-foreground">Nouveau</span>
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sheet */}
      <div
        className={`fixed left-0 right-0 bottom-0 z-50 bg-background rounded-t-2xl border-t shadow-xl transition-transform duration-300 ease-out ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="px-4 pt-4 pb-8">
          <div className="flex items-center justify-between mb-5">
            <p className="font-semibold text-base">Que veux-tu créer ?</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center h-8 w-8 rounded-full hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => go('/recipes/new')}
              className="flex flex-col items-center gap-3 rounded-2xl border bg-muted/40 px-4 py-5 hover:bg-muted transition-colors"
            >
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-sm">Nouvelle recette</p>
                <p className="text-xs text-muted-foreground mt-0.5">Ajouter une recette</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => go('/categories/new')}
              className="flex flex-col items-center gap-3 rounded-2xl border bg-muted/40 px-4 py-5 hover:bg-muted transition-colors"
            >
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10">
                <FolderPlus className="h-6 w-6 text-primary" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-sm">Nouvelle catégorie</p>
                <p className="text-xs text-muted-foreground mt-0.5">Organiser tes recettes</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
