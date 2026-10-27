import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronRight, Target, Users, Library, Heart, ShieldCheck } from 'lucide-react'
import { getSession } from '@/lib/auth'
import { Notice, PageHeader } from '@/components/layout/page-header'
import { ProfileForm } from '@/components/profile/profile-form'
import { signOut } from '@/actions/auth'
import { Button } from '@/components/ui/button'
import { ThemeSwitcher } from '@/components/theme/theme-switcher'
import { APP_MEANING } from '@/lib/brand'

interface Props {
  searchParams: Promise<{ error?: string; message?: string }>
}

export default async function ProfilePage({ searchParams }: Props) {
  const { error, message } = await searchParams
  const { supabase, user } = await getSession()
  if (!user) redirect('/login')

  const [{ data: profile }, { count: pending }] = await Promise.all([
    supabase.from('profiles').select('full_name, avatar_url').eq('id', user.id).maybeSingle(),
    supabase.from('friendships').select('*', { count: 'exact', head: true }).eq('addressee_id', user.id).eq('status', 'pending'),
  ])

  const links = [
    { href: '/profile/health', icon: Target, label: 'Mes objectifs et mon profil santé' },
    { href: '/friends', icon: Users, label: 'Amis', badge: pending ?? 0 },
    { href: '/collections', icon: Library, label: 'Mes collections' },
    { href: '/favorites', icon: Heart, label: 'Recettes aimées' },
    { href: '/profile/donnees', icon: ShieldCheck, label: 'Mes données et confidentialité' },
  ]

  return (
    <div className="min-h-svh pb-24">
      <PageHeader title="Mon profil" />
      <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
        <Notice error={error} message={message} />

        <section className="space-y-2">
          <h2 className="text-lg">Apparence</h2>
          <ThemeSwitcher />
        </section>

        <nav className="rounded-3xl bg-card divide-y overflow-hidden shadow-[0_1px_0_var(--border)]">
          {links.map(({ href, icon: Icon, label, badge }) => (
            <Link key={href} href={href} className="flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors">
              <Icon className="h-4 w-4 text-primary" />
              <span className="flex-1 text-sm font-medium">{label}</span>
              {badge ? (
                <span className="min-w-5 h-5 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center px-1.5">{badge}</span>
              ) : null}
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </nav>

        <ProfileForm fullName={profile?.full_name ?? ''} email={user.email ?? ''} avatarUrl={profile?.avatar_url ?? ''} />

        <form action={signOut}>
          <Button variant="outline" type="submit" className="w-full">Se déconnecter</Button>
        </form>

        <p className="px-4 pt-2 text-center text-xs italic text-muted-foreground">{APP_MEANING}</p>
      </div>
    </div>
  )
}
