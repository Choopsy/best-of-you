import { Badge } from '@/components/ui/badge'
import { DIFFICULTY_LABELS, type Difficulty } from '@/lib/types'

const STYLES: Record<Difficulty, string> = {
  easy: 'bg-green-100 text-green-700 hover:bg-green-100 border-green-200',
  medium: 'bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200',
  hard: 'bg-red-100 text-red-700 hover:bg-red-100 border-red-200',
}

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <Badge variant="outline" className={STYLES[difficulty]}>
      {DIFFICULTY_LABELS[difficulty]}
    </Badge>
  )
}
