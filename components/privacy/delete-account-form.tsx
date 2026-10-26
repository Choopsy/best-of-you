'use client'

import { useState } from 'react'
import { SubmitButton } from '@/components/auth/submit-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { deleteAccount } from '@/actions/privacy'

export function DeleteAccountForm() {
  const [text, setText] = useState('')
  const ok = text.trim().toUpperCase() === 'SUPPRIMER'
  return (
    <form action={deleteAccount} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="confirm-delete">Pour confirmer, écris SUPPRIMER</Label>
        <Input id="confirm-delete" name="confirm" autoComplete="off" autoCapitalize="characters" spellCheck={false}
          value={text} onChange={(e) => setText(e.target.value)} placeholder="SUPPRIMER" />
      </div>
      <SubmitButton disabled={!ok} className="w-full bg-destructive text-white hover:bg-destructive/90">
        Supprimer définitivement mon compte
      </SubmitButton>
    </form>
  )
}
