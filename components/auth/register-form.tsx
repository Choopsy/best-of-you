'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SubmitButton } from './submit-button'
import { signUp } from '@/actions/auth'

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
  const [privacy, setPrivacy] = useState(false)

  const allRulesValid = RULES.every((r) => r.test(password))
  const confirmMatches = confirm.length > 0 && password === confirm
  const canSubmit = allRulesValid && confirmMatches && privacy

  return (
    <form action={signUp} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="full_name">Prénom et nom</Label>
        <Input
          id="full_name"
          name="full_name"
          type="text"
          autoComplete="name"
          required
          placeholder="Camille Martin"
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
          placeholder="toi@exemple.fr"
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
                    ok ? 'text-sage' : 'text-muted-foreground'
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
                ? 'border-sage focus-visible:ring-sage/20'
                : 'border-destructive focus-visible:ring-destructive/20'
              : ''
          }
        />
        {confirm.length > 0 && (
          <p
            className={`flex items-center gap-1.5 text-xs transition-colors duration-150 ${
              confirmMatches ? 'text-sage' : 'text-destructive'
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

      <label className="flex items-start gap-3 rounded-lg border bg-muted/40 px-3 py-3 text-sm leading-snug">
        <input type="checkbox" name="privacy" checked={privacy} onChange={(e) => setPrivacy(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--primary)]" required />
        <span>
          J&apos;ai lu la{' '}
          <Link href="/confidentialite" target="_blank" className="font-medium underline underline-offset-4">politique de confidentialité</Link>
          {' '}: comment mes données sont utilisées et comment les supprimer.
        </span>
      </label>

      <SubmitButton disabled={!canSubmit}>Créer mon compte</SubmitButton>
    </form>
  )
}
