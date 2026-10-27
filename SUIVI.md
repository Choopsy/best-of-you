# Suivi du projet

Ce qui reste à faire, les idées et ce qui est déjà en ligne. On coche au fur et à mesure, et on ajoute la date et le commit quand c'est fini.

> Ce dépôt est public : rien de sensible ici (pas de mot de passe, de clé, d'email ni de donnée d'utilisateur).

**Étiquettes :** `[Supabase]` réglage dans le tableau de bord · `[RGPD]` données et vie privée · `[Infra]` hébergement, sauvegardes, tests · `[Cuisine]` `[Journal]` `[Forme]` parties de l'appli

---

## À faire

### Mise en ligne
- [ ] `[Supabase]` Envoi des emails par Gmail (SMTP + mot de passe d'application) : sans SMTP, Supabase n'envoie qu'aux membres de l'organisation
- [ ] `[Supabase]` Authentication : vérifier que **Confirm email** est activé et que la Site URL est l'adresse du site
- [ ] `[Supabase]` Email Templates → Confirm signup : `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email&next=/onboarding`
- [ ] `[Supabase]` Email Templates → Reset password : `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery`
- [ ] `[RGPD]` Tester la suppression de compte en ligne avec un compte jetable (avec une photo de recette)

### Données et vie privée
- [ ] `[RGPD]` Télécharger et garder une copie des accords de traitement (DPA) de Supabase et de Vercel
- [ ] `[RGPD]` Décider si les photos des recettes privées passent dans un stockage privé (aujourd'hui : visibles par qui a le lien)
- [ ] `[RGPD]` Avant d'ouvrir au-delà des proches : remplacer Gmail par un service d'envoi avec accord de traitement (Brevo ou Resend, nom de domaine)
- [ ] `[RGPD]` Si l'appli s'ouvre au-delà des proches : refaire le point sur l'analyse d'impact (AIPD) et relire le registre des traitements

### Protection
- [ ] `[Infra]` Sauvegarde hebdomadaire de la base, gratuite (GitHub Actions)
- [ ] `[Infra]` Vérification automatique à chaque push : typage, `npm test`, build
- [ ] `[Infra]` Au-delà de quelques centaines d'utilisateurs : passer Supabase en offre Pro (sauvegardes, plus de mise en pause, 8 Go)

## Idées

- [ ] `[Cuisine]` Courses hors connexion, triées par rayon
- [ ] `[Journal]` Bilan de la semaine (calories et protéines moyennes, séances, tendance du poids), dans l'appli
- [ ] `[Journal]` Vitamines et minéraux (fer, calcium, B12, vitamine D) depuis la table Ciqual
- [ ] `[Cuisine]` Import de recettes depuis un site (projet à part)
- [ ] `[Cuisine]` « Qu'est-ce qu'on mange ? » : compter le sucre et la farine comme placard de base ?

### Mis de côté
- Photo de l'étiquette ou du plat pour lire la composition : demande un service payant
- Notifications (périmés, rappels) : pas pour l'instant

---

## Fait

| Date | Quoi | Commit |
| --- | --- | --- |
| 2026-10-27 | Navigation instantanée : site à Dublin près de la base, onglets préchargés ; coche « Récents » qui disparaissait | `3749a74` |
| 2026-10-27 | Bug : caméra bloquée sur « Ouverture » après plusieurs scans ; bouton Réessayer, caméra coupée en arrière-plan | `73a6959` |
| 2026-10-27 | Migration `005_rgpd.sql` lancée dans Supabase | — |
| 2026-10-27 | Contact RGPD et région d'hébergement (Irlande) dans la politique | `2f0fc5f` |
| 2026-10-27 | RGPD : politique de confidentialité, accord santé, export et suppression du compte (migration 005) | `cc8cf27` |
| 2026-10-26 | Scanner ouvert sur place depuis le menu + | `7deb724` |
| 2026-10-26 | Forme (séances, semaine OMS, courbe de poids), code-barres, Récents, Comme hier, idées selon le frigo (migration 004) | `2fdc646` |
| 2026-10-26 | Cuisine : frigo, planning, courses moins le frigo, foyer partagé, alertes (migration 003) | `53451a8` |
| 2026-10-26 | Icône, écran d'accueil du téléphone, thème clair par défaut | `6f51f14` |
| 2026-10-26 | Design Fournil clair et sombre, ronds d'objectifs, navigation plus rapide | `e751f1c` |
| 2026-10-26 | Lancement avec Docker | `91924ec` |
| 2026-10-26 | Profil santé, objectifs sourcés, journal, Ciqual, amis et partage | `dbe127f` |
