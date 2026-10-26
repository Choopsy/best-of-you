'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * Affiche son contenu directement dans <body>.
 * Indispensable pour les fenêtres « fixed » placées dans un en-tête avec backdrop-blur :
 * le flou crée un nouveau repère et enfermerait la fenêtre dans l'en-tête.
 */
export function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return mounted ? createPortal(children, document.body) : null
}
