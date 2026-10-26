import { Leaf } from 'lucide-react'
import { APP_NAME } from '@/lib/brand'

export function AuthHeader({ subtitle }: { subtitle?: string }) {
  return (
    <div className="text-center space-y-2">
      <Leaf className="mx-auto h-10 w-10 text-primary" />
      <h1 className="text-2xl font-bold tracking-tight">{APP_NAME}</h1>
      {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  )
}

export function AuthAlerts({ error, message }: { error?: string; message?: string }) {
  return (
    <>
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
    </>
  )
}
