import Link from 'next/link'
import { requestPasswordReset } from '@/actions/auth'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SubmitButton } from '@/components/auth/submit-button'
import { AuthAlerts, AuthHeader } from '@/components/auth/auth-header'

interface Props {
  searchParams: Promise<{ error?: string }>
}

export default async function ForgotPasswordPage({ searchParams }: Props) {
  const { error } = await searchParams

  return (
    <div className="w-full max-w-sm space-y-8">
      <AuthHeader subtitle="Reçois un lien pour choisir un nouveau mot de passe" />
      <AuthAlerts error={error} />
      <form action={requestPasswordReset} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required placeholder="toi@exemple.fr" />
        </div>
        <SubmitButton>Envoyer le lien</SubmitButton>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
          Retour à la connexion
        </Link>
      </p>
    </div>
  )
}
