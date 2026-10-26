import { ChefHat } from 'lucide-react'
import { setPassword } from '@/actions/auth'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SubmitButton } from '@/components/auth/submit-button'

interface Props {
  searchParams: Promise<{ error?: string }>
}

export default async function SetPasswordPage({ searchParams }: Props) {
  const { error } = await searchParams

  return (
    <div className="w-full max-w-sm space-y-8">
      <div className="text-center space-y-2">
        <ChefHat className="mx-auto h-10 w-10 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">Bienvenue !</h1>
        <p className="text-sm text-muted-foreground">
          Choisis ton mot de passe pour accéder au carnet de famille.
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <form action={setPassword} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">Mot de passe</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            placeholder="••••••••"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm_password">Confirmer le mot de passe</Label>
          <Input
            id="confirm_password"
            name="confirm_password"
            type="password"
            autoComplete="new-password"
            required
            placeholder="••••••••"
          />
        </div>
        <SubmitButton>Définir mon mot de passe</SubmitButton>
      </form>
    </div>
  )
}
