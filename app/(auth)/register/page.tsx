import Link from 'next/link'
import { ChefHat, Lock } from 'lucide-react'

export default function RegisterPage() {
  return (
    <div className="w-full max-w-sm space-y-8">
      <div className="text-center space-y-2">
        <ChefHat className="mx-auto h-10 w-10 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">Carnet de famille</h1>
      </div>

      <div className="flex flex-col items-center gap-3 rounded-2xl border bg-muted/40 px-6 py-8 text-center">
        <Lock className="h-8 w-8 text-muted-foreground" />
        <p className="font-medium">Inscription sur invitation uniquement</p>
        <p className="text-sm text-muted-foreground">
          Cette application est réservée à la famille. Contacte l&apos;administrateur pour obtenir un accès.
        </p>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Tu as déjà un compte ?{' '}
        <Link
          href="/login"
          className="font-medium text-foreground underline underline-offset-4"
        >
          Se connecter
        </Link>
      </p>
    </div>
  )
}
