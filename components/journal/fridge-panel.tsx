'use client'

import { Check, Refrigerator } from 'lucide-react'
import { proposalText, type FridgeProposal, type FridgeUse } from '@/lib/fridge-use'

export interface FridgeChoice { use: boolean; finish: boolean }

/** Choix confirmés → retraits envoyés avec l'ajout au journal */
export function fridgeUses(proposals: FridgeProposal[], choices: Record<string, FridgeChoice>): FridgeUse[] {
  return proposals
    .filter((p) => choices[p.itemId]?.use ?? true)
    .map((p) => ({ itemId: p.itemId, amount: p.amount, finish: choices[p.itemId]?.finish ?? false }))
}

/**
 * « Pris dans le frigo » : coché par défaut, la personne peut décocher (mangé ailleurs).
 * Quand la quantité ne se convertit pas (1 boîte, 150 g mangés), on demande s'il en reste.
 */
export function FridgePanel({ proposals, choices, onChange }: {
  proposals: FridgeProposal[]
  choices: Record<string, FridgeChoice>
  onChange: (itemId: string, choice: FridgeChoice) => void
}) {
  if (!proposals.length) return null
  return (
    <section aria-label="Pris dans le frigo" className="space-y-2 rounded-2xl bg-muted px-3 py-3">
      <p className="flex items-center gap-2 px-1 text-sm font-semibold">
        <Refrigerator className="h-4 w-4 text-sage" aria-hidden="true" /> Pris dans le frigo
      </p>
      <ul className="space-y-1.5">
        {proposals.map((p) => {
          const c = choices[p.itemId] ?? { use: true, finish: false }
          const ask = p.amount == null
          return (
            <li key={p.itemId} className="rounded-xl bg-card px-2 py-1.5">
              <button type="button" role="checkbox" aria-checked={c.use} onClick={() => onChange(p.itemId, { ...c, use: !c.use })}
                className="flex min-h-11 w-full items-center gap-3 px-1 text-left">
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${c.use ? 'border-sage bg-sage text-background' : 'border-input'}`}>
                  {c.use && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{p.name}</span>
                  <span className="block text-xs text-muted-foreground">{ask ? (c.finish ? 'Retiré du frigo' : 'Il en reste ?') : proposalText(p)}</span>
                </span>
              </button>
              {ask && c.use && (
                <div role="radiogroup" aria-label={`Reste-t-il du ${p.name} ?`} className="grid grid-cols-2 gap-1.5 px-1 pb-1">
                  {[{ finish: false, label: 'Il en reste' }, { finish: true, label: 'C\'est fini' }].map((o) => (
                    <button key={o.label} type="button" role="radio" aria-checked={c.finish === o.finish}
                      onClick={() => onChange(p.itemId, { use: true, finish: o.finish })}
                      className={`min-h-10 rounded-full text-xs font-semibold ${c.finish === o.finish ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
                      {o.label}
                    </button>
                  ))}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
