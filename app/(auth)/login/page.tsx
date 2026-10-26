import Link from 'next/link'
import { signIn } from '@/actions/auth'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SubmitButton } from '@/components/auth/submit-button'
import { AuthAlerts, AuthHeader } from '@/components/auth/auth-header'
import { APP_TAGLINE } from '@/lib/brand'

interface Props {
  searchParams: Promise<{ error?: string; message?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  const { error, message } = await searchParams

  return (
    <div className="w-full max-w-sm space-y-8">
      <AuthHeader subtitle={APP_TAGLINE} />
      <AuthAlerts error={error} message={message} />

      <form action={signIn} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required placeholder="toi@exemple.fr" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Mot de passe</Label>
            <Link href="/forgot-password" className="text-xs text-muted-foreground underline underline-offset-4">
              Mot de passe oublié ?
            </Link>
          </div>
          <Input id="password" name="password" type="password" autoComplete="current-password" required placeholder="••••••••" />
        </div>
        <SubmitButton>Se connecter</SubmitButton>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Pas encore de compte ?{' '}
        <Link href="/register" className="font-medium text-foreground underline underline-offset-4">
          Créer un compte
        </Link>
      </p>
      <p className="text-center text-xs text-muted-foreground">
        <Link href="/confidentialite" className="underline underline-offset-4">Confidentialité et données</Link>
      </p>
    </div>
  )
}
