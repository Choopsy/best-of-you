'use client'

import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { inviteUser } from '@/actions/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SubmitButton } from '@/components/auth/submit-button'

export function InviteForm() {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <Button className="w-full gap-2" onClick={() => setOpen(true)}>
        <UserPlus className="h-4 w-4" />
        Inviter un membre
      </Button>
    )
  }

  return (
    <div className="rounded-2xl border p-5 space-y-4">
      <h2 className="font-semibold">Inviter un membre</h2>
      <form action={inviteUser} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="full_name">Prénom et nom</Label>
          <Input id="full_name" name="full_name" placeholder="Marie Dupont" required autoFocus />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" placeholder="marie@famille.fr" required />
        </div>
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <SubmitButton className="flex-1">Envoyer l&apos;invitation</SubmitButton>
        </div>
      </form>
    </div>
  )
}
