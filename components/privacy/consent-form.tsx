'use client'

import { useState } from 'react'
import { HealthConsentField } from './health-consent'
import { SubmitButton } from '@/components/auth/submit-button'

export function ConsentForm({ action }: { action: (formData: FormData) => Promise<void> }) {
  const [checked, setChecked] = useState(false)
  return (
    <form action={action} className="space-y-4">
      <HealthConsentField checked={checked} onChange={setChecked} />
      <SubmitButton disabled={!checked}>Donner mon accord</SubmitButton>
    </form>
  )
}
