import { ExternalLink } from 'lucide-react'
import { SOURCES, type DailyTargets, type SourceId } from '@/lib/targets'

export function TargetsExplainer({ targets }: { targets: DailyTargets }) {
  const used = [...new Set(targets.explanations.flatMap((e) => e.sources))] as SourceId[]
  const num = (id: SourceId) => used.indexOf(id) + 1

  return (
    <div className="space-y-4">
      {targets.warnings.map((w) => (
        <div key={w} className="rounded-xl border border-honey/40 bg-honey/15 px-4 py-3 text-sm">{w}</div>
      ))}

      <div className="rounded-2xl border divide-y">
        {targets.explanations.map((e) => (
          <div key={e.key} className="px-4 py-3 space-y-1">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-medium text-sm">{e.title}</p>
              <p className="font-semibold tabular-nums">{e.value}</p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {e.how}{' '}
              {e.sources.map((s) => (
                <sup key={s} className="ml-0.5 text-primary">[{num(s)}]</sup>
              ))}
            </p>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        IMC : {targets.bmi.toLocaleString('fr-FR')} · Métabolisme de base : {targets.bmr.toLocaleString('fr-FR')} kcal ·
        Dépense estimée : {targets.tdee.toLocaleString('fr-FR')} kcal/j
      </p>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Sources</h3>
        <ol className="space-y-1.5 text-xs text-muted-foreground">
          {used.map((id) => (
            <li key={id} className="flex gap-1.5">
              <span className="text-primary">[{num(id)}]</span>
              <a href={SOURCES[id].url} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-foreground">
                {SOURCES[id].label}
                <ExternalLink className="inline h-3 w-3 ml-1 -mt-0.5" />
              </a>
            </li>
          ))}
        </ol>
      </div>

      <p className="text-xs text-muted-foreground rounded-xl bg-muted/50 px-4 py-3">
        Ce sont des repères pour un adulte en bonne santé, calculés à partir d&apos;équations qui donnent une
        estimation (souvent à ±10 %). Ils ne remplacent pas l&apos;avis d&apos;un médecin ou d&apos;un diététicien, et
        ne s&apos;appliquent pas pendant une grossesse, l&apos;allaitement ou en cas de maladie.
      </p>
    </div>
  )
}
