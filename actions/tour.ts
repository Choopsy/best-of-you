'use server'

import { createClient } from '@/lib/supabase/server'

/** La présentation a été vue : gardé dans le compte, pour ne pas la remontrer sur un autre appareil. */
export async function markTourDone(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.tour_done) return
  await supabase.auth.updateUser({ data: { tour_done: true } })
}
