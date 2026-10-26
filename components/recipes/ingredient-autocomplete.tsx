'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { CircleCheck, CircleAlert } from 'lucide-react'
import { Input } from '@/components/ui/input'
import type { FoodSuggestion } from '@/lib/types'

interface Props {
  value: string
  ciqualCode: string | null
  /** code = null quand le texte ne correspond plus à un aliment Ciqual choisi */
  onChange: (name: string, code: string | null) => void
  onPick?: (food: FoodSuggestion) => void
  placeholder?: string
  className?: string
  /** Affiche l'état « lié / non lié » à droite du champ */
  showStatus?: boolean
  autoFocus?: boolean
}

export function IngredientAutocomplete({
  value, ciqualCode, onChange, onPick, placeholder, className, showStatus = true, autoFocus,
}: Props) {
  const [suggestions, setSuggestions] = useState<FoodSuggestion[]>([])
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setSuggestions([]); setOpen(false); return }
    const res = await fetch(`/api/ingredients/search?q=${encodeURIComponent(q)}`)
    const data: FoodSuggestion[] = res.ok ? await res.json() : []
    setSuggestions(data)
    setOpen(data.length > 0)
    setActiveIndex(-1)
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    onChange(v, null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(v), 220)
  }

  const select = (food: FoodSuggestion) => {
    onChange(food.name, food.code)
    onPick?.(food)
    setSuggestions([])
    setOpen(false)
    setActiveIndex(-1)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, -1))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      select(suggestions[activeIndex])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const linked = !!ciqualCode
  return (
    <div ref={containerRef} className="relative">
      <Input
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder}
        className={`${className ?? ''} ${showStatus ? 'pr-7' : ''}`}
        autoComplete="off"
        autoFocus={autoFocus}
      />
      {showStatus && value.trim() && (
        <span
          className="absolute right-2 top-1/2 -translate-y-1/2"
          title={linked ? 'Aliment Ciqual : compté dans la nutrition' : 'Choisis un aliment dans la liste pour le compter dans la nutrition'}
        >
          {linked
            ? <CircleCheck className="h-3.5 w-3.5 text-sage" />
            : <CircleAlert className="h-3.5 w-3.5 text-honey" />}
        </span>
      )}
      {open && suggestions.length > 0 && (
        <ul role="listbox" aria-label="Aliments Ciqual" className="absolute left-0 right-0 top-full z-50 mt-1 min-w-64 rounded-xl border bg-popover shadow-lg overflow-hidden text-sm">
          {suggestions.map((s, i) => (
            <li key={s.code}>
              <button
                type="button"
                role="option"
                aria-selected={i === activeIndex}
                onMouseDown={(e) => { e.preventDefault(); select(s) }}
                className={`w-full text-left px-3 py-2 transition-colors flex items-baseline justify-between gap-3 ${
                  i === activeIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'
                }`}
              >
                <span className="truncate">{s.name}</span>
                {s.kcal != null && (
                  <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">{Math.round(s.kcal)} kcal/100 g</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
