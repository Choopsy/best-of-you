'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Plus, X, Apple, BookOpen, Search, ChefHat, History, Check, ScanBarcode } from 'lucide-react'
import { Portal } from '@/components/ui/portal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { IngredientAutocomplete } from '@/components/recipes/ingredient-autocomplete'
import { BarcodeScanner } from '@/components/scan/barcode-scanner'
import { ScannedProduct } from '@/components/scan/scanned-product'
import { addAgain, addFoodToLog, addRecipeToLog } from '@/actions/journal'
import { MEALS, MEAL_LABELS, type FoodSuggestion, type Meal, type PickableRecipe } from '@/lib/types'
import type { RecentEntry } from '@/lib/journal'

type Tab = 'recent' | 'food' | 'recipe'

interface Props {
  date: string
  meal?: Meal
  recipes: PickableRecipe[]
  /** Entrées récentes pour « Ajouter à nouveau » */
  recents?: RecentEntry[]
  defaultOpen?: boolean
  /** Ouvre directement le scanner */
  defaultScan?: boolean
  /** Code-barres déjà lu (scanner ouvert depuis le menu « + ») */
  defaultBarcode?: string
  /** Recette pré-sélectionnée (bouton « Ajouter au journal » d'une recette) */
  recipe?: PickableRecipe
  trigger?: 'button' | 'icon' | 'wide'
}

/** Clé stable d'une entrée récente : après un ajout, la liste se rafraîchit et l'entrée change d'id. */
const recentKey = (r: RecentEntry) => `${r.label}|${r.detail}`

function defaultMealForNow(): Meal {
  const h = new Date().getHours()
  if (h < 10) return 'breakfast'
  if (h < 15) return 'lunch'
  if (h < 18) return 'snack'
  return 'dinner'
}

export function AddEntry({ date, meal, recipes, recents = [], defaultOpen = false, defaultScan = false, defaultBarcode, recipe, trigger = 'button' }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const firstTab: Tab = recipe ? 'recipe' : recents.length ? 'recent' : 'food'
  const [open, setOpen] = useState(defaultOpen || defaultScan || !!defaultBarcode)
  const [tab, setTab] = useState<Tab>(defaultScan || defaultBarcode ? 'food' : firstTab)
  const [selectedMeal, setSelectedMeal] = useState<Meal>(meal ?? 'lunch')
  // Repas par défaut selon l'heure locale (calculé côté navigateur)
  useEffect(() => { if (!meal) setSelectedMeal(defaultMealForNow()) }, [meal])
  const [day, setDay] = useState(date)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  // Récents : ajoutés en un geste, la fenêtre reste ouverte pour en ajouter d'autres
  const [added, setAdded] = useState<Set<string>>(new Set())

  // Aliment
  const [foodText, setFoodText] = useState('')
  const [food, setFood] = useState<FoodSuggestion | null>(null)
  const [grams, setGrams] = useState('100')
  const [scanning, setScanning] = useState(defaultScan)
  const [barcode, setBarcode] = useState<string | null>(defaultBarcode ?? null)

  // Recette
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<PickableRecipe | null>(recipe ?? null)
  const [servings, setServings] = useState('1')

  const reset = () => {
    setFoodText(''); setFood(null); setGrams('100'); setBarcode(null); setScanning(false)
    setQuery(''); setPicked(recipe ?? null); setServings('1'); setError(null); setAdded(new Set())
    setTab(firstTab)
  }
  const close = () => {
    const changed = added.size > 0
    setOpen(false); reset()
    // Ouverte depuis un lien (?add=1, ?barcode=…) : on nettoie l'adresse pour ne pas la rouvrir
    if (params.has('add') || params.has('scan') || params.has('barcode')) {
      const q = new URLSearchParams(params)
      q.delete('add'); q.delete('scan'); q.delete('barcode')
      router.replace(q.size ? `${pathname}?${q}` : pathname, { scroll: false })
    } else if (changed) router.refresh()
  }

  const onDetected = useCallback((code: string) => { setScanning(false); setBarcode(code) }, [])
  const onScanned = () => { close(); router.refresh() }

  const addRecent = (r: RecentEntry) => start(async () => {
    setError(null)
    const res = await addAgain({ logId: r.logId, date: day, meal: selectedMeal })
    if (res.error) { setError(res.error); return }
    setAdded((s) => new Set(s).add(recentKey(r)))
  })

  const submit = () => {
    setError(null)
    start(async () => {
      const g = Number(grams.replace(',', '.'))
      const res = tab === 'food'
        ? food
          ? await addFoodToLog(food.kind === 'custom'
            ? { date: day, meal: selectedMeal, customId: food.code, grams: g }
            : { date: day, meal: selectedMeal, code: food.code, grams: g })
          : { error: 'Choisis un aliment dans la liste, ou scanne-le.' }
        : picked
          ? await addRecipeToLog({ date: day, meal: selectedMeal, recipeId: picked.id, servings: Number(servings.replace(',', '.')) })
          : { error: 'Choisis une recette.' }
      if (res.error) { setError(res.error); return }
      close()
      router.refresh()
    })
  }

  const filtered = recipes.filter((r) => r.title.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 30)
  const kcalPreview = food?.kcal != null ? Math.round((food.kcal * Number(grams.replace(',', '.') || 0)) / 100) : null
  const tabs: { key: Tab; label: string; Icon: typeof Apple }[] = [
    ...(recents.length ? [{ key: 'recent' as const, label: 'Récents', Icon: History }] : []),
    { key: 'food', label: 'Aliment', Icon: Apple },
    { key: 'recipe', label: 'Recette', Icon: BookOpen },
  ]
  const showFooter = !(tab === 'recent') && !(tab === 'food' && barcode)

  return (
    <>
      {trigger === 'icon' ? (
        <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setOpen(true)} aria-label={`Ajouter au ${MEAL_LABELS[selectedMeal]}`}>
          <Plus className="h-5 w-5" />
        </Button>
      ) : trigger === 'wide' ? (
        <Button variant="outline" className="w-full gap-2" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Ajouter au journal
        </Button>
      ) : (
        <Button className="gap-1.5" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Ajouter
        </Button>
      )}

      {scanning && <BarcodeScanner onDetected={onDetected} onClose={() => setScanning(false)} />}

      <Portal>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-start sm:pt-20 justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={close} />
          <div role="dialog" aria-modal="true" aria-label="Ajouter au journal"
            className="relative w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-3xl shadow-xl max-h-[90svh] overflow-y-auto">
            <div className="px-5 pt-5 pb-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg">Ajouter au journal</h3>
                <button type="button" onClick={close} className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-muted" aria-label="Fermer">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-2">
                <Label>Repas</Label>
                <div className="grid grid-cols-4 gap-1.5">
                  {MEALS.map((m) => (
                    <button key={m} type="button" onClick={() => setSelectedMeal(m)} aria-pressed={selectedMeal === m}
                      className={`min-h-10 rounded-xl border px-1 py-1.5 text-[11px] font-bold transition-colors ${
                        selectedMeal === m ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'hover:bg-muted'}`}>
                      {MEAL_LABELS[m]}
                    </button>
                  ))}
                </div>
              </div>

              {recipe && (
                <div className="space-y-2">
                  <Label htmlFor="entry-date">Jour</Label>
                  <Input id="entry-date" type="date" value={day} onChange={(e) => setDay(e.target.value)} />
                </div>
              )}

              {!recipe && (
                <div role="tablist" className={`grid gap-1 rounded-2xl bg-muted p-1 ${tabs.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  {tabs.map(({ key, label, Icon }) => (
                    <button key={key} type="button" role="tab" aria-selected={tab === key}
                      onClick={() => { setTab(key); setError(null) }}
                      className={`flex min-h-10 items-center justify-center gap-1.5 rounded-xl text-sm font-bold transition-colors ${
                        tab === key ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}>
                      <Icon className="h-4 w-4" /> {label}
                    </button>
                  ))}
                </div>
              )}

              {tab === 'recent' && (
                <ul className="space-y-1.5">
                  {recents.map((r) => {
                    const done = added.has(recentKey(r))
                    return (
                      <li key={recentKey(r)}>
                        <button type="button" disabled={pending || done} onClick={() => addRecent(r)}
                          className="flex w-full min-h-12 items-center gap-3 rounded-2xl bg-background px-3 py-2 text-left">
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-bold">{r.label}</span>
                            <span className="block text-xs text-muted-foreground">{r.detail} · {r.kcal} kcal</span>
                          </span>
                          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${done ? 'bg-sage text-primary-foreground' : 'bg-primary text-primary-foreground'}`}
                            aria-label={done ? 'Ajouté' : 'Ajouter'}>
                            {done ? <Check className="h-4 w-4" strokeWidth={3} /> : <Plus className="h-4 w-4" />}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                  <p className="pt-1 text-xs text-muted-foreground">Un geste pour ajouter, avec la même quantité que la dernière fois.</p>
                </ul>
              )}

              {tab === 'food' && (barcode ? (
                <ScannedProduct barcode={barcode} date={day} meal={selectedMeal} onDone={onScanned}
                  onRescan={() => { setBarcode(null); setScanning(true) }} />
              ) : (
                <div className="space-y-3">
                  <Button type="button" variant="outline" className="w-full h-12 rounded-2xl gap-2" onClick={() => setScanning(true)}>
                    <ScanBarcode className="h-5 w-5" /> Scanner un code-barres
                  </Button>
                  <div className="space-y-2">
                    <Label>Ou cherche un aliment</Label>
                    <IngredientAutocomplete
                      value={foodText}
                      ciqualCode={food?.code ?? null}
                      onChange={(name, code) => { setFoodText(name); if (!code) setFood(null) }}
                      onPick={setFood}
                      placeholder="Ex : yaourt nature, pomme, riz cuit…"
                      includeProducts
                    />
                  </div>
                  <div className="flex items-end gap-3">
                    <div className="space-y-2 w-32">
                      <Label htmlFor="grams">Quantité (g)</Label>
                      <Input id="grams" type="number" inputMode="decimal" min={1} max={5000} value={grams} onChange={(e) => setGrams(e.target.value)} />
                    </div>
                    {kcalPreview != null && (
                      <p className="pb-2 text-sm text-muted-foreground tabular-nums">≈ {kcalPreview.toLocaleString('fr-FR')} kcal</p>
                    )}
                  </div>
                </div>
              ))}

              {tab === 'recipe' && (
                <div className="space-y-3">
                  {picked ? (
                    <div className="flex items-center gap-3 rounded-2xl border p-2">
                      <div className="h-12 w-12 rounded-xl bg-muted overflow-hidden flex items-center justify-center shrink-0">
                        {picked.cover_image_url
                          ? <img src={picked.cover_image_url} alt="" className="h-full w-full object-cover" />
                          : <ChefHat className="h-5 w-5 text-muted-foreground/40" />}
                      </div>
                      <p className="flex-1 text-sm font-medium line-clamp-2">{picked.title}</p>
                      {!recipe && <Button variant="ghost" size="sm" onClick={() => setPicked(null)}>Changer</Button>}
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Chercher dans mes recettes" className="pl-9" />
                      </div>
                      <ul className="max-h-56 overflow-y-auto -mx-1 px-1 space-y-1">
                        {filtered.length === 0 && <li className="text-sm text-muted-foreground text-center py-4">Aucune recette.</li>}
                        {filtered.map((r) => (
                          <li key={r.id}>
                            <button type="button" onClick={() => setPicked(r)} className="w-full min-h-11 text-left px-3 py-2 rounded-xl hover:bg-muted text-sm">
                              {r.title}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                  <div className="space-y-2 w-32">
                    <Label htmlFor="servings">Portions</Label>
                    <Input id="servings" type="number" inputMode="decimal" step="0.5" min={0.5} max={20} value={servings} onChange={(e) => setServings(e.target.value)} />
                  </div>
                </div>
              )}

              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>

            {showFooter ? (
              <div className="flex gap-3 px-5 pb-6">
                <Button variant="outline" className="flex-1" onClick={close} disabled={pending}>Annuler</Button>
                <Button className="flex-1" onClick={submit} disabled={pending}>{pending ? 'Ajout…' : 'Ajouter'}</Button>
              </div>
            ) : tab === 'recent' ? (
              <div className="px-5 pb-6">
                <Button variant="outline" className="w-full" onClick={close}>{added.size ? 'Terminé' : 'Fermer'}</Button>
              </div>
            ) : <div className="pb-4" />}
          </div>
        </div>
      )}
      </Portal>
    </>
  )
}
