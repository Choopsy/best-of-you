import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CookMode } from '@/components/recipes/cook-mode'
import type { IngredientGroup, Step } from '@/lib/types'

interface Props {
  params: Promise<{ id: string }>
}

export default async function CookPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: raw } = await supabase
    .from('recipes')
    .select(`
      id, title, base_servings,
      ingredient_groups (
        id, name, position,
        ingredients ( id, name, amount, unit, position )
      ),
      steps ( id, position, content, image_url, step_ingredients ( ingredient_id ) )
    `)
    .eq('id', id)
    .single()

  if (!raw) notFound()

  const groups: IngredientGroup[] = (raw.ingredient_groups as any[])
    .sort((a, b) => a.position - b.position)
    .map((g) => ({
      ...g,
      ingredients: (g.ingredients as any[]).sort((a: any, b: any) => a.position - b.position),
    }))

  const steps: Step[] = (raw.steps as any[])
    .sort((a: any, b: any) => a.position - b.position)
    .map((s: any) => ({
      ...s,
      ingredient_ids: (s.step_ingredients as any[] ?? []).map((si: any) => si.ingredient_id),
    }))

  if (steps.length === 0) notFound()

  return (
    <CookMode
      recipeId={id}
      title={raw.title}
      baseServings={raw.base_servings ?? 4}
      groups={groups}
      steps={steps}
    />
  )
}
