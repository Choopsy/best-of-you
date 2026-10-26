'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { X, ChevronLeft, ChevronRight, Check, Minus, Plus, ChefHat } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Ingredient, IngredientGroup, Step } from '@/lib/types'

type Phase = 'checklist' | 'cooking' | 'done'

interface Props {
  recipeId: string
  title: string
  baseServings: number
  groups: IngredientGroup[]
  steps: Step[]
}


function fmtAmount(value: number): string {
  const n = Math.round(value * 10) / 10
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 1 })
}

// ── Écran checklist ───────────────────────────────────────────────────────────

function ChecklistScreen({
  recipeId,
  title,
  servings,
  setServings,
  baseServings,
  groups,
  steps,
  checkedIds,
  onToggle,
  onCheckAll,
  onStart,
}: {
  recipeId: string
  title: string
  servings: number
  setServings: (n: number) => void
  baseServings: number
  groups: IngredientGroup[]
  steps: Step[]
  checkedIds: Set<string>
  onToggle: (id: string) => void
  onCheckAll: () => void
  onStart: () => void
}) {
  const ratio = servings / baseServings
  const allIds = groups.flatMap((g) => g.ingredients.map((i) => i.id))
  const total = allIds.length
  const checked = allIds.filter((id) => checkedIds.has(id)).length
  const allChecked = total > 0 && checked === total

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <Link href={`/recipes/${recipeId}`}>
          <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full">
            <X className="h-5 w-5" />
          </Button>
        </Link>
        <ChefHat className="h-5 w-5 text-muted-foreground" />
        <Button
          variant="ghost"
          size="sm"
          className="h-10 px-3 text-sm font-medium"
          onClick={onCheckAll}
        >
          {allChecked ? 'Tout décocher' : 'Tout cocher'}
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">Recette en cours</p>
          <h1 className="text-3xl font-bold leading-tight">{title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {steps.length} étape{steps.length > 1 ? 's' : ''}
          </p>
        </div>

        {/* Ajusteur de portions */}
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Portions</p>
            <p className="text-2xl font-bold tabular-nums">{servings}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-full shrink-0"
              onClick={() => setServings(Math.max(1, servings - 1))}
            >
              <Minus className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-full shrink-0"
              onClick={() => setServings(servings + 1)}
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Checklist ingrédients */}
        <div className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">Ingrédients</h2>
            {total > 0 && (
              <span className="text-sm text-muted-foreground tabular-nums">
                {checked} / {total}
              </span>
            )}
          </div>

          {groups.map((group) => (
            <div key={group.id}>
              {groups.length > 1 && group.name && (
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                  {group.name}
                </p>
              )}
              <ul className="space-y-1">
                {group.ingredients.map((ing) => {
                  const isChecked = checkedIds.has(ing.id)
                  return (
                    <li key={ing.id}>
                      <button
                        type="button"
                        onClick={() => onToggle(ing.id)}
                        className="w-full flex items-center gap-4 py-3 px-1 rounded-xl text-left active:bg-muted/60 transition-colors"
                      >
                        {/* Cercle checkbox */}
                        <span
                          className={`flex-none flex items-center justify-center h-7 w-7 rounded-full border-2 transition-colors shrink-0 ${
                            isChecked
                              ? 'bg-primary border-primary'
                              : 'border-muted-foreground/30 bg-transparent'
                          }`}
                        >
                          {isChecked && <Check className="h-4 w-4 text-primary-foreground" strokeWidth={3} />}
                        </span>

                        {/* Contenu */}
                        <span className={`flex items-baseline gap-3 flex-1 ${isChecked ? 'opacity-40' : ''}`}>
                          <span className="font-bold tabular-nums text-base min-w-[3.5rem] text-right shrink-0">
                            {ing.amount != null ? fmtAmount(ing.amount * ratio) : '—'}
                          </span>
                          <span className="text-muted-foreground text-sm w-10 shrink-0">
                            {ing.unit ?? ''}
                          </span>
                          <span className={`text-base ${isChecked ? 'line-through' : ''}`}>
                            {ing.name}
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="shrink-0 px-5 pb-8 pt-4 border-t flex flex-col items-center gap-3">
        <Button
          className="w-full h-16 text-xl rounded-2xl font-bold tracking-wide"
          onClick={onStart}
        >
          Commencer
        </Button>
        <button
          type="button"
          onClick={onStart}
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Passer cette étape →
        </button>
      </div>
    </div>
  )
}

// ── Écran terminé ─────────────────────────────────────────────────────────────

function DoneScreen({ recipeId, title }: { recipeId: string; title: string }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background px-8 text-center gap-8">
      <div className="flex items-center justify-center h-28 w-28 rounded-full bg-primary/10 ring-4 ring-primary/20">
        <Check className="h-14 w-14 text-primary" strokeWidth={2.5} />
      </div>
      <div className="space-y-2">
        <h1 className="text-4xl font-bold">Bon appétit !</h1>
        <p className="text-muted-foreground text-lg leading-snug">
          {title} est prêt.
        </p>
      </div>
      <Link href={`/recipes/${recipeId}`} className="w-full max-w-xs">
        <Button variant="outline" className="w-full h-14 text-lg rounded-2xl font-medium">
          Retour à la recette
        </Button>
      </Link>
    </div>
  )
}

// ── Écran étape ───────────────────────────────────────────────────────────────

function StepScreen({
  step,
  stepIndex,
  totalSteps,
  onNext,
  onPrev,
  recipeId,
  allIngredients,
  ratio,
}: {
  step: Step
  stepIndex: number
  totalSteps: number
  onNext: () => void
  onPrev: () => void
  recipeId: string
  allIngredients: Ingredient[]
  ratio: number
}) {
  const progress = ((stepIndex + 1) / totalSteps) * 100
  const isLast = stepIndex === totalSteps - 1
  const touchStartX = useRef(0)
  const matched = allIngredients.filter((ing) => step.ingredient_ids.includes(ing.id))

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    const delta = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(delta) < 60) return
    if (delta < 0) onNext()
    else onPrev()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <header className="shrink-0 px-4 pt-3 pb-2 space-y-3">
        <div className="flex items-center justify-between">
          <Link href={`/recipes/${recipeId}`}>
            <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full">
              <X className="h-5 w-5" />
            </Button>
          </Link>
          <span className="text-base font-semibold tabular-nums text-muted-foreground">
            {stepIndex + 1} <span className="text-muted-foreground/50">/</span> {totalSteps}
          </span>
          <div className="w-12" />
        </div>

        {/* Barre de progression */}
        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-400 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      {/* Contenu */}
      <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col gap-8">
        {/* Numéro d'étape */}
        <div className="flex justify-center">
          <div className="flex items-center justify-center h-20 w-20 rounded-full bg-primary text-primary-foreground shadow-lg">
            <span className="text-4xl font-bold tabular-nums">{stepIndex + 1}</span>
          </div>
        </div>

        {/* Texte de l'étape — grand, lisible */}
        <p className="text-2xl leading-relaxed font-medium">
          {step.content}
        </p>

        {/* Ingrédients détectés */}
        {matched.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Ingrédients
            </p>
            <div className="flex flex-wrap gap-2">
              {matched.map((ing) => (
                <div
                  key={ing.id}
                  className="flex items-baseline gap-1.5 px-3 py-2 rounded-xl bg-muted text-sm"
                >
                  {ing.amount != null && (
                    <span className="font-bold tabular-nums">
                      {fmtAmount(ing.amount * ratio)}
                    </span>
                  )}
                  {ing.unit && (
                    <span className="text-muted-foreground text-xs">{ing.unit}</span>
                  )}
                  <span className="font-medium">{ing.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Image */}
        {step.image_url && (
          <img
            src={step.image_url}
            alt={`Étape ${stepIndex + 1}`}
            className="rounded-2xl w-full object-cover max-h-64"
          />
        )}

        {/* Indicateur swipe discret */}
        <p className="text-center text-xs text-muted-foreground/40 mt-auto">
          Glisse pour naviguer
        </p>
      </div>

      {/* Navigation */}
      <div className="shrink-0 px-5 pb-8 pt-4 border-t space-y-3">
        <Button
          variant="outline"
          className="w-full h-14 text-lg rounded-2xl font-medium"
          onClick={onPrev}
        >
          <ChevronLeft className="h-5 w-5 mr-1" />
          {stepIndex === 0 ? 'Ingrédients' : 'Étape précédente'}
        </Button>

        <Button
          className="w-full h-16 text-xl rounded-2xl font-bold"
          onClick={onNext}
        >
          {isLast ? (
            <>
              <Check className="h-6 w-6 mr-2" strokeWidth={2.5} />
              Terminer la recette
            </>
          ) : (
            <>
              Étape suivante
              <ChevronRight className="h-6 w-6 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────

export function CookMode({ recipeId, title, baseServings, groups, steps }: Props) {
  const [phase, setPhase] = useState<Phase>('checklist')
  const [stepIndex, setStepIndex] = useState(0)
  const [servings, setServings] = useState(baseServings)
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())

  const allIngredients = groups.flatMap((g) => g.ingredients)
  const allIds = allIngredients.map((i) => i.id)
  const ratio = servings / baseServings

  const handleToggle = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleCheckAll = () => {
    const allChecked = allIds.every((id) => checkedIds.has(id))
    setCheckedIds(allChecked ? new Set() : new Set(allIds))
  }

  // Wake Lock — empêche l'écran de s'éteindre pendant la cuisson
  useEffect(() => {
    if (phase !== 'cooking') return
    let lock: WakeLockSentinel | null = null
    const acquire = async () => {
      try {
        lock = await (navigator as any).wakeLock?.request('screen')
      } catch {}
    }
    acquire()
    return () => { lock?.release().catch(() => {}) }
  }, [phase])

  if (phase === 'checklist') {
    return (
      <ChecklistScreen
        recipeId={recipeId}
        title={title}
        servings={servings}
        setServings={setServings}
        baseServings={baseServings}
        groups={groups}
        steps={steps}
        checkedIds={checkedIds}
        onToggle={handleToggle}
        onCheckAll={handleCheckAll}
        onStart={() => { setStepIndex(0); setPhase('cooking') }}
      />
    )
  }

  if (phase === 'done') {
    return <DoneScreen recipeId={recipeId} title={title} />
  }

  return (
    <StepScreen
      step={steps[stepIndex]}
      stepIndex={stepIndex}
      totalSteps={steps.length}
      recipeId={recipeId}
      allIngredients={allIngredients}
      ratio={ratio}
      onNext={() => {
        if (stepIndex < steps.length - 1) setStepIndex((i) => i + 1)
        else setPhase('done')
      }}
      onPrev={() => {
        if (stepIndex > 0) setStepIndex((i) => i - 1)
        else setPhase('checklist')
      }}
    />
  )
}
