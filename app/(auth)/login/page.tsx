import { ChefHat } from 'lucide-react'
import { signIn } from '@/actions/auth'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SubmitButton } from '@/components/auth/submit-button'

interface Props {
  searchParams: Promise<{ error?: string; message?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  const { error, message } = await searchParams

  return (
    <div className="w-full max-w-sm space-y-8">
      <div className="text-center space-y-2">
        <ChefHat className="mx-auto h-10 w-10 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">Carnet de famille</h1>
        <p className="text-sm text-muted-foreground">
          Connecte-toi pour accéder aux recettes
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {message && (
        <div className="bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-3 rounded-lg">
          {message}
        </div>
      )}

      <form action={signIn} className="space-y-4">
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
            autoComplete="current-password"
            required
            placeholder="••••••••"
          />
        </div>
        <SubmitButton>Se connecter</SubmitButton>
      </form>

    </div>
  )
}
