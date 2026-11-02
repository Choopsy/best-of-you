# Dignis — consignes pour Claude Code

Appli Next.js 16 + Supabase (journal alimentaire, cuisine du foyer, forme). Interface en français, au tutoiement.
Le contexte complet est dans les documents importés ci-dessous ; les consignes personnelles (liens, préférences)
sont dans `CLAUDE.local.md` s'il existe (non versionné).

@AGENTS.md
@docs/ARCHITECTURE.md
@docs/CONVENTIONS.md
@docs/TESTS.md

## Avant de rendre la main

1. `npx tsc --noEmit` et `npm test` passent.
2. Base modifiée → `npm run test:db` ; interface modifiée → `npm run test:e2e -- <scénario concerné>` (et regarder les captures).
3. `SUIVI.md` à jour ; migration à lancer signalée en tête de la réponse.
4. Résumer en français simple ce qui a changé pour l'utilisateur, pas la liste des fichiers.

Skills du projet (`.claude/skills`) : `migration-supabase` pour toute modification du schéma, `livrer` pour vérifier, commiter et mettre à jour le suivi.
