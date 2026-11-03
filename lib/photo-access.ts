import type { SupabaseClient } from '@supabase/supabase-js'

export interface PhotoStatus {
  /** Compte activé à la main (photo_access) */
  enabled: boolean
  /** Accord donné pour l'envoi de la photo à Anthropic */
  consented: boolean
  /** Analyses encore possibles aujourd'hui (jour de Paris) */
  remaining: number
}

/** État de la photo du repas pour l'utilisateur connecté ; « pas d'accès » si la base ne répond pas. */
export async function getPhotoStatus(supabase: SupabaseClient): Promise<PhotoStatus> {
  const { data } = await supabase.rpc('photo_status').maybeSingle<PhotoStatus>()
  return data ? { enabled: !!data.enabled, consented: !!data.consented, remaining: Number(data.remaining) || 0 }
    : { enabled: false, consented: false, remaining: 0 }
}
