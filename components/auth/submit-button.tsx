'use client'

import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'

interface Props {
  children: React.ReactNode
  disabled?: boolean
  className?: string
}

export function SubmitButton({ children, disabled, className = 'w-full' }: Props) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className={className} disabled={pending || disabled}>
      {pending ? 'Chargement...' : children}
    </Button>
  )
}
