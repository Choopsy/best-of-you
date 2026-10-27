'use client'

import { useEffect } from 'react'

/**
 * Installe le service worker (production seulement) et lui demande, une fois par
 * ouverture de l'appli, de garder une copie fraîche de la liste de courses.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then(() => navigator.serviceWorker.ready)
      .then((reg) => {
        let warmed = false
        try { warmed = sessionStorage.getItem('equilibre:courses-copie') === '1' } catch { /* rien */ }
        if (warmed || !navigator.onLine) return
        reg.active?.postMessage({ type: 'warm-courses' })
        try { sessionStorage.setItem('equilibre:courses-copie', '1') } catch { /* rien */ }
      })
      .catch(() => { /* sans service worker, l'appli marche quand même en ligne */ })
  }, [])
  return null
}

/** À la déconnexion : efface la copie de la liste gardée sur le téléphone. */
export function ClearOfflineData() {
  useEffect(() => {
    try {
      for (const k of Object.keys(localStorage)) if (k.startsWith('equilibre:courses:')) localStorage.removeItem(k)
      sessionStorage.removeItem('equilibre:courses-copie')
    } catch { /* rien */ }
    if ('caches' in window) caches.delete('equilibre-pages-v1').catch(() => {})
    navigator.serviceWorker?.controller?.postMessage({ type: 'clear' })
  }, [])
  return null
}
