'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import type { Tag } from '@/lib/types'

const DIFFICULTIES = [
  { value: 'easy', label: 'Facile' },
  { value: 'medium', label: 'Moyen' },
  { value: 'hard', label: 'Difficile' },
] as const

function FilterPill({
  active,
  onClick,
  color,
  children,
}: {
  active: boolean
  onClick: () => void
  color?: string | null
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? 'border-foreground bg-foreground text-background'
          : 'border-border bg-background hover:bg-muted'
      }`}
      style={!active && color ? { borderColor: `${color}50`, color } : {}}
    >
      {children}
    </button>
  )
}

export function RecipeFilters({ tags }: { tags: Tag[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const q = searchParams.get('q') ?? ''
  const difficulty = searchParams.get('difficulty') ?? ''
  const tag = searchParams.get('tag') ?? ''
  const hasFilters = q || difficulty || tag

  const update = useCallback(
    (changes: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      Object.entries(changes).forEach(([k, v]) =>
        v ? params.set(k, v) : params.delete(k),
      )
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, searchParams, pathname],
  )

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Rechercher une recette..."
          defaultValue={q}
          onChange={(e) => update({ q: e.target.value || null })}
          className="pl-9"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {DIFFICULTIES.map((d) => (
          <FilterPill
            key={d.value}
            active={difficulty === d.value}
            onClick={() => update({ difficulty: difficulty === d.value ? null : d.value })}
          >
            {d.label}
          </FilterPill>
        ))}

        {tags.map((t) => (
          <FilterPill
            key={t.id}
            active={tag === t.id}
            onClick={() => update({ tag: tag === t.id ? null : t.id })}
            color={t.color}
          >
            {t.name}
          </FilterPill>
        ))}

        {hasFilters && (
          <button
            onClick={() => update({ q: null, difficulty: null, tag: null })}
            className="shrink-0 flex items-center gap-1 rounded-full border border-dashed px-3 py-1 text-xs text-muted-foreground hover:bg-muted"
          >
            <X className="h-3 w-3" />
            Effacer
          </button>
        )}
      </div>
    </div>
  )
}
