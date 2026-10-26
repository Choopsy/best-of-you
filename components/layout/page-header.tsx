import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function PageHeader({ title, back, children }: { title: React.ReactNode; back?: string; children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 md:top-14 z-10 bg-background border-b px-2 py-2 flex items-center justify-between gap-2 min-h-13">
      <div className="flex items-center gap-1 min-w-0">
        {back && (
          <Link href={back}>
            <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Retour">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
        )}
        <h1 className={`font-semibold truncate ${back ? '' : 'pl-2'}`}>{title}</h1>
      </div>
      {children && <div className="flex items-center gap-1 shrink-0">{children}</div>}
    </header>
  )
}

export function Notice({ error, message }: { error?: string; message?: string }) {
  if (!error && !message) return null
  return error ? (
    <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-3 rounded-lg">{error}</div>
  ) : (
    <div className="bg-sage/15 border border-sage/30 text-foreground text-sm px-4 py-3 rounded-lg">{message}</div>
  )
}
