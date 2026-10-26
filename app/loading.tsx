/**
 * Squelette affiché immédiatement pendant le chargement d'une page.
 * Il permet aussi à Next.js de précharger la navigation (liens) jusqu'à ce point.
 */
export default function Loading() {
  return (
    <div className="min-h-svh pb-24" aria-busy="true" aria-live="polite">
      <span className="sr-only">Chargement…</span>
      <div className="h-13 border-b bg-background/80" />
      <div className="px-4 py-5 max-w-2xl mx-auto space-y-4 animate-pulse">
        <div className="h-6 w-40 rounded-lg bg-muted" />
        <div className="h-40 rounded-3xl bg-muted" />
        <div className="grid grid-cols-3 gap-3">
          <div className="h-24 rounded-2xl bg-muted" />
          <div className="h-24 rounded-2xl bg-muted" />
          <div className="h-24 rounded-2xl bg-muted" />
        </div>
        <div className="h-16 rounded-2xl bg-muted" />
        <div className="h-16 rounded-2xl bg-muted" />
      </div>
    </div>
  )
}
