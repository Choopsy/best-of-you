'use client'

import { useState, useActionState } from 'react'
import { KeyRound } from 'lucide-react'
import { resetUserPassword } from '@/actions/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SubmitButton } from '@/components/auth/submit-button'

export function ChangePasswordForm({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false)
  const action = resetUserPassword.bind(null, userId)
  const [state, dispatch] = useActionState(action, {})

  if (!open) {
    return (
      <Button variant="outline" className="w-full gap-2" onClick={() => setOpen(true)}>
        <KeyRound className="h-4 w-4" />
        Changer le mot de passe
      </Button>
    )
  }

  if (state.success) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-5 space-y-3">
        <p className="text-sm text-green-800 font-medium">Mot de passe mis à jour avec succès.</p>
        <Button variant="outline" className="w-full" onClick={() => setOpen(false)}>
          Fermer
        </Button>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border p-5 space-y-4">
      <h2 className="font-semibold">Changer le mot de passe</h2>
      <form action={dispatch} className="space-y-3">
        {state.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="password">Nouveau mot de passe</Label>
          <Input id="password" name="password" type="password" placeholder="8 caractères minimum" required autoFocus />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm">Confirmer le mot de passe</Label>
          <Input id="confirm" name="confirm" type="password" placeholder="Répéter le mot de passe" required />
        </div>
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <SubmitButton className="flex-1">Enregistrer</SubmitButton>
        </div>
      </form>
    </div>
  )
}
