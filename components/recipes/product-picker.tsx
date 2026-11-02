'use client'

import { useState } from 'react'
import { ScanBarcode, X } from 'lucide-react'
import { Portal } from '@/components/ui/portal'
import { BarcodeScanner } from '@/components/scan/barcode-scanner'
import { ScannedProduct, type PickedProduct } from '@/components/scan/scanned-product'

/**
 * Ajouter un produit du commerce comme ingrédient : on le scanne (ou on le crée à la
 * main), il est enregistré pour le foyer, puis renvoyé au formulaire de recette.
 */
export function ProductPicker({ onPicked, label = 'Scanner un produit' }: { onPicked: (p: PickedProduct) => void; label?: string }) {
  const [scanning, setScanning] = useState(false)
  // undefined = fermé, null = création à la main, texte = code lu
  const [barcode, setBarcode] = useState<string | null | undefined>(undefined)

  const close = () => { setScanning(false); setBarcode(undefined) }
  const picked = (p: PickedProduct) => { close(); onPicked(p) }

  return (
    <>
      <button type="button" onClick={() => setScanning(true)}
        className="inline-flex h-7 items-center gap-1 rounded-md px-1 text-xs text-muted-foreground hover:text-foreground">
        <ScanBarcode className="h-3.5 w-3.5" /> {label}
      </button>

      {scanning && (
        <BarcodeScanner onClose={() => setScanning(false)}
          onDetected={(code) => { setScanning(false); setBarcode(code) }} />
      )}

      <Portal>
        {barcode !== undefined && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-start sm:pt-20 justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={close} />
            <div role="dialog" aria-modal="true" aria-label="Produit pour la recette"
              className="relative w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-3xl shadow-float max-h-[90svh] overflow-y-auto">
              <div className="px-5 pt-5 pb-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg">Produit pour la recette</h3>
                  <button type="button" onClick={close} className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-muted" aria-label="Fermer">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <ScannedProduct barcode={barcode} onDone={close} onPicked={picked}
                  onRescan={() => { setBarcode(undefined); setScanning(true) }} />
                <p className="text-xs text-muted-foreground">
                  Le produit est enregistré pour ton foyer : tu le retrouveras dans la recherche des ingrédients et du journal.
                </p>
              </div>
            </div>
          </div>
        )}
      </Portal>
    </>
  )
}

/** Ouvre directement la création d'un produit à la main (sans code-barres). */
export function ProductCreator({ onPicked, initialName = '' }: { onPicked: (p: PickedProduct) => void; initialName?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className="inline-flex h-7 items-center rounded-md px-1 text-xs text-muted-foreground hover:text-foreground">
        Créer un produit
      </button>
      <Portal>
        {open && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-start sm:pt-20 justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
            <div role="dialog" aria-modal="true" aria-label="Créer un produit"
              className="relative w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-3xl shadow-float max-h-[90svh] overflow-y-auto">
              <div className="px-5 pt-5 pb-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg">Créer un produit</h3>
                  <button type="button" onClick={() => setOpen(false)} className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-muted" aria-label="Fermer">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <ScannedProduct barcode={null} initialName={initialName} onDone={() => setOpen(false)}
                  onPicked={(p) => { setOpen(false); onPicked(p) }} onRescan={() => setOpen(false)} />
              </div>
            </div>
          </div>
        )}
      </Portal>
    </>
  )
}
