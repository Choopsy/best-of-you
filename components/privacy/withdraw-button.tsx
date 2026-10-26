'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { SubmitButton } from '@/components/auth/submit-button'
import { withdrawHealthConsent } from '@/actions/privacy'

/** Retrait en deux temps : on montre ce qui sera effacé avant de confirmer. */
export function WithdrawButton() {
  const [asking, setAsking] = useState(false)
  if (!asking) {
    return <Button variant="outline" className="w-full" onClick={() => setAsking(true)}>Retirer mon accord</Button>
  }
  return (
    <form action={withdrawHealthConsent} className="space-y-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
      <p className="text-sm leading-relaxed">
        Ton profil santé, tes pesées, tes séances et ton journal alimentaire vont être <span className="font-bold">effacés définitivement</span>.
        Tes recettes, ton frigo et ton foyer restent.
      </p>
      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={() => setAsking(false)}>Annuler</Button>
        <SubmitButton className="flex-1 bg-destructive text-white hover:bg-destructive/90">Effacer</SubmitButton>
      </div>
    </form>
  )
}
