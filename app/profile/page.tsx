import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { ProfileForm } from '@/components/profile/profile-form'

interface Props {
  searchParams: Promise<{ error?: string; message?: string }>
}

export default async function ProfilePage({ searchParams }: Props) {
  const { error, message } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-svh pb-8">
      <header className="sticky top-0 md:top-14 z-10 bg-background/80 backdrop-blur-sm border-b px-2 py-2 flex items-center gap-2">
        <Link href="/">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="font-semibold">Mon profil</h1>
      </header>

      <div className="px-4 py-6 max-w-lg mx-auto space-y-4">
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        {message && (
          <div className="bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-3 rounded-lg">
            {message}
          </div>
        )}

        <ProfileForm
          fullName={profile?.full_name ?? ''}
          email={user.email ?? ''}
          avatarUrl={profile?.avatar_url ?? ''}
        />
      </div>
    </div>
  )
}
