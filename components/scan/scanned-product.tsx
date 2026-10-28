'use client'

import { useEffect, useState, useTransition } from 'react'
import { Loader2, Package, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { saveProduct } from '@/actions/products'
import { addFoodToLog } from '@/actions/journal'
import { NUTRIENT_KEYS, NUTRIENT_LABELS, type Nutrients } from '@/lib/nutrition'
import type { Meal } from '@/lib/types'
import { lookupProduct, type ProductLookup } from '@/lib/off'
import { canUseGrams, canUsePortions, checkQuantity, defaultUnit, type PortionInfo, type QtyUnit } from '@/lib/portions'
import { QuantityField, defaultQty, parseQty } from '@/components/journal/quantity-field'

interface Props {
  /** null = créer un aliment à la main, sans code-barres (plat maison, restaurant…) */
  barcode: string | null
  /** Nom proposé quand on crée un aliment (texte déjà tapé dans la recherche) */
  initialName?: string
  date: string
  meal: Meal
  onDone: () => void
  onRescan: () => void
}

const emptyPer100 = (): Record<keyof Nutrients, string> =>
  Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, ''])) as Record<keyof Nutrients, string>

/** Produit scanné : trouvé (Open Food Facts ou déjà enregistré) ou à recopier depuis l'étiquette. */
const fr = (v: number) => v.toLocaleString('fr-FR', { maximumFractionDigits: 1 })

export function ScannedProduct({ barcode, initialName = '', date, meal, onDone, onRescan }: Props) {
  const [lookup, setLookup] = useState<ProductLookup | null>(null)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [per100, setPer100] = useState(emptyPer100)
  const [grams, setGrams] = useState('100')
  const [unit, setUnit] = useState<QtyUnit>('g')
  // Valeurs pour 100 g (étiquette) ou pour 1 portion (fast-food, restaurant)
  const [perPortion, setPerPortion] = useState(false)
  const [portionGrams, setPortionGrams] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    if (!barcode) {
      setLookup({ found: false, barcode: '' }); setEditing(true); setName(initialName)
      return
    }
    setLookup(null)
    lookupProduct(barcode).then((data: ProductLookup) => {
      if (cancelled) return
      setLookup(data)
      if (data.error) return // on propose de réessayer avant la saisie à la main
      if (data.found && data.per100) {
        setName(data.name ?? '')
        setBrand(data.brand ?? '')
        setPer100(Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, String(data.per100![k] ?? '')])) as Record<keyof Nutrients, string>)
        setPerPortion(!!data.perPortion)
        setPortionGrams(data.portionGrams ? String(data.portionGrams) : '')
        const u = defaultUnit({ perPortion: !!data.perPortion, portionGrams: data.portionGrams ?? null })
        setUnit(u); setGrams(defaultQty(u))
        setEditing(!!data.incomplete)
      } else {
        setEditing(true)
      }
    }).catch(() => { if (!cancelled) { setLookup({ found: false, barcode }); setEditing(true) } })
    return () => { cancelled = true }
  }, [barcode, attempt]) // eslint-disable-line react-hooks/exhaustive-deps

  const num = (v: string) => Number(v.replace(',', '.')) || 0
  const kcal100 = num(per100.energy_kcal)
  const portion: PortionInfo = { perPortion, portionGrams: num(portionGrams) > 0 ? num(portionGrams) : null }

  // L'unité de quantité doit rester possible quand on change « pour 100 g / 1 portion » ou le poids
  useEffect(() => {
    if (unit === 'g' && !canUseGrams(portion)) { setUnit('portion'); setGrams('1') }
    else if (unit === 'portion' && !canUsePortions(portion)) { setUnit('g'); setGrams('100') }
  }, [perPortion, portion.portionGrams, unit]) // eslint-disable-line react-hooks/exhaustive-deps
  const choosePerPortion = (v: boolean) => {
    if (v === perPortion) return
    setPerPortion(v)
    const u = defaultUnit({ ...portion, perPortion: v })
    setUnit(u); setGrams(defaultQty(u))
  }

  const submit = () => start(async () => {
    setError(null)
    if (!name.trim()) { setError('Indique le nom du produit.'); return }
    if (!per100.energy_kcal.trim()) { setError(`Indique au moins l'énergie (kcal ${perPortion ? 'pour 1 portion' : 'pour 100 g'}).`); return }
    const amount = parseQty(grams)
    const badQty = checkQuantity(portion, unit, amount)
    if (badQty) { setError(badQty); return }
    let id = lookup?.saved?.id
    // Enregistre (ou met à jour si on a corrigé les valeurs) pour la prochaine fois
    if (!id || editing) {
      const res = await saveProduct({
        barcode: barcode || null, name, brand: brand || null, image_url: lookup?.image_url ?? null,
        source: lookup?.source === 'off' ? 'off' : 'manual',
        per100: Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, num(per100[k])])) as Nutrients,
        perPortion, portionGrams: portion.portionGrams,
      })
      if (res.error || !res.id) { setError(res.error ?? 'Erreur'); return }
      id = res.id
    }
    const res = await addFoodToLog({ date, meal, customId: id, ...(unit === 'portion' ? { portions: amount } : { grams: amount }) })
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

  // Open Food Facts ne répond pas : ce n'est pas un produit inconnu, on peut réessayer
  if (lookup.error && !editing) {
    return (
      <div className="space-y-3">
        <p className="rounded-2xl bg-secondary px-3 py-2.5 text-sm text-secondary-foreground">
          Open Food Facts ne répond pas pour le moment (code {barcode}). Réessaie dans quelques secondes, ou recopie l&apos;étiquette.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => setEditing(true)}>Saisir à la main</Button>
          <Button className="flex-1 gap-1.5" onClick={() => setAttempt((a) => a + 1)}><RotateCcw className="h-4 w-4" /> Réessayer</Button>
        </div>
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
              {Math.round(kcal100)} kcal · P {fr(num(per100.proteins_g))} g · G {fr(num(per100.carbs_g))} g · L {fr(num(per100.fat_g))} g
              {perPortion ? ' pour 1 portion' : ' pour 100 g'}
              {portion.portionGrams ? ` · portion ${fr(portion.portionGrams)} g` : ''}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="rounded-2xl bg-secondary px-3 py-2.5 text-sm text-secondary-foreground">
            {!barcode
              ? 'Recopie les valeurs de l\'étiquette ou du site de la marque, pour 100 g ou pour 1 portion (burger, part de pizza…). L\'aliment sera enregistré : tu le retrouveras ensuite dans la recherche.'
              : lookup.found
              ? 'Certaines valeurs manquent : complète-les avec l\'étiquette (pour 100 g).'
              : lookup.error
                ? 'Recopie l\'étiquette (valeurs pour 100 g) : le produit sera reconnu la prochaine fois.'
                : 'Produit inconnu d\'Open Food Facts. Recopie l\'étiquette une fois (valeurs pour 100 g) : il sera reconnu la prochaine fois.'}
          </p>
          {barcode && <p className="text-xs text-muted-foreground">
            Code lu : <span className="font-bold tabular-nums">{barcode}</span>. Ce n&apos;est pas celui de l&apos;emballage ?{' '}
            <button type="button" onClick={onRescan} className="underline underline-offset-2">Scanner à nouveau</button>
          </p>}
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2 space-y-1">
              <Label htmlFor="pn">Nom</Label>
              <Input id="pn" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Skyr nature" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label htmlFor="pb">Marque (facultatif)</Label>
              <Input id="pb" value={brand} onChange={(e) => setBrand(e.target.value)} />
            </div>
            <div className="col-span-2 flex items-center justify-between gap-2 pt-1">
              <span className="text-sm font-bold">Valeurs pour</span>
              <div role="radiogroup" aria-label="Valeurs pour" className="flex rounded-full bg-muted p-0.5 text-xs font-bold">
                {([false, true] as const).map((v) => (
                  <button key={String(v)} type="button" role="radio" aria-checked={perPortion === v} onClick={() => choosePerPortion(v)}
                    className={`min-h-8 rounded-full px-3 transition-colors ${perPortion === v ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}>
                    {v ? '1 portion' : '100 g'}
                  </button>
                ))}
              </div>
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
            <div className="col-span-2 space-y-1">
              <Label htmlFor="pg" className="text-xs">Poids d&apos;une portion (g), facultatif</Label>
              <Input id="pg" type="number" inputMode="decimal" min={1} max={3000} step="any" value={portionGrams}
                onChange={(e) => setPortionGrams(e.target.value)} className="w-32" />
              <p className="text-xs text-muted-foreground">
                {perPortion
                  ? 'Si tu le connais, tu pourras aussi noter en grammes (une moitié, un reste…).'
                  : 'Ex. 125 pour un pot de yaourt : tu pourras noter « 1 portion » au lieu des grammes.'}
              </p>
            </div>
          </div>
        </div>
      )}

      <QuantityField id="sg" portion={portion} unit={unit} onUnit={setUnit} value={grams} onValue={setGrams}
        kcal={kcal100 > 0 ? kcal100 : null} />

      {lookup.found && !editing && (
        <button type="button" onClick={() => setEditing(true)} className="text-xs text-muted-foreground underline">
          Corriger les valeurs
        </button>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onRescan} disabled={pending}>{barcode ? 'Scanner un autre' : 'Retour'}</Button>
        <Button className="flex-1" onClick={submit} disabled={pending}>{pending ? 'Ajout…' : 'Ajouter'}</Button>
      </div>
      {lookup.source === 'off' && (
        <p className="text-[11px] text-muted-foreground">Données : Open Food Facts (licence ODbL).</p>
      )}
    </div>
  )
}
