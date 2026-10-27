'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Keyboard, RotateCcw } from 'lucide-react'
import { Portal } from '@/components/ui/portal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Props {
  onDetected: (code: string) => void
  onClose: () => void
}

/**
 * Lecteur de code-barres plein écran.
 * Bonnes pratiques suivies : cadre horizontal au centre (codes 1D), seulement les
 * formats alimentaires (EAN-13/8, UPC), vibration à la lecture, et saisie manuelle
 * de secours (code abîmé, caméra refusée).
 */
type Status = 'starting' | 'scanning' | 'denied' | 'unavailable' | 'stuck'

/** Au-delà, on considère que la caméra ne répond pas et on propose de réessayer. */
const CAMERA_TIMEOUT_MS = 10_000

export function BarcodeScanner({ onDetected, onClose }: Props) {
  // L'élément vidéo est rendu dans un portail, donc après le premier rendu :
  // on attend qu'il existe vraiment (ref « état ») avant d'ouvrir la caméra.
  const [video, setVideo] = useState<HTMLVideoElement | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [manual, setManual] = useState(false)
  const [code, setCode] = useState('')
  const [status, setStatus] = useState<Status>('starting')
  // Le parent peut recréer ses callbacks à chaque rendu : on ne relance pas la caméra pour autant
  const detectedRef = useRef(onDetected)
  useEffect(() => { detectedRef.current = onDetected }, [onDetected])

  useEffect(() => {
    if (!video) return
    let cancelled = false
    let pausedInBackground = false
    let stream: MediaStream | null = null
    let controls: { stop: () => void } | null = null
    setStatus('starting')

    // On garde la main sur le flux : il est toujours coupé, même si l'on ferme pendant l'ouverture
    const release = () => {
      controls?.stop()
      controls = null
      stream?.getTracks().forEach((t) => t.stop())
      stream = null
      video.srcObject = null
    }
    const watchdog = setTimeout(() => {
      if (!cancelled) { setStatus('stuck'); setManual(true) }
    }, CAMERA_TIMEOUT_MS)

    ;(async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        clearTimeout(watchdog); setStatus('unavailable'); setManual(true); return
      }
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
          audio: false,
        })
        if (cancelled) { s.getTracks().forEach((t) => t.stop()); return }
        stream = s
        video.srcObject = s
        await video.play()
        if (cancelled) return

        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
          import('@zxing/browser'),
          import('@zxing/library'),
        ])
        if (cancelled) return
        const hints = new Map()
        // Pas d'UPC-E : ce format court se « lit » souvent par erreur dans un bout de code EAN-13
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A])
        const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 120 })
        // Un code n'est accepté que lu 2 fois de suite à l'identique : évite les lectures partielles
        let candidate: string | null = null
        let candidateAt = 0
        const c = await reader.decodeFromVideoElement(video, (result) => {
          if (!result || cancelled) return
          const text = result.getText()
          const now = Date.now()
          if (text !== candidate || now - candidateAt > 1500) { candidate = text; candidateAt = now; return }
          cancelled = true
          clearTimeout(watchdog)
          navigator.vibrate?.(60)
          release()
          detectedRef.current(text)
        })
        if (cancelled) { c.stop(); return }
        controls = c
        clearTimeout(watchdog)
        setStatus('scanning')
      } catch (e) {
        clearTimeout(watchdog)
        release()
        if (cancelled) return
        const denied = e instanceof DOMException && (e.name === 'NotAllowedError' || e.name === 'SecurityError')
        setStatus(denied ? 'denied' : 'unavailable')
        setManual(true)
      }
    })()

    // Appli mise en arrière-plan : on coupe la caméra, et on la rouvre au retour
    const onVisibility = () => {
      if (document.hidden && !cancelled) { pausedInBackground = true; cancelled = true; clearTimeout(watchdog); release() }
      else if (!document.hidden && pausedInBackground) setAttempt((a) => a + 1)
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      clearTimeout(watchdog)
      document.removeEventListener('visibilitychange', onVisibility)
      release()
    }
  }, [video, attempt])

  const submitManual = (e: React.FormEvent) => {
    e.preventDefault()
    const c = code.replace(/\D/g, '')
    if (c.length >= 8 && c.length <= 14) onDetected(c)
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-[60] bg-black text-white flex flex-col" role="dialog" aria-modal="true" aria-label="Scanner un code-barres">
        <div className="relative flex-1 overflow-hidden">
          <video ref={setVideo} className="absolute inset-0 h-full w-full object-cover" playsInline muted aria-hidden="true" />
          {/* Cadre horizontal centré : là où viser */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
            <div className="relative h-32 w-[82%] max-w-sm rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
              <span className="absolute -left-0.5 -top-0.5 h-6 w-6 rounded-tl-2xl border-l-4 border-t-4 border-white" />
              <span className="absolute -right-0.5 -top-0.5 h-6 w-6 rounded-tr-2xl border-r-4 border-t-4 border-white" />
              <span className="absolute -left-0.5 -bottom-0.5 h-6 w-6 rounded-bl-2xl border-l-4 border-b-4 border-white" />
              <span className="absolute -right-0.5 -bottom-0.5 h-6 w-6 rounded-br-2xl border-r-4 border-b-4 border-white" />
              {status === 'scanning' && <span className="absolute left-3 right-3 top-1/2 h-0.5 bg-[var(--terracotta)] animate-pulse" />}
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer le scanner"
            className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] h-11 w-11 rounded-full bg-black/60 flex items-center justify-center">
            <X className="h-5 w-5" />
          </button>
          <p className="absolute left-0 right-0 top-[18%] text-center text-[15px] font-bold px-6" aria-live="polite">
            {status === 'starting' && 'Ouverture de la caméra…'}
            {status === 'scanning' && 'Vise le code-barres du produit'}
            {status === 'denied' && 'Accès à la caméra refusé. Tu peux taper le code à la main.'}
            {status === 'unavailable' && 'Caméra indisponible. Tape le code inscrit sous les barres.'}
            {status === 'stuck' && 'La caméra ne répond pas.'}
          </p>
          {(status === 'stuck' || status === 'unavailable') && (
            <div className="absolute left-0 right-0 top-[18%] mt-10 flex justify-center">
              <button type="button" onClick={() => setAttempt((a) => a + 1)}
                className="flex min-h-11 items-center gap-2 rounded-full bg-white/15 px-5 text-sm font-bold">
                <RotateCcw className="h-4 w-4" /> Réessayer
              </button>
            </div>
          )}
        </div>

        <div className="bg-[#1F1713] px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-3">
          {manual ? (
            <form onSubmit={submitManual} className="space-y-2">
              <label htmlFor="manual-code" className="text-sm font-bold">Code-barres (chiffres sous les barres)</label>
              <div className="flex gap-2">
                <Input id="manual-code" inputMode="numeric" autoComplete="off" autoFocus value={code}
                  onChange={(e) => setCode(e.target.value)} placeholder="3017620422003"
                  className="h-12 rounded-2xl bg-white/10 text-white border-white/20 placeholder:text-white/40" />
                <Button type="submit" className="h-12 rounded-2xl" disabled={code.replace(/\D/g, '').length < 8}>OK</Button>
              </div>
            </form>
          ) : (
            <button type="button" onClick={() => setManual(true)}
              className="mx-auto flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-bold text-white/85">
              <Keyboard className="h-4 w-4" /> Saisir le code à la main
            </button>
          )}
        </div>
      </div>
    </Portal>
  )
}
