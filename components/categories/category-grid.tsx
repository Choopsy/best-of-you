'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, Globe, Lock, Users } from 'lucide-react'
import { Input } from '@/components/ui/input'
import type { Category } from '@/lib/types'

interface CategoryWithStats extends Category {
  recipe_count: number
  preview_url: string | null
}

interface Props {
  publicCategories: CategoryWithStats[]
  privateCategories: CategoryWithStats[]
  sharedCategories: CategoryWithStats[]
}

function CategoryCard({ cat }: { cat: CategoryWithStats }) {
  const img = cat.cover_image_url ?? cat.preview_url
  const VisibilityIcon =
    cat.visibility === 'public' ? Globe :
    cat.visibility === 'shared' ? Users :
    Lock

  return (
    <Link href={`/categories/${cat.id}`}>
      <div className="relative overflow-hidden rounded-2xl aspect-[4/3] bg-muted">
        {img && (
          <img src={img} alt={cat.name} className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className={`absolute inset-0 bg-gradient-to-t ${
          cat.visibility === 'shared'
            ? 'from-indigo-900/80 via-indigo-900/20 to-transparent'
            : 'from-black/75 via-black/10 to-transparent'
        }`} />
        <div className="absolute bottom-0 left-0 right-0 p-3 flex items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="text-white font-bold text-sm leading-tight truncate">{cat.name}</p>
            <p className="text-white/70 text-xs mt-0.5">
              {cat.recipe_count} recette{cat.recipe_count !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="shrink-0">
            <VisibilityIcon className="h-3.5 w-3.5 text-white/60" />
          </div>
        </div>
      </div>
    </Link>
  )
}

function Section({ title, categories, icon: Icon }: { title: string; categories: CategoryWithStats[]; icon?: React.ElementType }) {
  if (categories.length === 0) return null
  return (
    <div className="bg-card rounded-2xl p-4 space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {title}
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {categories.map((cat) => (
          <CategoryCard key={cat.id} cat={cat} />
        ))}
      </div>
    </div>
  )
}

export function CategoryGrid({ publicCategories, privateCategories, sharedCategories }: Props) {
  const [query, setQuery] = useState('')
  const q = query.toLowerCase()

  const filteredPublic  = publicCategories.filter((c) => c.name.toLowerCase().includes(q))
  const filteredPrivate = privateCategories.filter((c) => c.name.toLowerCase().includes(q))
  const filteredShared  = sharedCategories.filter((c) => c.name.toLowerCase().includes(q))
  const totalFiltered   = filteredPublic.length + filteredPrivate.length + filteredShared.length

  return (
    <div className="space-y-5">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Rechercher une catégorie…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {totalFiltered === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          {query ? 'Aucune catégorie ne correspond.' : 'Aucune catégorie pour l\'instant.'}
        </p>
      ) : (
        <>
          <Section title="Catégories publiques"      categories={filteredPublic}  icon={Globe} />
          <Section title="Partagées avec moi"        categories={filteredShared}  icon={Users} />
          <Section title="Mes catégories"              categories={filteredPrivate} />
        </>
      )}
    </div>
  )
}
