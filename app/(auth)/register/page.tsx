import Link from 'next/link'
import { RegisterForm } from '@/components/auth/register-form'
import { AuthAlerts, AuthHeader } from '@/components/auth/auth-header'

interface Props {
  searchParams: Promise<{ error?: string }>
}

export default async function RegisterPage({ searchParams }: Props) {
  const { error } = await searchParams

  return (
    <div className="w-full max-w-sm space-y-8">
      <AuthHeader subtitle="Crée ton compte en 30 secondes" />
      <AuthAlerts error={error} />
      <RegisterForm />
      <p className="text-center text-sm text-muted-foreground">
        Tu as déjà un compte ?{' '}
        <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
          Se connecter
        </Link>
      </p>
    </div>
  )
}
