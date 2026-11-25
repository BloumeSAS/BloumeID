# HISTORY.md — Journal d'Exécution et d'Architecture (BloumeID)

Ce fichier est un journal **append-only** retraçant chaque phase de construction, les décisions techniques, les corrections appliquées à la spécification initiale et les résultats de vérification.

---

## [2026-11-26 00:26] Phase 1 : Gouvernance du repo & Corrections de spécification
- **Résumé des changements** :
  - Initialisation du dépôt Git avec la branche principale `main` et création de la branche de travail `feat/phase-1-governance`.
  - Rédaction des règles d'ingénierie et de sécurité non négociables dans `AGENTS.md`.
  - Création du journal `HISTORY.md` (ce fichier).
  - Mise en place des fichiers d'hygiène du dépôt : `.gitignore` (excluant `.env`, `*.mmdb`, dumps SQL, artefacts de build), `.editorconfig` et `.nvmrc` (Node 22 LTS).
- **Fichiers clés touchés** :
  - `AGENTS.md`
  - `HISTORY.md`
  - `.gitignore`
  - `.editorconfig`
  - `.nvmrc`
- **Décisions et caveats (Corrections appliquées à la spec section 4)** :
  1. **Police Georgia** : Georgia n'étant pas hébergée sur `next/font/google`, utilisation de la pile système `Georgia, "Times New Roman", serif` assignée à `--font-serif` dans `globals.css`, combinée à `Inter` (`--font-sans`) et `JetBrains Mono` (`--font-mono`) via `next/font/google`.
  2. **Signature anti-rejeu côté client** : Comme la clé publique (`bid_pub_`) est exposée dans le navigateur, une signature HMAC client ne prouve pas l'identité secrète de l'émetteur mais protège contre le rejeu et l'altération naïve via un couple `(timestamp, nonce)` signé et vérifié côté serveur (fenêtre de 5 min + déduplication Redis du nonce). La preuve d'authenticité forte est assurée côté serveur via `bid_sec_` et pour les webhooks via `X-BloumeID-Signature` (HMAC-SHA256).
  3. **Migrations Prisma** : Remplacement de `prisma db push` par des migrations versionnées dans `prisma/migrations/` appliquées avec `prisma migrate deploy` (exécuté dans l'entrypoint conteneur local/staging, et protégé par sauvegarde `pg_dump` + approbation d'environnement GitHub `production` en CI/CD).
  4. **Générateur Snowflake** : Prise en charge de la variable d'environnement `WORKER_ID` (0–1023) pour garantir l'unicité distribuée sans collision multi-instances.
  5. **URLs dynamiques** : Utilisation systématique de `BLOUMEID_PUBLIC_URL` dans la documentation, les snippets d'intégration et la configuration du SDK au lieu d'URLs codées en dur.
- **Statut de vérification** : Fichiers de gouvernance présents OK / `.gitignore` validé avant premier commit OK


---

## [2026-11-26 00:33] Phase 2 : Monorepo pnpm, Next.js 16 & SDK Bootstrap
- **Résumé des changements** :
  - Mise en place du workspace pnpm (`pnpm-workspace.yaml`, `package.json` racine, `.prettierrc`, `.changeset/`).
  - Création du package `@bloumeid/config` centralisant `tsconfig.base.json`, `tsconfig.nextjs.json` et `eslint.base.mjs` (`strict: true`, `@typescript-eslint/no-explicit-any: "error"`).
  - Initialisation de `packages/bloumeid` (`@bloumeid/sdk`) compilé avec `tsup` vers ESM (`dist/index.mjs`, `dist/server.mjs`), CJS (`dist/index.cjs`, `dist/server.cjs`), IIFE/UMD (`dist/bloumeid.global.js` copié automatiquement vers `apps/web/public/sdk/v1/bloumeid.js`) et `.d.ts`.
  - Initialisation de `apps/web` sous Next.js 16.4 (`output: "standalone"`), Tailwind CSS v4 (`@tailwindcss/postcss`), Vitest et ESLint flat config.
- **Fichiers clés touchés** :
  - `pnpm-workspace.yaml`, `package.json`, `.changeset/config.json`
  - `packages/config/tsconfig.base.json`, `packages/config/tsconfig.nextjs.json`, `packages/config/eslint.base.mjs`
  - `packages/bloumeid/package.json`, `packages/bloumeid/tsup.config.ts`, `packages/bloumeid/src/index.ts`, `packages/bloumeid/src/server.ts`, `packages/bloumeid/src/umd.ts`
  - `apps/web/package.json`, `apps/web/next.config.ts`, `apps/web/src/app/layout.tsx`, `apps/web/src/app/globals.css`
- **Décisions et caveats** :
  - Next.js 16 utilise Turbopack par défaut et Tailwind CSS v4 via `@import "tailwindcss"` et `@theme inline` dans `globals.css`. La clé obsolète `eslint` a été retirée de `next.config.ts` conformément à Next.js 16.
- **Statut de vérification** : build OK / typecheck OK / tests 3/3 OK / lint OK

## [2026-11-26 00:33] Phase 2 : Monorepo pnpm, Next.js 16 & SDK Bootstrap
- **Résumé des changements** :
  - Configuration du workspace pnpm (`pnpm-workspace.yaml`, `package.json`, `.prettierrc`, `.changeset/config.json`).
  - Création de `packages/config` avec `tsconfig.base.json`, `tsconfig.nextjs.json` et `eslint.base.mjs` (`strict: true`, `@typescript-eslint/no-explicit-any: "error"`).
  - Création du squelette `packages/bloumeid` (`@bloumeid/sdk`) compilé avec `tsup` en ESM (`dist/index.mjs`), CJS (`dist/index.cjs`), IIFE/UMD (`dist/bloumeid.global.js` copié vers `apps/web/public/sdk/v1/bloumeid.js`) et `.d.ts`.
  - Création de `apps/web` sous Next.js 16 (`output: "standalone"`), Tailwind CSS v4 (`@tailwindcss/postcss`), Vitest et ESLint flat config.
- **Fichiers clés touchés** :
  - `pnpm-workspace.yaml`, `package.json`, `.changeset/config.json`
  - `packages/config/*`
  - `packages/bloumeid/*`
  - `apps/web/*`
- **Décisions et caveats** :
  - Utilisation de Tailwind CSS v4 (`@import "tailwindcss";` + `@theme inline`) avec les variables CSS du thème Cosmic Night et la pile serif système `--font-serif: Georgia, "Times New Roman", serif`.
  - `onlyBuiltDependencies` configuré dans `pnpm-workspace.yaml` pour autoriser la compilation native de Prisma et esbuild sous pnpm v10.
- **Statut de vérification** : build OK / typecheck OK / tests 3/3 OK / lint OK
