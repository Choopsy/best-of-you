import { setPassword } from '@/actions/auth'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SubmitButton } from '@/components/auth/submit-button'
import { AuthAlerts, AuthHeader } from '@/components/auth/auth-header'

interface Props {
  searchParams: Promise<{ error?: string }>
}

export default async function SetPasswordPage({ searchParams }: Props) {
  const { error } = await searchParams

  return (
    <div className="w-full max-w-sm space-y-8">
      <AuthHeader subtitle="Choisis ton nouveau mot de passe (8 caractères minimum)." />
      <AuthAlerts error={error} />

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
