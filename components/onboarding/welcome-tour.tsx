'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  Activity, ArrowRight, ChefHat, NotebookPen, PlusCircle, ScanBarcode, ShieldCheck, Users, X, type LucideIcon,
} from 'lucide-react'
import { markTourDone } from '@/actions/tour'
import { APP_NAME, APP_SIGNATURE } from '@/lib/brand'

interface Card {
  Icon: LucideIcon | null
  /** Couleur de la pastille de l'icône */
  tint: string
  title: string
  text: string
  points?: string[]
}

const CARDS: Card[] = [
  {
    Icon: null, tint: '',
    title: `Bienvenue sur ${APP_NAME}`,
    text: 'Ta cuisine, ce que tu manges et ta forme au même endroit. Voici le tour du propriétaire en une minute.',
  },
  {
    Icon: PlusCircle, tint: 'bg-primary text-primary-foreground',
    title: 'Le bouton +',
    text: 'Au centre de la barre du bas, sur toutes les pages. C\'est le raccourci pour tout ajouter :',
    points: ['un repas ou un produit scanné', 'une séance de sport ou ta pesée', 'un aliment au frigo, une recette'],
  },
  {
    Icon: NotebookPen, tint: 'bg-sage/20 text-sage',
    title: 'Le journal',
    text: 'Note ce que tu manges, les anneaux montrent où tu en es par rapport à tes objectifs du jour.',
    points: [
      'cherche un aliment (table Ciqual de l\'ANSES)',
      '« Récents » pour remettre un plat en un geste',
      'pas dans la liste ? crée-le, en grammes ou en portions',
    ],
  },
  {
    Icon: ScanBarcode, tint: 'bg-honey/25 text-foreground',
    title: 'Le scan',
    text: 'Scanne le code-barres d\'un produit : ses valeurs viennent d\'Open Food Facts. Inconnu ? Recopie l\'étiquette une fois, il est gardé pour la suite.',
    points: ['tes produits se retrouvent dans le journal et dans tes recettes'],
  },
  {
    Icon: ChefHat, tint: 'bg-secondary text-secondary-foreground',
    title: 'La cuisine',
    text: 'Quatre onglets qui travaillent ensemble :',
    points: [
      'Recettes : la nutrition par portion est calculée toute seule',
      'Frigo : les dates de péremption, avec une alerte avant',
      'Semaine : tu prévois tes repas',
      'Courses : la liste se fait depuis la semaine, moins ce qu\'il y a au frigo, triée par rayon et utilisable sans réseau',
    ],
  },
  {
    Icon: Users, tint: 'bg-sage/20 text-sage',
    title: 'À plusieurs',
    text: 'Invite ceux qui vivent avec toi dans ton foyer : frigo, semaine et courses deviennent communs. Ajoute des amis pour partager tes recettes.',
    points: ['ce que tu manges et ton poids restent privés, même dans le foyer'],
  },
  {
    Icon: Activity, tint: 'bg-honey/25 text-foreground',
    title: 'Forme et bilan',
    text: 'Note tes séances et tes pesées : la courbe montre la tendance, sans t\'affoler pour un jour. Chaque lundi, un bilan de ta semaine avec un conseil.',
  },
  {
    Icon: ShieldCheck, tint: 'bg-muted text-foreground',
    title: 'Tes données t\'appartiennent',
    text: 'Dans Profil > Mes données : tout télécharger, retirer ton accord santé ou supprimer ton compte. Ce tour se revoit aussi depuis le Profil.',
  },
]

const storageKey = (userId: string) => `dignis:tour:${userId}`

/**
 * Présentation de l'appli en cartes, au premier lancement (puis sur demande : /?tour=1).
 * « Déjà vue » est gardé dans le compte (pour les autres appareils) et dans le navigateur
 * (le jeton de session ne voit la mise à jour du compte qu'à son renouvellement).
 */
export function WelcomeTour({ userId, seen }: { userId: string; seen: boolean }) {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const forced = params.get('tour') === '1'
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)
  const track = useRef<HTMLDivElement>(null)
  const last = CARDS.length - 1

  useEffect(() => {
    let local = false
    try { local = localStorage.getItem(storageKey(userId)) === '1' } catch { /* navigation privée */ }
    if (forced || (!seen && !local)) { setOpen(true); setIndex(0) }
  }, [forced, seen, userId])

  // Pas de défilement de la page derrière
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  const close = () => {
    setOpen(false)
    try { localStorage.setItem(storageKey(userId), '1') } catch { /* tant pis */ }
    if (!seen) markTourDone().catch(() => {})
    if (forced) router.replace(pathname, { scroll: false })
  }

  const goTo = (i: number) => {
    const el = track.current
    if (!el) return
    const n = Math.max(0, Math.min(last, i))
    el.scrollTo({ left: n * el.clientWidth, behavior: 'smooth' })
    setIndex(n)
  }

  const onScroll = () => {
    const el = track.current
    if (el) setIndex(Math.round(el.scrollLeft / el.clientWidth))
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowRight') goTo(index + 1)
      else if (e.key === 'ArrowLeft') goTo(index - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }) // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/55" />
      <div role="dialog" aria-modal="true" aria-label={`Découvrir ${APP_NAME}`}
        className="relative flex w-full sm:max-w-md max-h-[100svh] flex-col rounded-t-3xl sm:rounded-3xl bg-card shadow-float pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-between px-5 pt-4">
          <p className="text-xs font-bold text-muted-foreground tabular-nums" aria-live="polite">{index + 1} / {CARDS.length}</p>
          <button type="button" onClick={close} className="flex h-10 items-center gap-1 rounded-full px-3 text-sm font-bold text-muted-foreground hover:bg-muted">
            Passer <X className="h-4 w-4" />
          </button>
        </div>

        <div ref={track} onScroll={onScroll}
          className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CARDS.map((c, i) => (
            <section key={c.title} aria-hidden={i !== index} aria-roledescription="carte"
              className="w-full shrink-0 snap-center px-6 pt-4 pb-2 min-h-[23rem] sm:min-h-[22rem] overflow-y-auto">
              {c.Icon ? (
                <span className={`flex h-16 w-16 items-center justify-center rounded-2xl ${c.tint}`}>
                  <c.Icon className="h-8 w-8" strokeWidth={1.8} />
                </span>
              ) : (
                <img src="/icons/icon-192.png" alt="" className="h-16 w-16 rounded-2xl" />
              )}
              <h2 className="mt-5 font-heading text-[26px] leading-tight">{c.title}</h2>
              {i === 0 && <p className="mt-1 font-heading text-lg italic text-primary">{APP_SIGNATURE}</p>}
              <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{c.text}</p>
              {c.points && (
                <ul className="mt-3 space-y-2">
                  {c.points.map((p) => (
                    <li key={p} className="flex gap-2.5 text-[15px] leading-snug">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 px-5 pt-3 pb-5">
          <div className="flex gap-1.5" role="tablist" aria-label="Cartes">
            {CARDS.map((c, i) => (
              <button key={c.title} type="button" role="tab" aria-selected={i === index} aria-label={`Carte ${i + 1} : ${c.title}`}
                onClick={() => goTo(i)}
                className="flex h-6 items-center justify-center">
                <span className={`block h-2 rounded-full transition-all ${i === index ? 'w-5 bg-primary' : 'w-2 bg-border'}`} />
              </button>
            ))}
          </div>
          {index < last ? (
            <button type="button" onClick={() => goTo(index + 1)}
              className="flex min-h-12 items-center gap-1.5 rounded-full bg-primary px-5 font-bold text-primary-foreground">
              Suivant <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button type="button" onClick={close}
              className="min-h-12 rounded-full bg-primary px-6 font-bold text-primary-foreground">
              C&apos;est parti
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
