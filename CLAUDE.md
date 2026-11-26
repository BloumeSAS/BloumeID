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

