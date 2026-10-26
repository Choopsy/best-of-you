'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Apple, BookOpen, Search, ChefHat } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { IngredientAutocomplete } from '@/components/recipes/ingredient-autocomplete'
import { addFoodToLog, addRecipeToLog } from '@/actions/journal'
import { MEALS, MEAL_LABELS, type FoodSuggestion, type Meal, type PickableRecipe } from '@/lib/types'


interface Props {
  date: string
  meal?: Meal
  recipes: PickableRecipe[]
  defaultOpen?: boolean
  /** Recette pré-sélectionnée (bouton « Ajouter au journal » d'une recette) */
  recipe?: PickableRecipe
  trigger?: 'button' | 'icon' | 'wide'
}

function defaultMealForNow(): Meal {
  const h = new Date().getHours()
  if (h < 10) return 'breakfast'
  if (h < 15) return 'lunch'
  if (h < 18) return 'snack'
  return 'dinner'
}

export function AddEntry({ date, meal, recipes, defaultOpen = false, recipe, trigger = 'button' }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(defaultOpen)
  const [tab, setTab] = useState<'food' | 'recipe'>(recipe ? 'recipe' : 'food')
  const [selectedMeal, setSelectedMeal] = useState<Meal>(meal ?? 'lunch')
  // Repas par défaut selon l'heure locale (calculé côté navigateur)
  useEffect(() => { if (!meal) setSelectedMeal(defaultMealForNow()) }, [meal])
  const [day, setDay] = useState(date)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  // Aliment
  const [foodText, setFoodText] = useState('')
  const [food, setFood] = useState<FoodSuggestion | null>(null)
  const [grams, setGrams] = useState('100')

  // Recette
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<PickableRecipe | null>(recipe ?? null)
  const [servings, setServings] = useState('1')

  const reset = () => {
    setFoodText(''); setFood(null); setGrams('100')
    setQuery(''); setPicked(recipe ?? null); setServings('1'); setError(null)
  }

  const close = () => { setOpen(false); reset() }

  const submit = () => {
    setError(null)
    start(async () => {
      const res = tab === 'food'
        ? food
          ? await addFoodToLog({ date: day, meal: selectedMeal, code: food.code, grams: Number(grams.replace(',', '.')) })
          : { error: 'Choisis un aliment dans la liste.' }
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

  return (
    <>
      {trigger === 'icon' ? (
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen(true)} aria-label={`Ajouter au ${MEAL_LABELS[selectedMeal]}`}>
          <Plus className="h-4 w-4" />
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

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-start sm:pt-20 justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={close} />
          <div className="relative w-full sm:max-w-md bg-background rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90svh] overflow-y-auto">
            <div className="px-5 pt-5 pb-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Ajouter au journal</h3>
                <button type="button" onClick={close} className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted" aria-label="Fermer">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {!recipe && (
                <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
                  {([['food', 'Aliment', Apple], ['recipe', 'Recette', BookOpen]] as const).map(([key, label, Icon]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => { setTab(key); setError(null) }}
                      className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-sm font-medium transition-colors ${
                        tab === key ? 'bg-background shadow-sm' : 'text-muted-foreground'
                      }`}
                    >
                      <Icon className="h-4 w-4" /> {label}
                    </button>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <Label>Repas</Label>
                <div className="grid grid-cols-4 gap-1.5">
                  {MEALS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSelectedMeal(m)}
                      className={`rounded-lg border px-1 py-1.5 text-[11px] font-medium transition-colors ${
                        selectedMeal === m ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-muted'
                      }`}
                    >
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

              {tab === 'food' ? (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Aliment (base Ciqual)</Label>
                    <IngredientAutocomplete
                      value={foodText}
                      ciqualCode={food?.code ?? null}
                      onChange={(name, code) => { setFoodText(name); if (!code) setFood(null) }}
                      onPick={setFood}
                      placeholder="Ex : yaourt nature, pomme, riz cuit…"
                      autoFocus
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
              ) : (
                <div className="space-y-3">
                  {picked ? (
                    <div className="flex items-center gap-3 rounded-xl border p-2">
                      <div className="h-12 w-12 rounded-lg bg-muted overflow-hidden flex items-center justify-center shrink-0">
                        {picked.cover_image_url
                          ? <img src={picked.cover_image_url} alt="" className="h-full w-full object-cover" />
                          : <ChefHat className="h-5 w-5 text-muted-foreground/40" />}
                      </div>
                      <p className="flex-1 text-sm font-medium line-clamp-2">{picked.title}</p>
                      {!recipe && (
                        <Button variant="ghost" size="sm" onClick={() => setPicked(null)}>Changer</Button>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Chercher dans mes recettes" className="pl-9" />
                      </div>
                      <ul className="max-h-56 overflow-y-auto -mx-1 px-1 space-y-1">
                        {filtered.length === 0 && (
                          <li className="text-sm text-muted-foreground text-center py-4">Aucune recette.</li>
                        )}
                        {filtered.map((r) => (
                          <li key={r.id}>
                            <button type="button" onClick={() => setPicked(r)}
                              className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted text-sm">
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

            <div className="flex gap-3 px-5 pb-6">
              <Button variant="outline" className="flex-1" onClick={close} disabled={pending}>Annuler</Button>
              <Button className="flex-1" onClick={submit} disabled={pending}>
                {pending ? 'Ajout…' : 'Ajouter'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
