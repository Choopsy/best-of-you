import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const rawNext = searchParams.get('next') ?? '/'
  // Uniquement des chemins internes (évite les redirections vers un autre site)
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/'
  const target = type === 'recovery' ? '/set-password' : next

  const supabase = await createClient()

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${target}`)
  }

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    if (!error) return NextResponse.redirect(`${origin}${target}`)
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent('Lien de confirmation invalide ou expiré.')}`,
  )
}
