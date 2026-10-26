'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, NotebookPen, BookOpen, Users, User, Leaf, Plus } from 'lucide-react'
import { signOut } from '@/actions/auth'
import { Button } from '@/components/ui/button'
import { NewItemSheet } from './new-item-sheet'
import { APP_NAME } from '@/lib/brand'

interface Props {
  avatarUrl: string | null
  fullName: string | null
  pendingFriendsCount: number
}

const DESKTOP_ITEMS = [
  { href: '/', icon: Home, label: 'Accueil' },
  { href: '/journal', icon: NotebookPen, label: 'Journal' },
  { href: '/recipes', icon: BookOpen, label: 'Recettes' },
  { href: '/friends', icon: Users, label: 'Amis' },
]

export function NavContent({ avatarUrl, fullName, pendingFriendsCount }: Props) {
  const pathname = usePathname()
  // Pas de barre de navigation pendant le premier remplissage du profil
  if (pathname === '/onboarding') return null

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href))
  const badge = pendingFriendsCount > 0

  const MobileLink = ({ href, icon: Icon, label, dot }: { href: string; icon: typeof Home; label: string; dot?: boolean }) => {
    const active = isActive(href)
    return (
      <Link href={href} className="flex flex-col items-center gap-0.5 py-2 px-3">
        <span className="relative inline-flex">
          <Icon className={`h-5 w-5 transition-colors ${active ? 'text-primary' : 'text-muted-foreground'}`} strokeWidth={active ? 2.5 : 1.5} />
          {dot && <span className="absolute -top-0.5 -right-1 h-2 w-2 rounded-full bg-red-500" />}
        </span>
        <span className={`text-[10px] font-medium transition-colors ${active ? 'text-primary' : 'text-muted-foreground'}`}>{label}</span>
      </Link>
    )
  }

  return (
    <>
      {/* ── Ordinateur : barre du haut ── */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 z-40 h-14 bg-background/90 backdrop-blur-sm border-b items-center px-6 gap-4">
        <Link href="/" className="flex items-center gap-2 font-bold shrink-0 mr-2">
          <Leaf className="h-5 w-5 text-primary" />
          {APP_NAME}
        </Link>

        <div className="flex items-center gap-1 flex-1">
          {DESKTOP_ITEMS.map(({ href, icon: Icon, label }) => (
            <Link key={href} href={href}>
              <Button variant={isActive(href) ? 'secondary' : 'ghost'} size="sm" className="gap-1.5">
                <Icon className="h-4 w-4" />
                {label}
                {href === '/friends' && badge && (
                  <span className="ml-0.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                    {pendingFriendsCount > 9 ? '9+' : pendingFriendsCount}
                  </span>
                )}
              </Button>
            </Link>
          ))}
        </div>

        <Link href="/journal?add=1">
          <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Ajouter un repas</Button>
        </Link>
        <Link href="/profile" aria-label="Mon profil">
          {avatarUrl ? (
            <img src={avatarUrl} alt={fullName ?? ''} className="h-8 w-8 rounded-full object-cover border border-border" />
          ) : (
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center border border-border">
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
        </Link>
        <form action={signOut}>
          <Button variant="ghost" size="sm" type="submit" className="text-muted-foreground text-xs shrink-0">Déconnexion</Button>
        </form>
      </nav>

      {/* ── Téléphone : barre du bas ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-background/90 backdrop-blur-sm border-t flex items-center">
        <div className="flex flex-1 items-center justify-around">
          <MobileLink href="/" icon={Home} label="Accueil" />
          <MobileLink href="/journal" icon={NotebookPen} label="Journal" />
        </div>
        <NewItemSheet />
        <div className="flex flex-1 items-center justify-around">
          <MobileLink href="/recipes" icon={BookOpen} label="Recettes" />
          <MobileLink href="/profile" icon={User} label="Profil" dot={badge} />
        </div>
      </nav>
    </>
  )
}
