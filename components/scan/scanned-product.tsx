'use client'

import { useEffect, useState, useTransition } from 'react'
import { Loader2, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { saveProduct } from '@/actions/products'
import { addFoodToLog } from '@/actions/journal'
import { NUTRIENT_KEYS, NUTRIENT_LABELS, type Nutrients } from '@/lib/nutrition'
import type { Meal } from '@/lib/types'
import type { ProductLookup } from '@/app/api/products/[barcode]/route'

interface Props {
  barcode: string
  date: string
  meal: Meal
  onDone: () => void
  onRescan: () => void
}

const emptyPer100 = (): Record<keyof Nutrients, string> =>
  Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, ''])) as Record<keyof Nutrients, string>

/** Produit scanné : trouvé (Open Food Facts ou déjà enregistré) ou à recopier depuis l'étiquette. */
const fr = (v: number) => v.toLocaleString('fr-FR', { maximumFractionDigits: 1 })

export function ScannedProduct({ barcode, date, meal, onDone, onRescan }: Props) {
  const [lookup, setLookup] = useState<ProductLookup | null>(null)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [per100, setPer100] = useState(emptyPer100)
  const [grams, setGrams] = useState('100')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  useEffect(() => {
    let cancelled = false
    fetch(`/api/products/${barcode}`).then((r) => r.json()).then((data: ProductLookup) => {
      if (cancelled) return
      setLookup(data)
      if (data.found && data.per100) {
        setName(data.name ?? '')
        setBrand(data.brand ?? '')
        setPer100(Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, String(data.per100![k] ?? '')])) as Record<keyof Nutrients, string>)
        setEditing(!!data.incomplete)
      } else {
        setEditing(true)
      }
    }).catch(() => { if (!cancelled) { setLookup({ found: false, barcode }); setEditing(true) } })
    return () => { cancelled = true }
  }, [barcode])

  const num = (v: string) => Number(v.replace(',', '.')) || 0
  const kcal100 = num(per100.energy_kcal)
  const g = num(grams)

  const submit = () => start(async () => {
    setError(null)
    if (!name.trim()) { setError('Indique le nom du produit.'); return }
    if (!per100.energy_kcal.trim()) { setError('Indique au moins l\'énergie (kcal pour 100 g).'); return }
    if (!(g > 0)) { setError('Indique la quantité mangée.'); return }
    let id = lookup?.saved?.id
    // Enregistre (ou met à jour si on a corrigé les valeurs) pour la prochaine fois
    if (!id || editing) {
      const res = await saveProduct({
        barcode, name, brand: brand || null, image_url: lookup?.image_url ?? null,
        source: lookup?.source === 'off' ? 'off' : 'manual',
        per100: Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, num(per100[k])])) as Nutrients,
      })
      if (res.error || !res.id) { setError(res.error ?? 'Erreur'); return }
      id = res.id
    }
    const res = await addFoodToLog({ date, meal, grams: g, customId: id })
    if (res.error) { setError(res.error); return }
    onDone()
  })

  if (!lookup) {
    return (
      <div className="flex items-center gap-2 py-6 justify-center text-sm text-muted-foreground" aria-live="polite">
        <Loader2 className="h-4 w-4 animate-spin" /> Recherche du produit {barcode}…
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {lookup.found && !editing ? (
        <div className="flex items-center gap-3 rounded-2xl bg-muted p-3">
          {lookup.image_url
            ? <img src={lookup.image_url} alt="" className="h-14 w-14 rounded-xl object-contain bg-card" />
            : <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-card"><Package className="h-6 w-6 text-muted-foreground/50" /></span>}
          <div className="min-w-0 flex-1">
            <p className="font-bold leading-tight">{name}</p>
            {brand && <p className="text-xs text-muted-foreground">{brand}</p>}
            <p className="text-xs text-muted-foreground mt-0.5">
              {Math.round(kcal100)} kcal · P {fr(num(per100.proteins_g))} g · G {fr(num(per100.carbs_g))} g · L {fr(num(per100.fat_g))} g pour 100 g
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="rounded-2xl bg-secondary px-3 py-2.5 text-sm text-secondary-foreground">
            {lookup.found
              ? 'Certaines valeurs manquent : complète-les avec l\'étiquette (pour 100 g).'
              : 'Produit inconnu. Recopie l\'étiquette une fois (valeurs pour 100 g) : il sera reconnu la prochaine fois.'}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2 space-y-1">
              <Label htmlFor="pn">Nom</Label>
              <Input id="pn" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Skyr nature" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label htmlFor="pb">Marque (facultatif)</Label>
              <Input id="pb" value={brand} onChange={(e) => setBrand(e.target.value)} />
            </div>
            {NUTRIENT_KEYS.map((k) => (
              <div key={k} className="space-y-1">
                <Label htmlFor={`n-${k}`} className="text-xs">
                  {NUTRIENT_LABELS[k].label} ({NUTRIENT_LABELS[k].unit}){k === 'energy_kcal' ? ' *' : ''}
                </Label>
                <Input id={`n-${k}`} type="number" inputMode="decimal" min={0} step="any" value={per100[k]}
                  onChange={(e) => setPer100((p) => ({ ...p, [k]: e.target.value }))} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-end gap-3">
        <div className="space-y-2 w-32">
          <Label htmlFor="sg">Quantité (g)</Label>
          <Input id="sg" type="number" inputMode="decimal" min={1} value={grams} onChange={(e) => setGrams(e.target.value)} />
        </div>
        {kcal100 > 0 && g > 0 && <p className="pb-2 text-sm text-muted-foreground tabular-nums">≈ {Math.round(kcal100 * g / 100)} kcal</p>}
      </div>

      {lookup.found && !editing && (
        <button type="button" onClick={() => setEditing(true)} className="text-xs text-muted-foreground underline">
          Corriger les valeurs
        </button>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onRescan} disabled={pending}>Scanner un autre</Button>
        <Button className="flex-1" onClick={submit} disabled={pending}>{pending ? 'Ajout…' : 'Ajouter'}</Button>
      </div>
      {lookup.source === 'off' && (
        <p className="text-[11px] text-muted-foreground">Données : Open Food Facts (licence ODbL).</p>
      )}
    </div>
  )
}
