---
name: livrer
description: À utiliser à la fin d'une tâche sur Dignis — vérifie (typage, tests, scénarios navigateur concernés), regarde les captures, commite en français et met à jour SUIVI.md.
---

# Livrer une tâche sur Dignis

1. `npx tsc --noEmit` puis `npm test`. Corriger avant d'aller plus loin.
2. Selon ce qui a changé :
   - schéma ou règles de sécurité → `npm run test:db` ;
   - interface → `npm run test:e2e -- <scénarios concernés>` ; si aucun scénario ne couvre le changement, en ajouter un dans `tests/e2e/specs/` (voir `docs/TESTS.md`). Ouvrir les captures de `tests/e2e/captures/` pour vérifier l'affichage, en clair et si possible en sombre.
3. Relire le diff (`git diff`) : pas de secret, pas de `console.log` de débogage, textes en français au tutoiement.
4. Commit en français : une ligne de résumé (« Journal : … », « Recettes : … »), le détail en dessous si utile.
5. `SUIVI.md` : ligne dans « Fait » (date, quoi, hash court du commit), retirer la tâche de « À faire », ajouter les nouvelles idées ou limites repérées. Commit séparé « Suivi : … ».
6. Ne pas pousser sans qu'on le demande. Si une migration est à lancer, le rappeler en premier dans la réponse.
7. Réponse finale : ce qui change pour l'utilisateur, en quelques phrases, puis ce qui reste à faire de son côté.
