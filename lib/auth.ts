import { cache } from 'react'
import { createClient } from './supabase/server'

export interface SessionUser {
  id: string
  email: string | null
  /** Présentation de l'appli déjà vue (métadonnées du compte) */
  tourDone: boolean
}

/**
 * Utilisateur connecté, pour les pages serveur.
 *
 * - getClaims() vérifie le jeton de session localement (signature asymétrique de
 *   Supabase, clés publiques mises en cache) : pas d'aller-retour réseau vers le
 *   serveur d'authentification à chaque page, contrairement à getUser().
 * - cache() : un seul calcul par requête, même si le layout et la page l'appellent.
 */
export const getSession = cache(async () => {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  const user: SessionUser | null = claims?.sub
    ? {
        id: claims.sub,
        email: typeof claims.email === 'string' ? claims.email : null,
        tourDone: (claims.user_metadata as Record<string, unknown> | undefined)?.tour_done === true,
      }
    : null
  return { supabase, user }
})
