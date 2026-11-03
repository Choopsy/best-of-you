'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BarcodeScanner } from '@/components/scan/barcode-scanner'
import { Plus, BookOpen, Camera, NotebookPen, Refrigerator, ScanBarcode, Dumbbell, Scale, Search, X } from 'lucide-react'

// Teinte de la pastille : terracotta pour manger, olive pour bouger, ocre pour cuisiner
const ITEMS = [
  { href: '/journal?add=1', Icon: NotebookPen, title: 'Un repas', hint: 'Au journal', tint: 'bg-terracotta/15 text-primary' },
  { href: 'scan', Icon: ScanBarcode, title: 'Scanner', hint: 'Un produit', tint: 'bg-terracotta/15 text-primary' },
  { href: '/forme?add=seance', Icon: Dumbbell, title: 'Une séance', hint: 'De sport', tint: 'bg-sage/15 text-sage' },
  { href: '/frigo?add=1', Icon: Refrigerator, title: 'Au frigo', hint: 'Avec sa date', tint: 'bg-honey/15 text-foreground' },
  { href: '/recipes/new', Icon: BookOpen, title: 'Une recette', hint: 'À cuisiner', tint: 'bg-honey/15 text-foreground' },
  { href: '/forme?add=poids', Icon: Scale, title: 'Ma pesée', hint: 'Du jour', tint: 'bg-sage/15 text-sage' },
]

// Réservée aux comptes activés ; septième case, donc sur toute la largeur
const PHOTO_ITEM = { href: '/journal?photo=1', Icon: Camera, title: 'Photo du repas', hint: 'Les aliments reconnus sur ta photo', tint: 'bg-terracotta/15 text-primary', wide: true }

export function NewItemSheet({ photoMeal = false }: { photoMeal?: boolean }) {
  const [open, setOpen] = useState(false)
  const [scanning, setScanning] = useState(false)
  const router = useRouter()

  const go = (href: string) => {
    setOpen(false)
    // Le scanner s'ouvre sur place : la caméra démarre sur le geste de l'utilisateur
    // (après un changement de page, certains téléphones bloquent la vidéo)
    if (href === 'scan') setScanning(true)
    else router.push(href)
  }

  return (
    <>
      {/* Bouton déclencheur : rond terracotta en relief (icône blanche : contraste suffisant pour un pictogramme) */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ajouter"
        aria-expanded={open}
        className="-mt-8 flex h-14 w-14 items-center justify-center rounded-full bg-terracotta text-white shadow-[0_10px_24px_-6px_color-mix(in_oklab,var(--terracotta)_55%,transparent)]"
      >
        <Plus className="h-7 w-7" strokeWidth={2.4} />
      </button>

      {scanning && (
        <BarcodeScanner
          onDetected={(code) => { setScanning(false); router.push(`/journal?barcode=${code}`) }}
          onClose={() => setScanning(false)}
        />
      )}

      {open && <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setOpen(false)} />}

      <div
        role="dialog"
        aria-label="Ajouter"
        aria-hidden={!open}
        inert={!open}
        className={`fixed left-0 right-0 bottom-0 z-50 bg-card rounded-t-3xl shadow-float transition-[translate,visibility] duration-300 ease-out ${
          open ? 'translate-y-0 visible' : 'translate-y-full invisible'
        }`}
      >
        <div className="px-5 pt-3 pb-[calc(2rem+env(safe-area-inset-bottom))]">
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-border" aria-hidden="true" />
          <div className="flex items-center justify-between mb-4">
            <p className="font-heading text-xl font-semibold">Que veux-tu ajouter ?</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fermer"
              className="flex items-center justify-center h-11 w-11 rounded-full bg-muted hover:bg-secondary transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[...ITEMS, ...(photoMeal ? [PHOTO_ITEM] : [])].map(({ href, Icon, title, hint, tint, ...rest }) => (
              <button
                key={href}
                type="button"
                onClick={() => go(href)}
                className={`flex items-center gap-2.5 rounded-3xl bg-muted px-3 py-3.5 text-left hover:bg-secondary transition-colors ${'wide' in rest ? 'col-span-2' : ''}`}
              >
                <div className={`flex items-center justify-center h-10 w-10 shrink-0 rounded-full ${tint}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-heading font-semibold text-[15px] leading-tight">{title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
                </div>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => go('/journal?add=1')}
            className="mt-4 flex h-12 w-full items-center gap-3 rounded-full bg-secondary px-5 text-sm font-semibold text-muted-foreground"
          >
            <Search className="h-4 w-4" aria-hidden="true" /> Chercher un aliment
          </button>
        </div>
      </div>
    </>
  )
}
