'use client'

import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SubmitButton } from './submit-button'

const RULES = [
  {
    id: 'length',
    label: '8 caractères minimum',
    test: (p: string) => p.length >= 8,
  },
  {
    id: 'uppercase',
    label: 'Une lettre majuscule',
    test: (p: string) => /[A-Z]/.test(p),
  },
  {
    id: 'number',
    label: 'Un chiffre',
    test: (p: string) => /[0-9]/.test(p),
  },
  {
    id: 'special',
    label: 'Un caractère spécial (!@#$…)',
    test: (p: string) => /[^A-Za-z0-9]/.test(p),
  },
]

export function RegisterForm() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  const allRulesValid = RULES.every((r) => r.test(password))
  const confirmMatches = confirm.length > 0 && password === confirm
  const canSubmit = allRulesValid && confirmMatches

  return (
    <form className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="full_name">Prénom et nom</Label>
        <Input
          id="full_name"
          name="full_name"
          type="text"
          autoComplete="name"
          required
          placeholder="Marie Dupont"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="marie@famille.fr"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Mot de passe</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />

        {password.length > 0 && (
          <ul className="mt-2 space-y-1.5 rounded-lg border bg-muted/40 px-3 py-2.5">
            {RULES.map((rule) => {
              const ok = rule.test(password)
              return (
                <li
                  key={rule.id}
                  className={`flex items-center gap-2 text-xs transition-colors duration-150 ${
                    ok ? 'text-green-600' : 'text-muted-foreground'
                  }`}
                >
                  {ok ? (
                    <Check className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <X className="h-3.5 w-3.5 shrink-0" />
                  )}
                  {rule.label}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm_password">Confirmer le mot de passe</Label>
        <Input
          id="confirm_password"
          name="confirm_password"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="••••••••"
          className={
            confirm.length > 0
              ? confirmMatches
                ? 'border-green-500 focus-visible:ring-green-500/20'
                : 'border-destructive focus-visible:ring-destructive/20'
              : ''
          }
        />
        {confirm.length > 0 && (
          <p
            className={`flex items-center gap-1.5 text-xs transition-colors duration-150 ${
              confirmMatches ? 'text-green-600' : 'text-destructive'
            }`}
          >
            {confirmMatches ? (
              <Check className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <X className="h-3.5 w-3.5 shrink-0" />
            )}
            {confirmMatches
              ? 'Les mots de passe correspondent'
              : 'Les mots de passe ne correspondent pas'}
          </p>
        )}
      </div>

      <SubmitButton disabled={!canSubmit}>Créer mon compte</SubmitButton>
    </form>
  )
}
