'use client'

import { useState } from 'react'
import { Camera, User } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { SubmitButton } from '@/components/auth/submit-button'
import { updateProfile, changePassword } from '@/actions/profile'
import { ImagePicker } from '@/components/recipes/image-picker'

interface Props {
  fullName: string
  email: string
  avatarUrl: string
}

export function ProfileForm({ fullName, email, avatarUrl }: Props) {
  const [avatar, setAvatar] = useState(avatarUrl)
  const [name, setName] = useState(fullName)

  return (
    <div className="space-y-8">
      {/* Avatar */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          {avatar ? (
            <img src={avatar} alt={name} className="h-24 w-24 rounded-full object-cover border-2 border-border" />
          ) : (
            <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center border-2 border-border">
              <User className="h-10 w-10 text-muted-foreground" />
            </div>
          )}
        </div>
        <ImagePicker value={avatar} onChange={setAvatar} compact />
      </div>

      {/* Infos */}
      <form action={updateProfile} className="space-y-4">
        <input type="hidden" name="avatar_url" value={avatar} />
        <div className="space-y-2">
          <Label htmlFor="full_name">Nom complet</Label>
          <Input
            id="full_name"
            name="full_name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Marie Dupont"
          />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={email} disabled className="text-muted-foreground" />
        </div>
        <SubmitButton>Enregistrer le profil</SubmitButton>
      </form>

      <Separator />

      {/* Mot de passe */}
      <form action={changePassword} className="space-y-4">
        <h2 className="font-semibold">Changer le mot de passe</h2>
        <div className="space-y-2">
          <Label htmlFor="password">Nouveau mot de passe</Label>
          <Input id="password" name="password" type="password" autoComplete="new-password" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm_password">Confirmer</Label>
          <Input id="confirm_password" name="confirm_password" type="password" autoComplete="new-password" required />
        </div>
        <SubmitButton>Changer le mot de passe</SubmitButton>
      </form>
    </div>
  )
}
