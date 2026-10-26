'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingBasket } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { generateShoppingList } from '@/actions/shopping'

export function GenerateButton({ from, to, label = 'Faire la liste de courses', variant = 'default' }: {
  from: string; to: string; label?: string; variant?: 'default' | 'outline'
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  return (
    <div className="space-y-2">
      <Button variant={variant} className="w-full h-12 rounded-2xl gap-2" disabled={pending}
        onClick={() => start(async () => {
          setError(null)
          const res = await generateShoppingList(from, to)
          if (res.error) { setError(res.error); return }
          router.push('/courses')
        })}>
        <ShoppingBasket className="h-4 w-4" /> {pending ? 'Calcul en cours…' : label}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
