import { Badge } from '@/components/ui/badge'
import { DIFFICULTY_LABELS, type Difficulty } from '@/lib/types'

const STYLES: Record<Difficulty, string> = {
  easy: 'bg-sage/15 text-foreground hover:bg-sage/15 border-transparent',
  medium: 'bg-honey/20 text-foreground hover:bg-honey/20 border-transparent',
  hard: 'bg-terracotta/15 text-foreground hover:bg-terracotta/15 border-transparent',
}

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <Badge variant="outline" className={STYLES[difficulty]}>
      {DIFFICULTY_LABELS[difficulty]}
    </Badge>
  )
}
