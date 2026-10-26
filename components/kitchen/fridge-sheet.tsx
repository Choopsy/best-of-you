'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Pencil, ScanBarcode } from 'lucide-react'
import { BarcodeScanner } from '@/components/scan/barcode-scanner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Portal } from '@/components/ui/portal'
import { IngredientAutocomplete } from '@/components/recipes/ingredient-autocomplete'
import { addFridgeItem, deleteFridgeItem, updateFridgeItem } from '@/actions/fridge'
import { shiftDate } from '@/lib/dates'
import type { FridgeItem } from '@/lib/household'

const UNITS = ['', 'g', 'kg', 'ml', 'cl', 'L', 'pièce', 'tranche', 'sachet', 'boîte', 'pot', 'bouteille']
const QUICK = [
  { label: '+3 j', days: 3 },
  { label: '+1 sem.', days: 7 },
  { label: '+2 sem.', days: 14 },
  { label: '+1 mois', days: 30 },
]

interface Props {
  today: string
  item?: FridgeItem
  /** Afficher le bouton déclencheur en grand (page vide) */
  trigger?: 'button' | 'icon' | 'wide'
  defaultOpen?: boolean
}

export function FridgeSheet({ today, item, trigger = 'button', defaultOpen = false }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(defaultOpen)
  const [name, setName] = useState(item?.name ?? '')
  const [code, setCode] = useState<string | null>(item?.ciqual_code ?? null)
  const [quantity, setQuantity] = useState(item?.quantity != null ? String(item.quantity) : '')
  const [unit, setUnit] = useState(item?.unit ?? '')
  const [expires, setExpires] = useState(item?.expires_on ?? '')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const [scanning, setScanning] = useState(false)
  const [lookup, setLookup] = useState<string | null>(null)

  // Code-barres → nom du produit (Open Food Facts ou produits déjà enregistrés)
  const onDetected = async (barcode: string) => {
    setScanning(false); setError(null); setLookup('Recherche du produit…')
    try {
      const r = await fetch(`/api/products/${barcode}`)
      const p = await r.json()
      if (p.found && p.name) {
        setName(p.brand ? `${p.name} (${p.brand})` : p.name); setCode(null)
        setLookup(null)
      } else {
        setLookup('Produit inconnu : écris son nom à la main.')
      }
    } catch {
      setLookup('Pas de connexion : écris son nom à la main.')
    }
  }

  const reset = () => {
    if (!item) { setName(''); setCode(null); setQuantity(''); setUnit(''); setExpires('') }
    setLookup(null)
    setError(null)
  }
  const close = () => { setOpen(false); reset() }

  const submit = () => start(async () => {
    const q = quantity.trim() ? Number(quantity.replace(',', '.')) : null
    const input = { name, ciqual_code: code, quantity: q, unit: unit || null, expires_on: expires || null }
    const res = item ? await updateFridgeItem(item.id, input) : await addFridgeItem(input)
    if (res.error) { setError(res.error); return }
    close()
    router.refresh()
  })

  const remove = () => start(async () => {
    if (!item) return
    const res = await deleteFridgeItem(item.id)
    if (res.error) { setError(res.error); return }
    setOpen(false)
    router.refresh()
  })

  return (
    <>
      {trigger === 'icon' ? (
        <button type="button" onClick={() => setOpen(true)} aria-label={`Modifier ${item?.name ?? ''}`}
          className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl text-muted-foreground hover:bg-muted">
          <Pencil className="h-4 w-4" />
        </button>
      ) : trigger === 'wide' ? (
        <Button className="w-full h-12 rounded-2xl gap-2" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Ajouter un aliment
        </Button>
      ) : (
        <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Ajouter
        </Button>
      )}

      {scanning && <BarcodeScanner onDetected={onDetected} onClose={() => setScanning(false)} />}

      {open && (
        <Portal>
          <div className="fixed inset-0 z-50 flex items-end sm:items-start sm:pt-20 justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={close} />
            <div role="dialog" aria-modal="true" aria-label={item ? 'Modifier un aliment' : 'Ajouter au frigo'}
              className="relative w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-3xl shadow-xl max-h-[90svh] overflow-y-auto">
              <div className="px-5 pt-5 pb-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg">{item ? 'Modifier' : 'Ajouter au frigo'}</h3>
                  <button type="button" onClick={close} className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-muted" aria-label="Fermer">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-2">
                  <Label>Aliment</Label>
                  <IngredientAutocomplete
                    value={name}
                    ciqualCode={code}
                    onChange={(n, c) => { setName(n); setCode(c) }}
                    placeholder="Ex : lait, poulet, courgettes…"
                    showStatus={false}
                    autoFocus={!item}
                  />
                  {!item && (
                    <button type="button" onClick={() => setScanning(true)}
                      className="flex min-h-10 items-center gap-2 text-sm font-bold text-primary">
                      <ScanBarcode className="h-4 w-4" /> Scanner le code-barres
                    </button>
                  )}
                  <p className="text-xs text-muted-foreground">{lookup ?? 'Choisir dans la liste aide à le retrouver dans tes recettes.'}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="fq">Quantité</Label>
                    <Input id="fq" type="number" inputMode="decimal" min={0} step="any" value={quantity}
                      onChange={(e) => setQuantity(e.target.value)} placeholder="Facultatif" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fu">Unité</Label>
                    <select id="fu" value={unit} onChange={(e) => setUnit(e.target.value)}
                      className="h-9 w-full rounded-lg border border-input bg-transparent px-2 text-base md:text-sm">
                      {UNITS.map((u) => <option key={u} value={u}>{u || '—'}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fe">À consommer avant le</Label>
                  <Input id="fe" type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK.map((q) => (
                      <button key={q.label} type="button" onClick={() => setExpires(shiftDate(today, q.days))}
                        className="rounded-full bg-muted px-3 py-1.5 text-xs font-bold hover:bg-secondary">
                        {q.label}
                      </button>
                    ))}
                    {expires && (
                      <button type="button" onClick={() => setExpires('')} className="rounded-full px-3 py-1.5 text-xs text-muted-foreground underline">
                        Sans date
                      </button>
                    )}
                  </div>
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>

              <div className="flex gap-3 px-5 pb-6">
                {item ? (
                  <Button variant="outline" className="flex-1" onClick={remove} disabled={pending}>Consommé / jeté</Button>
                ) : (
                  <Button variant="outline" className="flex-1" onClick={close} disabled={pending}>Annuler</Button>
                )}
                <Button className="flex-1" onClick={submit} disabled={pending || !name.trim()}>
                  {pending ? 'Enregistrement…' : item ? 'Enregistrer' : 'Ajouter'}
                </Button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  )
}
