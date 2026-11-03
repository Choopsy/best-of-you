# Suivi du projet

Ce qui reste à faire, les idées et ce qui est déjà en ligne. On coche au fur et à mesure, et on ajoute la date et le commit quand c'est fini.

> Ce dépôt est public : rien de sensible ici (pas de mot de passe, de clé, d'email ni de donnée d'utilisateur).

**Étiquettes :** `[Supabase]` réglage dans le tableau de bord · `[RGPD]` données et vie privée · `[Infra]` hébergement, sauvegardes, tests · `[Cuisine]` `[Journal]` `[Forme]` parties de l'appli

---

## À faire

### Mise en ligne
- [ ] `[Supabase]` Lancer `supabase/migrations/011_securite.sql` dans le SQL Editor (avant le push)
- [ ] `[Vercel]` Ajouter la variable `MEAL_IMPORT_USERS` = ton identifiant (Supabase > Authentication > Users > User UID), puis redéployer : sans elle, l'import de repas est caché pour tout le monde
- [ ] `[RGPD]` Tester la suppression de compte en ligne avec un compte jetable (avec une photo de recette)

### Données et vie privée
- [ ] `[RGPD]` Vercel : son DPA ne couvre que les offres Pro et Enterprise, pas l'offre gratuite Hobby — écrire à privacy@vercel.com ou passer en Pro avant d'ouvrir l'appli
- [ ] `[RGPD]` Garder une copie (PDF) des DPA de Supabase (supabase.com/legal/dpa) et d'Anthropic (anthropic.com/legal/data-processing-addendum) : déjà acceptés avec leurs conditions, rien à signer
- [ ] `[RGPD]` Décider si les photos des recettes privées passent dans un stockage privé (aujourd'hui : visibles par qui a le lien)
- [ ] `[RGPD]` Avant d'ouvrir au-delà des proches : remplacer Gmail par un service d'envoi avec accord de traitement (Brevo ou Resend, nom de domaine)
- [ ] `[RGPD]` Si l'appli s'ouvre au-delà des proches : refaire le point sur l'analyse d'impact (AIPD) et relire le registre des traitements
- [ ] `[RGPD]` Mentions légales : vérifier l'entité Supabase de ton contrat (Supabase Pte. Ltd., Singapour, sauf achat via AWS Marketplace) ; adresse personnelle non publiée (particulier, LCEN art. 6-III-2) : c'est un choix à confirmer

### Protection
- [ ] `[Infra]` Sécurité : relancer l'audit régulièrement (`npm run test:security`, `npm audit`, gitleaks, semgrep : commandes dans le document privé « Audit de sécurité — Dignis ») ; étape suivante possible : CSP avec nonce dans `proxy.ts`
- [ ] `[Infra]` Sauvegarde hebdomadaire de la base, gratuite (GitHub Actions)
- [ ] `[Infra]` Vérification automatique à chaque push : typage, `npm test`, `npm run test:db`, build (GitHub Actions)
- [ ] `[Infra]` Au-delà de quelques centaines d'utilisateurs : passer Supabase en offre Pro (sauvegardes, plus de mise en pause, 8 Go)

## Idées

- [ ] `[RGPD]` Comptes créés avant le 3 novembre 2026 : pas d'acceptation des conditions ni d'âge confirmé enregistrés ; les demander à la prochaine connexion si l'appli s'ouvre
- [ ] `[Premium]` Activer `photo_access` automatiquement à l'abonnement (aujourd'hui : à la main dans le SQL Editor)
- [ ] `[RGPD]` Photo du repas : effacer les dates d'analyse de plus d'un jour (seul le jour en cours sert au quota)

- [ ] `[Journal]` Après un ajout ouvert par le bouton + (`/journal?add=1`), l'adresse garde `?add=1` : recharger la page rouvre la fenêtre d'ajout
- [ ] `[Journal]` Frigo : proposer aussi le retrait pour « Ajouter à nouveau », « Comme hier » et le scan direct
- [ ] `[Infra]` Tests e2e : délais dépassés de temps en temps dans 01-journal-scan (la fenêtre « Ajouter » ne se ferme pas après le scan) et 02-aliments, aussi sans rebuild ; peut-être une cause voisine du bug du préchargement (corrigé le 2026-11-03)
- [ ] `[Design]` Écarts restants avec les maquettes : icône par rayon dans les courses, photos des aliments dans le journal, en-tête « Dignis » avec cloche, autres pages (recettes, frigo, semaine, profil) à harmoniser
- [ ] `[Design]` Icône aux couleurs de Dignis (ou garder l'actuelle)
- [ ] `[Journal]` Plats composés courants à ajouter à la base (tartiflette maison, salades traiteur…) : aujourd'hui Ciqual n'a que des versions industrielles
- [ ] `[Journal]` Vitamines et minéraux (fer, calcium, B12, vitamine D) depuis la table Ciqual
- [ ] `[Cuisine]` Créer un produit déjà existant (même nom) : proposer de réutiliser l'ancien plutôt qu'un doublon
- [ ] `[Cuisine]` Import de recettes en JSON (suite de l'import de repas : relier chaque ingrédient à un aliment Ciqual, à confirmer)
- [ ] `[Cuisine]` Import de recettes depuis un site (projet à part)
- [ ] `[Cuisine]` Courses : plusieurs magasins avec chacun son ordre de rayons
- [ ] `[Cuisine]` « Qu'est-ce qu'on mange ? » : compter le sucre et la farine comme placard de base ?

### Mis de côté
- Photo de l'étiquette ou du plat pour lire la composition : demande un service payant
- Notifications (périmés, rappels) : pas pour l'instant

---

## Fait

| Date | Quoi | Commit |
| --- | --- | --- |
| 2026-11-03 | Sécurité : corrections de l'audit (Next 16.4.4, en-têtes, stockage et fonctions fermés, migration 011) ; `npm run test:security` | `dd6f1a1` |
| 2026-11-03 | Mentions légales, conditions d'utilisation, inscription réservée aux 18 ans et plus (case vérifiée côté serveur) | `3bffcb2` |
| 2026-11-03 | Nouveau slogan « Digne de soin, chaque jour. » ; connexion : logo et slogan | `a124d7f` |
| 2026-11-03 | Journal à jour après un ajout : la barre du bas ne précharge plus la page en cours (elle laissait parfois l'ancien journal affiché) | `7e6c41a` |
| 2026-11-03 | Menu + : « Photo du repas » sur toute la largeur, seulement pour les comptes activés | `b03d07a` |
| 2026-11-03 | Photo du repas : Claude reconnaît les aliments et estime les grammes, valeurs Ciqual, vérification avant ajout ; accès réservé, accord, 3 photos par jour (migration 010) | `bb0a0c6` |
| 2026-11-02 | Frigo qui suit le journal (retrait proposé à l'ajout, remis à la suppression) ; produits scannés au frigo cherchables (migration 009) | `cba8111` |
| 2026-11-02 | Journal : sucres, gras saturés et sel de nouveau visibles (détail du jour toujours ouvert), sport sous la ligne d'énergie | `78c53d2` |
| 2026-11-02 | Import de repas réservé à mon compte (MEAL_IMPORT_USERS) ; page « introuvable » en français | `3b55986` |
| 2026-11-02 | Importer un repas depuis un fichier JSON (Profil > Mes données) | `54e66d0` |
| 2026-11-02 | Journal repensé (semaine pour choisir le jour, ligne d'énergie fixe, détail replié) ; tests de nouveau stables (lien dans un lien sur l'accueil) | `19d68fc` |
| 2026-11-02 | Nouveau design, étapes 2 et 3 : ronds, cartes, barre du bas, feuilles, boutons ; écrans Accueil, Journal, Ajouter, Courses, Forme | `4013359`, `0c797ad` |
| 2026-11-02 | Nouveau design, étape 1 : couleurs, polices (Epilogue, Karla) et ombres en clair et en sombre | `4766c95` |
| 2026-11-02 | Tests dans Docker (`docker compose run --rm test`), sans rien installer sur le PC ; tests scan et RGPD fiabilisés ; clés internes renommées « dignis » | — |
| 2026-11-02 | Emails : « Dignis » dans les modèles et le nom d'expéditeur | — |
| 2026-11-02 | Consignes Claude Code (`CLAUDE.md`, `AGENTS.md`) sorties du dépôt public ; fichiers inutiles de `public/` supprimés | — |
| 2026-11-02 | Migrations `006`, `007`, `008` lancées dans Supabase | — |
| 2026-11-02 | Outils pour Claude Code : `npm run test:db`, `npm run test:e2e` (7 scénarios), docs de contexte, skills du projet | `fffff3c` |
| 2026-11-02 | Recettes : produits scannés ou créés comme ingrédients ; présentation de l'appli au premier lancement (migration 008) | `dd65c5c` |
| 2026-10-28 | Journal : aliments comptés en portions (burger, menu) ou en pots, parts…, poids de portion repris du scan | `2dafde1` |
| 2026-10-27 | Journal : « Créer un aliment » sans code-barres (plat maison, restaurant) | `db7d58b` |
| 2026-10-27 | Nouvelle identité : Dignis, « Prends soin de ta valeur. » | `e4349a9` |
| 2026-10-27 | Animation d'ouverture reprise de l'icône (1,7 s, une fois par lancement) | `c32a0fa` |
| 2026-10-27 | Scan fiable : Open Food Facts interrogé depuis le téléphone (limite par IP), Réessayer, double lecture du code | `d234573` |
| 2026-10-27 | Courses triées par rayon (auto, corrigeable, ordre du magasin) et utilisables hors connexion ; bilan de la semaine | `e8e32af` |
| 2026-10-27 | Confirmation de l'email activée, Site URL vérifiée | — |
| 2026-10-27 | Emails envoyés par Gmail (SMTP) et modèles en français avec liens `token_hash` (marchent sur un autre appareil) | — |
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
