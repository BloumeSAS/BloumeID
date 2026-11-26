# CLAUDE.md — Règles de Gouvernance & Architecture (BloumeID v1.0.0)

Ce document formalise les règles d'ingénierie non négociables applicables à tous les agents IA et développeurs travaillant sur le dépôt **BloumeID** (Bloume SAS). Il complète `AGENTS.md`.

---

## 1. Protocole de Session Obligatoire
- **Lecture préalable** : Avant toute modification ou création de fichier, lire intégralement `CLAUDE.md` (ou `AGENTS.md`) et `HISTORY.md`.
- **Journalisation (`HISTORY.md`)** : Consigner chaque phase ou étape significative en mode append-only dans `HISTORY.md` avec l'horodatage, le résumé des changements, les fichiers clés touchés et le statut de vérification (`typecheck`, `lint`, `tests`, `build`).

---

## 2. Identité Package & Monorepo (`v1.0.0`)
- **Gestionnaire** : `pnpm` (workspaces).
- **Applications & Packages** :
  - `apps/web` (`@bloumeid/web`) : Next.js 16 App Router (`output: "standalone"`), Tailwind CSS v4 (thème **Clean Slate** Light & Dark), Prisma ORM, PostgreSQL 17, Valkey/Redis 8, moteur de réconciliation & threat intel, et distribution UMD (`/sdk/v1/bloumeid.js`).
  - `packages/bloumeid` (**`@bloume/id`**, `v1.0.0`) : Package npm officiel publiable (`tsup` ESM, CJS, UMD global `window.BloumeID` & `window.FingerprintJS`, `.d.ts`), zéro dépendance runtime.
  - `packages/config` : Configurations TypeScript strict et ESLint partagées.
  - `docker/` : Dockerfile multi-stage Node 22 Alpine & entrypoint PID-1 (`prisma migrate deploy`).

---

## 3. Sécurité & Base de Données
- **Identifiants Snowflake uniquement** : Zéro exposition des clés primaires internes (`id Int`). Seuls les `publicId` préfixés sont exposés : `site_`, `vis_`, `req_`, `rule_`, `whd_`, `feed_`, et clés `bid_pub_` / `bid_sec_`.
- **Authentification & Cryptographie** : `ADMIN_MASTER_KEY` vérifié en temps constant via `crypto.timingSafeEqual` + cookie `HttpOnly` signé HMAC-SHA256 + rate-limiting Redis en fenêtre glissante. Validation CORS stricte par site (`allowedDomains`) et signatures anti-rejeu HMAC-SHA256 (`±5 min` + nonce Redis).
- **Interdiction absolue des resets destructifs** : Ne jamais exécuter `prisma migrate reset`, `prisma db push --force-reset` ou `DROP` sur une base partagée ou de production. Toujours utiliser des migrations additives versionnées dans `apps/web/prisma/migrations/` appliquées via `prisma migrate deploy`.

---

## 4. Qualité, UI/UX & i18n
- **TypeScript Strict** : `strict: true` partout, zéro `any` explicite dans le code source, types partagés centralisés dans `src/types/`.
- **Thème & Design** : `shadcn/ui` + thème **Clean Slate** (`Light` & `Dark`), polices `Inter` (`--font-sans`), `JetBrains Mono` (`--font-mono`) et `Georgia` (`--font-serif`).
- **Zéro chaîne UI en dur** : 100 % des textes d'interface proviennent des dictionnaires `apps/web/src/i18n/dictionaries/fr.json` et `en.json` avec parité stricte vérifiée par test automatisé (`apps/web/tests/i18n.test.ts`).


---

## Tags, Releases & Vérification des Workflows GitHub Actions
- **Création systématique de Tag & Release** : Après chaque push significatif sur `main`, l'agent DOIT créer un tag Git versionné (`vX.Y.Z`) et publier la GitHub Release correspondante (sur `BloumeSAS/BloumeID` et, si le SDK a changé, sur `BloumeSAS/bloumeid-sdk`).
- **Vérification obligatoire des Workflows** : L'agent DOIT vérifier l'état de tous les workflows GitHub Actions (`CI`, `sync-sdk-repo.yml`, `release-sdk.yml`, `publish.yml`) et s'assurer qu'ils sont tous verts avant de clôturer la tâche.

---

## Workflow Git Automatique Obligatoire (Chaque Modification)
L'agent DOIT exécuter automatiquement le cycle Git complet sans attendre de demande explicite de l'utilisateur :

1. **Avant toute modification (Synchronisation & Création de branche) :**
   - Vérifier l'état du dépôt (`git status`), basculer sur `main` (`git checkout main`) et récupérer les derniers changements distants (`git pull --rebase origin main`).
   - Créer et basculer immédiatement sur une nouvelle branche dédiée (`git checkout -b <type>/<nom-court>`, ex. `feat/...`, `fix/...`, `refactor/...`, `chore/...`). **Ne jamais coder directement sur `main`.**
2. **Pendant le développement (Commits atomiques & conventionnels) :**
   - Vérifier qu'aucun fichier sensible (`.env`, `*.mmdb`, secrets) n'est indexé.
   - Créer des commits clairs suivant le format **Conventional Commits** (`feat(...)`, `fix(...)`, `refactor(...)`, `docs(...)`, `chore(...)`).
3. **Après validation (Push, Merge sur `main` & Nettoyage automatique) :**
   - Une fois les vérifications passées (`typecheck`, `lint`, `test`, `build`), pousser la branche (`git push -u origin <type>/<nom-court>`).
   - Revenir sur `main`, récupérer d'éventuels nouveaux commits (`git checkout main; git pull --rebase origin main`), fusionner proprement (`git merge --no-ff <type>/<nom-court> -m "merge: <type>/<nom-court> into main"`), pousser `main` (`git push origin main`), puis supprimer la branche locale et distante (`git branch -d <type>/<nom-court>` et `git push origin --delete <type>/<nom-court>`).
4. **Gestion des conflits & sécurité Git :**
   - Résoudre proprement tout conflit avant de finaliser le rebase/merge et re-vérifier le build/typecheck.
   - Interdiction absolue d'utiliser `git push --force` sur `main` ou de commiter des secrets.

---

## Versioning Dynamique & Bump SemVer Automatique
- **Source de vérité unique** : `apps/web/src/lib/version.ts` (`APP_VERSION` / `APP_VERSION_TAG`) lit dynamiquement `apps/web/package.json`. Il est **interdit de coder en dur `"1.0.0"`** dans les composants UI, l'API (`/api/health`), les métadonnées ou les dictionnaires i18n (`fr.json` / `en.json`).
- **Bump SemVer & README Auto-Sync Obligatoire** : Avant chaque commit/merge, exécuter `pnpm bump:version <patch|minor|major> [--all]` afin que l'UI, l'API, `package.json` et les `README.md` (`README.md` racine et `packages/bloumeid/README.md` avec `--all`) affichent **toujours** la version exacte à jour :
  - `patch` (`1.0.x`) : fix, ajustement CSS/UI mineur, traduction i18n, documentation.
  - `minor` (`1.x.0`) : nouvelle fonctionnalité (`feat`), refonte de page ou d'interface, ajout d'endpoints rétrocompatibles.
  - `major` (`x.0.0`) : breaking change majeur d'architecture, de schéma API ou de base de données.

---

## Gouvernance Multi-Repos (`BloumeSAS/BloumeID` + `BloumeSAS/bloumeid-sdk`)
- **Double Contrôle Git Obligatoire** :
  - Le dépôt principal (`BloumeSAS/BloumeID`, racine) et le dépôt SDK (`BloumeSAS/bloumeid-sdk`, `packages/bloumeid/`) sont deux dépôts Git distincts imbriqués localement.
  - Sur `BloumeSAS/BloumeID`, `packages/bloumeid/` ne doit suivre **exclusivement que `packages/bloumeid/README.md`** (`packages/bloumeid/*` + `!packages/bloumeid/README.md` dans `.gitignore`). Toujours vérifier avec `git ls-files packages/bloumeid`.
  - À chaque modification touchant le SDK, exécuter d'abord le **Workflow Git Automatique Complet** (`checkout main` $\rightarrow$ `pull --rebase` $\rightarrow$ `checkout -b` $\rightarrow$ bump `--all` + build + tests $\rightarrow$ `commit` $\rightarrow$ `push` $\rightarrow$ `merge --no-ff` sur `main` $\rightarrow$ `push origin main` $\rightarrow$ suppression de branche) dans **`packages/bloumeid` (`BloumeSAS/bloumeid-sdk`)**, puis dans **`BloumeID` (`BloumeSAS/BloumeID`)**.
