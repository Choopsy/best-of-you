'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PlusCircle, BookOpen, FolderPlus, NotebookPen, Refrigerator, X } from 'lucide-react'

export function NewItemSheet() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const go = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  return (
    <>
      {/* Bouton déclencheur : rond terracotta en relief */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ajouter"
        className="-mt-7 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_6px_16px_color-mix(in_oklab,var(--primary)_35%,transparent)]"
      >
        <PlusCircle className="h-6 w-6" strokeWidth={2} />
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
        aria-hidden={!open}
        inert={!open}
        className={`fixed left-0 right-0 bottom-0 z-50 bg-card rounded-t-3xl border-t shadow-xl transition-[translate,visibility] duration-300 ease-out ${
          open ? 'translate-y-0 visible' : 'translate-y-full invisible'
        }`}
      >
        <div className="px-4 pt-4 pb-8">
          <div className="flex items-center justify-between mb-5">
            <p className="font-semibold text-base">Que veux-tu ajouter ?</p>
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
              onClick={() => go('/journal?add=1')}
              className="flex flex-col items-center gap-3 rounded-2xl bg-background px-2 py-5 hover:bg-muted transition-colors"
            >
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10">
                <NotebookPen className="h-6 w-6 text-primary" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-sm">Un repas</p>
                <p className="text-xs text-muted-foreground mt-0.5">Dans le journal</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => go('/recipes/new')}
              className="flex flex-col items-center gap-3 rounded-2xl bg-background px-2 py-5 hover:bg-muted transition-colors"
            >
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-sm">Une recette</p>
                <p className="text-xs text-muted-foreground mt-0.5">À cuisiner</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => go('/frigo?add=1')}
              className="flex flex-col items-center gap-3 rounded-2xl bg-background px-2 py-5 hover:bg-muted transition-colors"
            >
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10">
                <Refrigerator className="h-6 w-6 text-primary" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-sm">Au frigo</p>
                <p className="text-xs text-muted-foreground mt-0.5">Avec sa date</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => go('/collections/new')}
              className="flex flex-col items-center gap-3 rounded-2xl bg-background px-2 py-5 hover:bg-muted transition-colors"
            >
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10">
                <FolderPlus className="h-6 w-6 text-primary" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-sm">Une collection</p>
                <p className="text-xs text-muted-foreground mt-0.5">Organiser tes recettes</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
