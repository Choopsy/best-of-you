'use client'

import { useTransition } from 'react'
import { User, UserMinus, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  AlertDialog, AlertDialogCancel, AlertDialogClose, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { addCategoryMember, removeCategoryMember } from '@/actions/categories'

interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
}

interface Props {
  categoryId: string
  members: Profile[]
  availableFriends: Profile[]
}

function Avatar({ url, name }: { url: string | null; name: string | null }) {
  return url ? (
    <img src={url} alt="" className="h-8 w-8 rounded-full object-cover shrink-0" />
  ) : (
    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
      <User className="h-3.5 w-3.5 text-muted-foreground" />
    </div>
  )
}

function MemberRow({ categoryId, profile, action }: { categoryId: string; profile: Profile; action: 'remove' | 'add' }) {
  const [isPending, startTransition] = useTransition()

  return (
    <li className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <Avatar url={profile.avatar_url} name={profile.full_name} />
        <span className="text-sm font-medium truncate">{profile.full_name ?? 'Anonyme'}</span>
      </div>
      {action === 'remove' ? (
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                disabled={isPending}
              />
            }
          >
            <UserMinus className="h-4 w-4" />
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Retirer l&apos;accès ?</AlertDialogTitle>
              <AlertDialogDescription>
                {profile.full_name ?? 'Cet utilisateur'} n&apos;aura plus accès à cette catégorie.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogClose
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => startTransition(async () => { await removeCategoryMember(categoryId, profile.id) })}
              >
                Retirer
              </AlertDialogClose>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={isPending}
          onClick={() => startTransition(async () => { await addCategoryMember(categoryId, profile.id) })}
        >
          <UserPlus className="h-3.5 w-3.5 mr-1.5" />
          Ajouter
        </Button>
      )}
    </li>
  )
}

export function CategoryMemberManager({ categoryId, members, availableFriends }: Props) {
  return (
    <div className="space-y-4">
      <Separator />
      <div className="space-y-3">
        <p className="text-sm font-semibold">Membres ({members.length})</p>
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun membre pour l'instant.</p>
        ) : (
          <ul className="space-y-3">
            {members.map((m) => (
              <MemberRow key={m.id} categoryId={categoryId} profile={m} action="remove" />
            ))}
          </ul>
        )}
      </div>

      {availableFriends.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-muted-foreground">Ajouter un ami</p>
          <ul className="space-y-3">
            {availableFriends.map((f) => (
              <MemberRow key={f.id} categoryId={categoryId} profile={f} action="add" />
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
