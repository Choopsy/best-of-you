'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PlusCircle, BookOpen, NotebookPen, Refrigerator, ScanBarcode, Dumbbell, Scale, X } from 'lucide-react'

const ITEMS = [
  { href: '/journal?add=1', Icon: NotebookPen, title: 'Un repas', hint: 'Au journal' },
  { href: '/journal?scan=1', Icon: ScanBarcode, title: 'Scanner', hint: 'Un produit' },
  { href: '/forme?add=seance', Icon: Dumbbell, title: 'Une séance', hint: 'De sport' },
  { href: '/frigo?add=1', Icon: Refrigerator, title: 'Au frigo', hint: 'Avec sa date' },
  { href: '/recipes/new', Icon: BookOpen, title: 'Une recette', hint: 'À cuisiner' },
  { href: '/forme?add=poids', Icon: Scale, title: 'Ma pesée', hint: 'Du jour' },
]

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
        aria-expanded={open}
        className="-mt-7 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_6px_16px_color-mix(in_oklab,var(--primary)_35%,transparent)]"
      >
        <PlusCircle className="h-6 w-6" strokeWidth={2} />
      </button>

      {open && <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setOpen(false)} />}

      <div
        role="dialog"
        aria-label="Ajouter"
        aria-hidden={!open}
        inert={!open}
        className={`fixed left-0 right-0 bottom-0 z-50 bg-card rounded-t-3xl border-t shadow-xl transition-[translate,visibility] duration-300 ease-out ${
          open ? 'translate-y-0 visible' : 'translate-y-full invisible'
        }`}
      >
        <div className="px-4 pt-4 pb-[calc(2rem+env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold text-base">Que veux-tu ajouter ?</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fermer"
              className="flex items-center justify-center h-10 w-10 rounded-full hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {ITEMS.map(({ href, Icon, title, hint }) => (
              <button
                key={href}
                type="button"
                onClick={() => go(href)}
                className="flex flex-col items-center gap-2 rounded-2xl bg-background px-1 py-4 hover:bg-muted transition-colors"
              >
                <div className="flex items-center justify-center h-11 w-11 rounded-full bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-sm leading-tight">{title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
