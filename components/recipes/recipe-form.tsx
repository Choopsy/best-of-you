'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { createRecipe, updateRecipe, deleteRecipe } from '@/actions/recipes'
import { ImagePicker } from '@/components/recipes/image-picker'
import { IngredientAutocomplete } from '@/components/recipes/ingredient-autocomplete'
import type { Tag, Category, RecipeDetail, Difficulty, CreateRecipeInput } from '@/lib/types'

// ── Types locaux ──────────────────────────────────────────────────────────────

interface IngRow { id: string; name: string; amount: string; unit: string }
interface GroupRow { id: string; name: string; ingredients: IngRow[] }
interface StepRow { id: string; content: string; image_url: string; ingredient_local_ids: string[] }

const uid = () => Math.random().toString(36).slice(2)

const emptyGroup = (): GroupRow => ({
  id: uid(),
  name: '',
  ingredients: [{ id: uid(), name: '', amount: '', unit: '' }],
})

const emptyStep = (): StepRow => ({ id: uid(), content: '', image_url: '', ingredient_local_ids: [] })

// ── Helpers d'initialisation ─────────────────────────────────────────────────

function initGroups(data?: RecipeDetail): GroupRow[] {
  if (!data?.ingredient_groups.length) return [emptyGroup()]
  return data.ingredient_groups.map((g) => ({
    id: uid(),
    name: g.name,
    ingredients: g.ingredients.length
      ? g.ingredients.map((i) => ({
          id: i.id, // keep DB id as local id so step links resolve directly
          name: i.name,
          amount: i.amount != null ? String(i.amount) : '',
          unit: i.unit ?? '',
        }))
      : [{ id: uid(), name: '', amount: '', unit: '' }],
  }))
}

function initSteps(data?: RecipeDetail): StepRow[] {
  if (!data?.steps.length) return [emptyStep()]
  return data.steps.map((s) => ({
    id: uid(),
    content: s.content,
    image_url: s.image_url ?? '',
    ingredient_local_ids: s.ingredient_ids ?? [],
  }))
}

// ── Composant principal ───────────────────────────────────────────────────────

interface Props {
  tags: Tag[]
  categories: Category[]
  defaultCategoryId?: string | null
  initialData?: RecipeDetail
}

export function RecipeForm({ tags, categories, defaultCategoryId, initialData }: Props) {
  const [isPending, startTransition] = useTransition()
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  // Champs simples
  const [title, setTitle] = useState(initialData?.title ?? '')
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [coverUrl, setCoverUrl] = useState(initialData?.cover_image_url ?? '')
  const [prepTime, setPrepTime] = useState(String(initialData?.prep_time_min ?? ''))
  const [cookTime, setCookTime] = useState(String(initialData?.cook_time_min ?? ''))
  const [servings, setServings] = useState(String(initialData?.base_servings ?? '4'))
  const [difficulty, setDifficulty] = useState<Difficulty | ''>(initialData?.difficulty ?? '')
  const [categoryId, setCategoryId] = useState<string>(initialData?.category_id ?? defaultCategoryId ?? '')
  const [tagIds, setTagIds] = useState<string[]>(initialData?.tags.map((t) => t.id) ?? [])

  // Listes dynamiques
  const [groups, setGroups] = useState<GroupRow[]>(initGroups(initialData))
  const [steps, setSteps] = useState<StepRow[]>(initSteps(initialData))

  // ── Tags ────────────────────────────────────────────────────────────────────

  const toggleTag = (id: string) =>
    setTagIds((ids) => (ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]))

  // ── Groupes & ingrédients ───────────────────────────────────────────────────

  const setGroupName = (gid: string, name: string) =>
    setGroups((gs) => gs.map((g) => (g.id === gid ? { ...g, name } : g)))

  const removeGroup = (gid: string) => setGroups((gs) => gs.filter((g) => g.id !== gid))

  const addIngredient = (gid: string) =>
    setGroups((gs) =>
      gs.map((g) =>
        g.id === gid
          ? { ...g, ingredients: [...g.ingredients, { id: uid(), name: '', amount: '', unit: '' }] }
          : g,
      ),
    )

  const removeIngredient = (gid: string, iid: string) => {
    setGroups((gs) =>
      gs.map((g) =>
        g.id === gid ? { ...g, ingredients: g.ingredients.filter((i) => i.id !== iid) } : g,
      ),
    )
    setSteps((ss) => ss.map((s) => ({
      ...s,
      ingredient_local_ids: s.ingredient_local_ids.filter((id) => id !== iid),
    })))
  }

  const setIngField = (gid: string, iid: string, field: keyof IngRow, value: string) =>
    setGroups((gs) =>
      gs.map((g) =>
        g.id === gid
          ? { ...g, ingredients: g.ingredients.map((i) => (i.id === iid ? { ...i, [field]: value } : i)) }
          : g,
      ),
    )

  // ── Étapes ─────────────────────────────────────────────────────────────────

  const [openIngPanels, setOpenIngPanels] = useState<Record<string, boolean>>({})

  const setStepField = (sid: string, field: 'content' | 'image_url', value: string) =>
    setSteps((ss) => ss.map((s) => (s.id === sid ? { ...s, [field]: value } : s)))

  const removeStep = (sid: string) => setSteps((ss) => ss.filter((s) => s.id !== sid))

  const toggleStepIngredient = (sid: string, ingId: string) =>
    setSteps((ss) => ss.map((s) => {
      if (s.id !== sid) return s
      const ids = s.ingredient_local_ids.includes(ingId)
        ? s.ingredient_local_ids.filter((id) => id !== ingId)
        : [...s.ingredient_local_ids, ingId]
      return { ...s, ingredient_local_ids: ids }
    }))

  // ── Soumission ──────────────────────────────────────────────────────────────

  const handleSubmit = () => {
    if (!title.trim()) return setFormError('Le titre est obligatoire.')
    if (!difficulty) return setFormError('La difficulté est obligatoire.')
    setFormError(null)

    const input: CreateRecipeInput = {
      title: title.trim(),
      description: description.trim(),
      cover_image_url: coverUrl.trim(),
      prep_time_min: prepTime ? parseInt(prepTime) : null,
      cook_time_min: cookTime ? parseInt(cookTime) : null,
      base_servings: parseInt(servings) || 4,
      difficulty: difficulty as Difficulty,
      category_id: categoryId || null,
      tag_ids: tagIds,
      groups: groups.map((g) => ({
        name: g.name.trim(),
        ingredients: g.ingredients
          .filter((i) => i.name.trim())
          .map((i) => ({
            name: i.name.trim(),
            amount: i.amount ? parseFloat(i.amount.replace(',', '.')) : null,
            unit: i.unit.trim(),
          })),
      })),
      steps: (() => {
        // Build localId -> {gi, ii} map based on valid (non-empty) ingredients
        const ingPosMap: Record<string, { gi: number; ii: number }> = {}
        groups.forEach((g, gi) => {
          let validIi = 0
          g.ingredients.forEach((ing) => {
            if (ing.name.trim()) ingPosMap[ing.id] = { gi, ii: validIi++ }
          })
        })
        return steps
          .filter((s) => s.content.trim())
          .map((s) => ({
            content: s.content.trim(),
            image_url: s.image_url.trim(),
            ingredient_positions: s.ingredient_local_ids
              .map((lid) => ingPosMap[lid])
              .filter(Boolean) as Array<{ gi: number; ii: number }>,
          }))
      })(),
    }

    startTransition(async () => {
      const result = initialData
        ? await updateRecipe(initialData.id, input)
        : await createRecipe(input)
      if (result?.error) setFormError(result.error)
    })
  }

  // ── Rendu ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8 pb-28">
      {formError && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-3 rounded-lg">
          {formError}
        </div>
      )}

      {/* Infos générales */}
      <section className="space-y-4">
        <h2 className="font-semibold text-base">Informations générales</h2>
        <div className="space-y-2">
          <Label htmlFor="title">Titre *</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Quiche Lorraine" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Une courte description..."
            rows={3}
          />
        </div>
        <div className="space-y-2">
          <Label>Image de couverture</Label>
          <ImagePicker value={coverUrl} onChange={setCoverUrl} compact />
        </div>
      </section>

      <Separator />

      {/* Détails */}
      <section className="space-y-4">
        <h2 className="font-semibold text-base">Détails</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="prep">Préparation (min)</Label>
            <Input id="prep" type="number" min={0} value={prepTime} onChange={(e) => setPrepTime(e.target.value)} placeholder="20" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cook">Cuisson (min)</Label>
            <Input id="cook" type="number" min={0} value={cookTime} onChange={(e) => setCookTime(e.target.value)} placeholder="35" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="servings">Portions</Label>
            <Input id="servings" type="number" min={1} value={servings} onChange={(e) => setServings(e.target.value)} placeholder="4" />
          </div>
          <div className="space-y-2">
            <Label>Difficulté *</Label>
            <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Difficulty)}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Facile</SelectItem>
                <SelectItem value="medium">Moyen</SelectItem>
                <SelectItem value="hard">Difficile</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Catégorie</Label>
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Tu n&apos;as pas encore de catégorie.{' '}
              <a href="/categories/new" className="underline underline-offset-4">
                En créer une
              </a>
            </p>
          ) : (
            <Select value={categoryId} onValueChange={(v) => setCategoryId(v ?? '')}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir une catégorie..." />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </section>

      {/* Tags */}
      {tags.length > 0 && (
        <>
          <Separator />
          <section className="space-y-3">
            <h2 className="font-semibold text-base">Tags</h2>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const on = tagIds.includes(tag.id)
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      on ? 'border-foreground bg-foreground text-background' : 'border-border hover:bg-muted'
                    }`}
                    style={!on && tag.color ? { borderColor: `${tag.color}50`, color: tag.color } : {}}
                  >
                    {tag.name}
                  </button>
                )
              })}
            </div>
          </section>
        </>
      )}

      <Separator />

      {/* Ingrédients */}
      <section className="space-y-3">
        <h2 className="font-semibold text-base">Ingrédients</h2>
        {groups.map((group, gi) => (
          <div key={group.id} className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Input
                value={group.name}
                onChange={(e) => setGroupName(group.id, e.target.value)}
                placeholder={`Groupe ${gi + 1} (ex: Pâte brisée)`}
                className="h-8 text-sm font-medium"
              />
              {groups.length > 1 && (
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 hover:text-destructive"
                  onClick={() => removeGroup(group.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="grid grid-cols-[1fr_3.5rem_5rem_2rem] gap-1 px-0.5">
                <span className="text-[10px] text-muted-foreground">Ingrédient</span>
                <span className="text-[10px] text-muted-foreground text-center">Qté</span>
                <span className="text-[10px] text-muted-foreground text-center">Unité</span>
                <span />
              </div>
              {group.ingredients.map((ing) => (
                <div key={ing.id} className="grid grid-cols-[1fr_3.5rem_5rem_2rem] gap-1 items-center">
                  <IngredientAutocomplete
                    value={ing.name}
                    onChange={(v) => setIngField(group.id, ing.id, 'name', v)}
                    placeholder="Farine"
                    className="h-8 text-sm"
                  />
                  <Input value={ing.amount} onChange={(e) => setIngField(group.id, ing.id, 'amount', e.target.value)}
                    placeholder="200" className="h-8 text-sm text-center px-1" type="number" min={0} step="any" />
                  <Select value={ing.unit} onValueChange={(v) => setIngField(group.id, ing.id, 'unit', v ?? '')}>
                    <SelectTrigger className="h-8 text-xs px-1">
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      {['g','kg','mg','ml','cl','dl','L','c.c','c.s','tasse','verre','pincée','sachet','yaourt','botte','tranche','feuille','gousse','brin',''].map((u) => (
                        <SelectItem key={u || '__none__'} value={u}>{u || '—'}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive"
                    onClick={() => removeIngredient(group.id, ing.id)} disabled={group.ingredients.length === 1}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground -ml-1"
              onClick={() => addIngredient(group.id)}>
              <Plus className="h-3 w-3 mr-1" /> Ajouter un ingrédient
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => setGroups((gs) => [...gs, emptyGroup()])}>
          <Plus className="h-4 w-4 mr-1" /> Ajouter un groupe
        </Button>
      </section>

      <Separator />

      {/* Étapes */}
      <section className="space-y-3">
        <h2 className="font-semibold text-base">Étapes</h2>
        {steps.map((step, si) => {
          const allIngRows = groups.flatMap((g) => g.ingredients.filter((i) => i.name.trim()))
          const isOpen = !!openIngPanels[step.id]
          return (
            <div key={step.id} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Étape {si + 1}</span>
                {steps.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive"
                    onClick={() => removeStep(step.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <Textarea value={step.content} onChange={(e) => setStepField(step.id, 'content', e.target.value)}
                placeholder="Décrivez cette étape..." rows={3} />
              <ImagePicker
                value={step.image_url}
                onChange={(url) => setStepField(step.id, 'image_url', url)}
                compact
              />

              {/* Sélecteur d'ingrédients */}
              {allIngRows.length > 0 && (
                <div className="pt-1 space-y-2">
                  <button
                    type="button"
                    onClick={() => setOpenIngPanels((p) => ({ ...p, [step.id]: !p[step.id] }))}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Plus className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-45' : ''}`} />
                    {step.ingredient_local_ids.length > 0
                      ? `Ingrédients (${step.ingredient_local_ids.length})`
                      : 'Associer des ingrédients'}
                  </button>
                  {isOpen && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {allIngRows.map((ing) => {
                        const selected = step.ingredient_local_ids.includes(ing.id)
                        return (
                          <button
                            key={ing.id}
                            type="button"
                            onClick={() => toggleStepIngredient(step.id, ing.id)}
                            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                              selected
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'border-border hover:bg-muted'
                            }`}
                          >
                            {ing.name}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
        <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => setSteps((ss) => [...ss, emptyStep()])}>
          <Plus className="h-4 w-4 mr-1" /> Ajouter une étape
        </Button>
      </section>

      {/* Barre d'actions fixe */}
      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-sm border-t px-4 py-3 flex gap-3 max-w-2xl mx-auto">
        {initialData && (
          <>
            <Button
              type="button"
              variant="outline"
              className="text-destructive border-destructive/30 hover:bg-destructive/5"
              onClick={() => setDeleteOpen(true)}
            >
              Supprimer
            </Button>

            {/* base-ui AlertDialog contrôlé (pas d'asChild disponible en v4) */}
            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer cette recette ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action est irréversible. La recette, ses ingrédients et ses étapes seront définitivement supprimés.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive hover:bg-destructive/90"
                    onClick={() => {
                      startTransition(async () => { await deleteRecipe(initialData.id) })
                    }}
                  >
                    Supprimer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
        <Button type="button" onClick={handleSubmit} disabled={isPending} className="flex-1">
          {isPending
            ? 'Enregistrement...'
            : initialData
              ? 'Enregistrer les modifications'
              : 'Créer la recette'}
        </Button>
      </div>
    </div>
  )
}
