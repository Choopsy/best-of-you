'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Camera, ImageUp, Loader2, Plus, Trash2, X } from 'lucide-react'
import { Portal } from '@/components/ui/portal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { IngredientAutocomplete } from '@/components/recipes/ingredient-autocomplete'
import { acceptPhotoConsent } from '@/actions/photo'
import { addFoodsToLog } from '@/actions/journal'
import { canUseGrams, nutrientFactor } from '@/lib/portions'
import { MAX_PHOTO_BYTES, MAX_PHOTO_GRAMS, MAX_PHOTO_ITEMS, PHOTO_JPEG_QUALITY, PHOTO_MAX_SIDE, remainingText, type Confidence, type PhotoProposal } from '@/lib/meal-photo'
import { MEALS, MEAL_LABELS, mealForHour, type FoodSuggestion, type Meal } from '@/lib/types'
import type { PhotoStatus } from '@/lib/photo-access'

type Step = 'consent' | 'pick' | 'wait' | 'review'

interface Line {
  id: number
  /** Ce que l'IA a vu (null pour une ligne ajoutée à la main) */
  seen: string | null
  confidence: Confidence | null
  text: string
  food: FoodSuggestion | null
  grams: string
}

const CONFIDENCE_TEXT: Record<Confidence, string> = { haute: 'sûr', moyenne: 'à vérifier', basse: 'incertain' }

/**
 * Réduit la photo sur le téléphone (1024 px de côté au plus, JPEG ≈ 0,8) avant l'envoi :
 * moins de données envoyées, et rien de plus que nécessaire pour reconnaître l'assiette.
 */
async function shrinkPhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, PHOTO_MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', PHOTO_JPEG_QUALITY))
  if (!blob) throw new Error('conversion')
  return blob
}

/** kcal d'une ligne, recalculées depuis l'aliment choisi (jamais depuis l'IA) ; null si incalculable */
function lineKcal(l: Line): number | null {
  if (!l.food || l.food.kcal == null) return null
  const grams = Number(l.grams.replace(',', '.'))
  const factor = nutrientFactor({ perPortion: !!l.food.perPortion, portionGrams: l.food.portionGrams ?? null }, 'g', grams)
  return factor == null ? null : Math.round(l.food.kcal * factor)
}

const gramsOnly = (f: FoodSuggestion) => f.kind !== 'custom' || canUseGrams({ perPortion: !!f.perPortion, portionGrams: f.portionGrams ?? null })

/** Bouton « Photo du repas » du journal et sa fenêtre : accord, photo, attente, vérification. */
export function MealPhoto({ date, status, defaultOpen = false }: { date: string; status: PhotoStatus; /** Ouverte depuis le menu + (?photo=1) */ defaultOpen?: boolean }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [open, setOpen] = useState(false)
  const [consented, setConsented] = useState(status.consented)
  const [remaining, setRemaining] = useState(status.remaining)
  const [step, setStep] = useState<Step>('pick')
  const [meal, setMeal] = useState<Meal>('lunch')
  const [lines, setLines] = useState<Line[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const nextId = useRef(1)
  const cameraInput = useRef<HTMLInputElement>(null)
  const galleryInput = useRef<HTMLInputElement>(null)

  const openSheet = () => {
    setError(null); setLines([])
    setMeal(mealForHour(new Date().getHours()))
    setStep(consented ? 'pick' : 'consent')
    setOpen(true)
  }
  // Ouverte depuis le menu + : la fenêtre s'affiche, la caméra attend un geste (« Prendre la photo »),
  // les téléphones refusant de l'ouvrir sans action de l'utilisateur
  useEffect(() => { if (defaultOpen) openSheet() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => {
    if (step === 'wait') return
    setOpen(false)
    // ?photo=1 retiré de l'adresse : recharger la page ne rouvre pas la fenêtre
    if (params.has('photo')) {
      const q = new URLSearchParams(params)
      q.delete('photo')
      router.replace(q.size ? `${pathname}?${q}` : pathname, { scroll: false })
    }
  }

  const accept = () => start(async () => {
    setError(null)
    const res = await acceptPhotoConsent()
    if (res.error) { setError(res.error); return }
    setConsented(true); setStep('pick')
  })

  const newLine = (p?: PhotoProposal): Line => ({
    id: nextId.current++,
    seen: p?.name ?? null,
    confidence: p?.confidence ?? null,
    text: p?.food?.name ?? p?.name ?? '',
    food: p?.food ?? null,
    grams: p ? String(p.grams) : '100',
  })

  const analyse = async (file: File | undefined) => {
    if (!file) return
    setError(null); setStep('wait')
    try {
      let photo: Blob
      try { photo = await shrinkPhoto(file) } catch { throw new Error('Impossible de lire cette image. Essaie avec une autre photo.') }
      if (photo.size > MAX_PHOTO_BYTES) throw new Error('Photo trop lourde (2 Mo maximum).')
      const body = new FormData()
      body.append('photo', photo, 'repas.jpg')
      const res = await fetch('/api/meal-photo', { method: 'POST', body })
      const data = await res.json().catch(() => ({ error: 'Réponse inattendue du serveur.' }))
      if (!res.ok) {
        if (data.code === 'no_consent') { setConsented(false); setStep('consent') } else setStep('pick')
        if (typeof data.remaining === 'number') setRemaining(data.remaining)
        setError(data.error ?? 'L\'analyse n\'a pas marché.')
        return
      }
      setRemaining(data.remaining)
      setLines((data.items as PhotoProposal[]).map(newLine))
      setStep('review')
    } catch (e) {
      setStep('pick')
      setError(e instanceof Error && e.message ? e.message : 'Pas de réseau : réessaie dans un instant.')
    } finally {
      // Même photo choisie deux fois de suite : l'événement doit repartir
      if (cameraInput.current) cameraInput.current.value = ''
      if (galleryInput.current) galleryInput.current.value = ''
    }
  }

  const update = (id: number, patch: Partial<Line>) => setLines((all) => all.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  const total = lines.reduce((a, l) => a + (lineKcal(l) ?? 0), 0)

  const submit = () => {
    setError(null)
    const missing = lines.find((l) => !l.food)
    if (missing) { setError(`Choisis un aliment dans la liste pour « ${missing.text || 'la ligne vide'} », ou retire la ligne.`); return }
    const portionOnly = lines.find((l) => l.food && !gramsOnly(l.food))
    if (portionOnly) { setError(`« ${portionOnly.food!.name} » se compte en portions : ajoute-le avec le bouton « Ajouter ».`); return }
    const bad = lines.find((l) => { const g = Number(l.grams.replace(',', '.')); return !(g >= 1 && g <= MAX_PHOTO_GRAMS) })
    if (bad) { setError(`« ${bad.food!.name} » : quantité entre 1 et 2 000 g.`); return }
    start(async () => {
      const res = await addFoodsToLog({
        date, meal,
        items: lines.map((l) => ({ ...(l.food!.kind === 'custom' ? { customId: l.food!.code } : { code: l.food!.code }), grams: Number(l.grams.replace(',', '.')) })),
      })
      if (res.error) { setError(res.error); return }
      setOpen(false)
      // Venue du menu + : on retire ?photo=1 (la navigation relit aussi le journal)
      if (params.has('photo')) close()
      else router.refresh()
    })
  }

  return (
    <>
      <button type="button" onClick={openSheet}
        className="flex w-full min-h-14 items-center gap-3 rounded-3xl bg-card px-5 py-3 text-left shadow-card">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-terracotta/15 text-terracotta">
          <Camera className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-heading font-semibold">Photo du repas</span>
          <span className="block text-xs text-muted-foreground">{remainingText(remaining)}</span>
        </span>
      </button>

      <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden"
        aria-label="Prendre la photo" onChange={(e) => analyse(e.target.files?.[0])} />
      <input ref={galleryInput} type="file" accept="image/*" className="hidden"
        aria-label="Choisir une photo" onChange={(e) => analyse(e.target.files?.[0])} />

      <Portal>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-start sm:pt-20 justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={close} />
          <div role="dialog" aria-modal="true" aria-label="Photo du repas"
            className="relative w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-3xl shadow-float max-h-[90svh] overflow-y-auto">
            <div className="px-5 pt-5 pb-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg">Photo du repas</h3>
                {step !== 'wait' && (
                  <button type="button" onClick={close} className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-muted" aria-label="Fermer">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {step === 'consent' && (
                <div className="space-y-3 text-sm">
                  <p>Prends ton assiette en photo : Dignis reconnaît les aliments et estime les quantités, puis tu vérifies avant d&apos;ajouter.</p>
                  <ul className="space-y-2 rounded-2xl bg-muted p-4">
                    <li>Ta photo est envoyée à <strong>Anthropic</strong> (l&apos;entreprise qui fait Claude) pour l&apos;analyse, puis supprimée. Dignis ne la garde pas.</li>
                    <li>Les quantités sont des <strong>estimations à vérifier</strong>. Les valeurs nutritionnelles viennent de la table Ciqual (ANSES), pas de l&apos;IA.</li>
                    <li>Tu peux retirer ton accord à tout moment dans Profil &gt; Mes données.</li>
                  </ul>
                </div>
              )}

              {step === 'pick' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Repas</Label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {MEALS.map((m) => (
                        <button key={m} type="button" onClick={() => setMeal(m)} aria-pressed={meal === m}
                          className={`min-h-10 rounded-xl border px-1 py-1.5 text-[11px] font-bold transition-colors ${
                            meal === m ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'hover:bg-muted'}`}>
                          {MEAL_LABELS[m]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Button className="h-12 rounded-full gap-2" disabled={remaining <= 0} onClick={() => cameraInput.current?.click()}>
                      <Camera className="h-5 w-5" /> Prendre la photo
                    </Button>
                    <Button variant="outline" className="h-12 rounded-full gap-2" disabled={remaining <= 0} onClick={() => galleryInput.current?.click()}>
                      <ImageUp className="h-5 w-5" /> Choisir dans mes photos
                    </Button>
                  </div>
                  <p className="text-center text-sm font-bold">{remainingText(remaining)}</p>
                  <p className="text-xs text-muted-foreground">Ta photo est envoyée à Anthropic pour l&apos;analyse puis supprimée.</p>
                </div>
              )}

              {step === 'wait' && (
                <div className="flex flex-col items-center gap-3 py-10 text-center" role="status">
                  <Loader2 className="h-8 w-8 animate-spin text-terracotta" aria-hidden="true" />
                  <p className="font-heading font-semibold">Analyse de ton assiette…</p>
                  <p className="text-xs text-muted-foreground">Quelques secondes. La photo n&apos;est pas gardée.</p>
                </div>
              )}

              {step === 'review' && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {lines.length ? 'Vérifie chaque aliment et sa quantité : ce sont des estimations.' : 'Aucun aliment reconnu sur cette photo. Tu peux les ajouter toi-même.'}
                  </p>
                  <ul aria-label="Aliments du repas" className="space-y-2">
                    {lines.map((l) => {
                      const kcal = lineKcal(l)
                      const label = l.food?.name ?? l.text ?? 'aliment'
                      return (
                        <li key={l.id} className="space-y-2 rounded-2xl bg-background p-3">
                          <div className="flex items-start gap-2">
                            <div className="min-w-0 flex-1">
                              <IngredientAutocomplete value={l.text} ciqualCode={l.food?.code ?? null} includeProducts
                                ariaLabel={`Aliment${l.seen ? ` (vu : ${l.seen})` : ''}`}
                                placeholder="Cherche un aliment"
                                onChange={(text, code) => update(l.id, code ? { text } : { text, food: null })}
                                onPick={(food) => update(l.id, { food, text: food.name })} />
                            </div>
                            <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setLines((all) => all.filter((x) => x.id !== l.id))}
                              aria-label={`Retirer ${label}`}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-3">
                            <Input type="number" inputMode="numeric" min={1} max={MAX_PHOTO_GRAMS} step={5} className="w-24"
                              aria-label={`Grammes de ${label}`} value={l.grams} onChange={(e) => update(l.id, { grams: e.target.value })} />
                            <span className="text-sm text-muted-foreground">g</span>
                            <span className="flex-1 text-right text-sm font-bold tabular-nums">
                              {kcal != null ? `≈ ${kcal.toLocaleString('fr-FR')} kcal` : '—'}
                            </span>
                          </div>
                          {l.seen && (
                            <p className="text-xs text-muted-foreground">
                              Vu : « {l.seen} »{l.confidence ? ` · ${CONFIDENCE_TEXT[l.confidence]}` : ''}
                              {!l.food && ' · pas trouvé dans la base, choisis un aliment'}
                            </p>
                          )}
                          {l.food && !gramsOnly(l.food) && <p className="text-xs text-destructive">Ce produit se compte en portions.</p>}
                        </li>
                      )
                    })}
                  </ul>
                  {lines.length < MAX_PHOTO_ITEMS && (
                    <Button variant="secondary" className="w-full gap-2 text-primary" onClick={() => setLines((all) => [...all, newLine()])}>
                      <Plus className="h-4 w-4" /> Ajouter une ligne
                    </Button>
                  )}
                  <div className="flex items-baseline justify-between border-t pt-3" aria-label="Total du repas">
                    <span className="font-heading font-semibold">Total · {MEAL_LABELS[meal]}</span>
                    <span className="text-lg font-bold tabular-nums">≈ {total.toLocaleString('fr-FR')} kcal</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{remainingText(remaining)} · valeurs de la table Ciqual (ANSES).</p>
                </div>
              )}

              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            </div>

            {step === 'consent' && (
              <div className="flex gap-3 px-5 pb-6">
                <Button variant="outline" className="flex-1" onClick={close} disabled={pending}>Pas maintenant</Button>
                <Button className="flex-1" onClick={accept} disabled={pending}>J&apos;accepte</Button>
              </div>
            )}
            {step === 'review' && (
              <div className="flex gap-3 px-5 pb-6">
                <Button variant="outline" className="flex-1" onClick={close} disabled={pending}>Annuler</Button>
                <Button className="flex-1" onClick={submit} disabled={pending || !lines.length}>{pending ? 'Ajout…' : 'Ajouter au repas'}</Button>
              </div>
            )}
            {step === 'pick' && <div className="pb-2" />}
          </div>
        </div>
      )}
      </Portal>
    </>
  )
}
