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

## [2026-11-26 00:35] Phase 3 : UI shadcn/ui, Thème Cosmic Night & Primitives
- **Résumé des changements** :
  - Configuration de `shadcn/ui` (`apps/web/components.json`) avec la palette **Cosmic Night** en dark mode par défaut (`apps/web/src/app/globals.css`).
  - Implémentation des polices dans `layout.tsx` (`Inter` -> `--font-sans`, `JetBrains Mono` -> `--font-mono`, et pile système `Georgia, "Times New Roman", serif` -> `--font-serif`).
  - Création des primitives `shadcn/ui` : `Button`, `Card`, `Badge`, `Input`, `Label`, `Table`, `Switch`, `Tabs`, `Dialog` et du composant obligatoire `CopyableMono` (monospace avec bouton de copie rapide pour tous les hashes, IP, ASN et identifiants Snowflake).
  - Ajout des tests unitaires UI (`apps/web/tests/ui.test.ts`).
- **Fichiers clés touchés** :
  - `apps/web/components.json`, `apps/web/src/lib/utils.ts`
  - `apps/web/src/components/ui/*`
  - `apps/web/tests/ui.test.ts`
- **Décisions et caveats** :
  - Utilisation de `radix-ui` unifié pour `Switch`, `Tabs` et `Dialog` afin d'éviter toute duplication de sous-packages Radix.
- **Statut de vérification** : build OK / typecheck OK / tests 3/3 OK / lint OK

## [2026-11-26 00:36] Phase 3 : UI shadcn/ui, Thème Cosmic Night & Dictionnaires i18n
- **Résumé des changements** :
  - Configuration de `components.json` (shadcn/ui, style New York, icônes Lucide) et application du thème dark-first **Cosmic Night** dans `apps/web/src/app/globals.css`.
  - Implémentation des primitives UI : `Button`, `Card`, `Badge`, `Input`, `Label`, `Table`, `Switch`, `Textarea`, `Separator`, `Tabs`, `Dialog`, `Sheet`, ainsi que le composant `CopyableMono` (police monospace `JetBrains Mono` + bouton de copie rapide pour hashes, IP, ASN, clés API et identifiants Snowflake).
  - Création des dictionnaires d'internationalisation complets `apps/web/src/i18n/dictionaries/en.json` et `fr.json` avec le test automatisé de parité stricte `apps/web/tests/i18n.test.ts`.
- **Fichiers clés touchés** :
  - `apps/web/components.json`
  - `apps/web/src/components/ui/*`
  - `apps/web/src/i18n/dictionaries/{en,fr}.json`, `apps/web/src/i18n/index.ts`
  - `apps/web/tests/i18n.test.ts`
- **Décisions et caveats** :
  - Correction de la police Georgia : définie via `--font-serif: Georgia, "Times New Roman", serif` dans `globals.css` tandis qu'`Inter` et `JetBrains_Mono` sont chargées via `next/font/google`.
- **Statut de vérification** : build OK / typecheck OK / tests 5/5 OK / lint OK

## [2026-11-26 00:45] Phase 4 : SDK `@bloumeid/sdk` (Collecteurs, Sondes Anti-Spoof, Thumbmark API & BloumeIDServer)
- **Résumé des changements** :
  - Implémentation de 48+ signaux déterministes zéro dépendance dans `packages/bloumeid/src/collectors.ts` : Canvas 2D (avec double rendu anti-bruit), WebGL 1/2 (vendor, renderer, unmasked GPU, extensions, précision des shaders), WebGPU, `OfflineAudioContext` (triangle + compresseur dynamique + double rendu), matériel/écran (HDR, gamut, orientation, touch), énumération de 85+ polices OS par mesure DOM, `Intl` & timezone, `navigator.languages`, `userAgentData` haute entropie, quotas de stockage, `speechSynthesis`, constantes mathématiques (`V8`, `SpiderMonkey`, `JavaScriptCore`), WebRTC ICE (désactivable via `exclude: ['webrtc']`) et `navigator.connection`.
  - Implémentation des sondes anti-spoof et détection de bots (`packages/bloumeid/src/probes.ts`) : `navigator.webdriver`, artefacts globaux CDP/Playwright/Puppeteer/Selenium (`$cdc_`, `$wdc_`), `window.chrome` malformé, `Permissions.query` incohérent, sonde Web Worker Blob comparée au thread principal, double rendu Canvas/Audio (Brave, Multilogin, Dolphin, AdsPower) et détection du mode navigation privée via `navigator.storage.estimate()`.
  - Implémentation de l'API 100 % compatible ThumbmarkJS Pro (`new BloumeID({ apiKey, endpoint, options })`, `get()`, `getFingerprint()`, `getFingerprintData()`, `setOption()`) et du client serveur `BloumeIDServer` (`@bloumeid/sdk/server` : `verifyRequest(requestId)`, `getVisitor(visitorId)`).
  - Génération des bundles `dist/index.mjs`, `dist/index.cjs`, `dist/bloumeid.global.js` (28.38 Ko brut, ~9 Ko gzip < 150 Ko, copié automatiquement dans `apps/web/public/sdk/v1/bloumeid.js`) et déclarations `.d.ts`/`.d.cts`.
- **Fichiers clés touchés** :
  - `packages/bloumeid/src/{types,crypto,collectors,probes,index,server,umd}.ts`
  - `packages/bloumeid/src/index.test.ts`
  - `packages/bloumeid/package.json`, `packages/bloumeid/vitest.config.ts`
  - `apps/web/public/sdk/v1/bloumeid.js`
- **Décisions et caveats** :
  - Implémentation pure TypeScript de SHA-256 et HMAC-SHA256 (`src/crypto.ts`) pour garantir zéro dépendance runtime et un fonctionnement synchrone/asynchrone uniforme entre navigateur, Worker et tests Vitest/JSDOM.
- **Statut de vérification** : build OK (UMD 28.4 Ko < 150 Ko) / typecheck OK / tests 9/9 (couverture 86% > 80%) / lint OK / publint OK / attw OK

## [2026-11-26 00:52] Phase 5 : Moteur Backend, Prisma, Snowflake, Trie CIDR, Scoring, Webhooks & API v1
- **Résumé des changements** :
  - Création du schéma Prisma `apps/web/prisma/schema.prisma` (`Site`, `Visitor`, `FingerprintEvent`, `ThreatFeedStatus`) où chaque modèle possède un `id Int` interne et un `publicId String @unique` Snowflake jamais confondu, accompagné de la migration initiale versionnée `prisma/migrations/20261126000000_init/migration.sql`.
  - Implémentation du générateur Snowflake (`src/lib/engine/snowflake.ts`) prenant en compte `WORKER_ID`, des clés `bid_pub_` et `bid_sec_` (hashées SHA-256), et des comparaisons en temps constant (`crypto.timingSafeEqual`).
  - Implémentation de l'arbre Patricia/Radix CIDR en mémoire (`src/lib/engine/cidr-trie.ts`) et de la synchronisation des flux X4BNet VPN/Datacenter + Tor Bulk Exit List (`src/lib/engine/feeds.ts`), du classifieur ASN par mots-clés (OVH, Hetzner, DigitalOcean, AWS, GCP, Azure, Scaleway, Vultr, Linode, M247, Leaseweb...) et du lecteur automatique MaxMind GeoLite2 `.mmdb` dans `/app/data/geoip/` (`src/lib/engine/geoip.ts`).
  - Implémentation du moteur de réconciliation 3 niveaux (`src/lib/engine/reconcile.ts` : Niveau 1 `fullHash` exact -> 0.99, Niveau 2 `hardwareHash` + `ipSubnet` /24 sur 30j -> 0.88 `crossBrowserMatched: true`, Niveau 3 nouveau `vis_` -> 0.95).
  - Implémentation du scoring `dangerLevel` 0–5 (`src/lib/engine/scoring.ts`), de la détection d'anomalies de vélocité et rate-limiting en fenêtre glissante Redis (`src/lib/engine/redis.ts`), et de l'envoi de webhooks signés `X-BloumeID-Signature` avec retry exponentiel (`src/lib/engine/webhooks.ts`).
  - Création des routes publiques `POST /api/v1/fingerprint`, `GET /api/v1/requests/[requestId]`, `GET /api/v1/visitors/[visitorId]`, `GET /api/health` et `GET /sdk/v1/bloumeid.js` (avec ETag et `Cache-Control`).
- **Fichiers clés touchés** :
  - `apps/web/prisma/schema.prisma`, `apps/web/prisma/migrations/20261126000000_init/migration.sql`
  - `apps/web/src/types/index.ts`, `apps/web/src/lib/prisma.ts`
  - `apps/web/src/lib/engine/{snowflake,network,cidr-trie,redis,geoip,feeds,scoring,webhooks,reconcile,repository}.ts`
  - `apps/web/src/app/api/v1/**`, `apps/web/src/app/api/health/route.ts`, `apps/web/src/app/sdk/v1/bloumeid.js/route.ts`
  - `apps/web/tests/engine.test.ts`
- **Décisions et caveats** :
  - Couche `repository.ts` résiliente supportant à la fois PostgreSQL via Prisma et un store mémoire pré-seedé lorsque `DATABASE_URL` n'est pas joignable (permettant d'exécuter les tests unitaires, le build Next.js et le playground de manière autonome sans dépendre d'un démon externe).
- **Statut de vérification** : build OK / typecheck OK / tests 11/11 OK / lint OK

## [2026-11-26 00:58] Phase 6 : Panneau Admin, Authentification `ADMIN_MASTER_KEY`, i18n & Playground Live
- **Résumé des changements** :
  - Implémentation de l'authentification administrateur par `ADMIN_MASTER_KEY` uniquement (`src/lib/auth.ts`, `src/app/api/admin/auth/login/route.ts`) avec comparaison en temps constant (`crypto.timingSafeEqual`), rate limiting Redis en fenêtre glissante, et cookie `HttpOnly`, `Secure` (en prod), `SameSite=Strict` signé HMAC-SHA256.
  - Implémentation du middleware Next.js (`src/middleware.ts`) protégeant `/dashboard`, `/sites`, `/visitors`, `/playground` et `/settings`.
  - Création des pages d'administration dans `src/app/(dashboard)/` :
    - `/dashboard` : KPI avec deltas (`24h`, `7d`, `30d`), graphiques `recharts` (AreaChart & BarChart), flux temps réel des détections à risque et tiroir d'inspection forensique (`Sheet`).
    - `/sites` : CRUD complet, rotation des clés `bid_pub_` / `bid_sec_`, configuration des domaines CORS (avec wildcards `*.domaine.tld`), bascule des collecteurs, seuil de risque, test de webhook signé et modale d'intégration (`npm`, `React`, `<script>`, `Node.js` utilisant `BLOUMEID_PUBLIC_URL`).
    - `/visitors` et `/visitors/[visitorId]` : table filtrable, graphe de réconciliation cross-browser, timeline chronologique, édition des tags/notes et visualiseur JSON repliable (`CollapsibleJsonViewer`).
    - `/playground` : exécution en direct du SDK `@bloumeid/sdk` dans le navigateur avec `visitorId`, `thumbmark`, jauge de risque `0–5`, flags, durée en ms et JSON brut.
    - `/settings` : statut de l'arbre CIDR Radix en mémoire, état des bases `.mmdb` GeoLite2 (`/app/data/geoip`), bouton « Synchroniser maintenant », purge par ancienneté et export JSON/CSV.
  - Configuration de la suite E2E Playwright (`apps/web/playwright.config.ts`, `apps/web/e2e/admin.spec.ts`) et des tests d'intégration Admin + contrôle d'absence de chaînes en dur (`apps/web/tests/admin.test.ts`).
- **Fichiers clés touchés** :
  - `apps/web/src/lib/auth.ts`, `apps/web/src/middleware.ts`, `apps/web/src/i18n/provider.tsx`
  - `apps/web/src/app/api/admin/**`
  - `apps/web/src/app/login/page.tsx`, `apps/web/src/app/(dashboard)/**`
  - `apps/web/tests/admin.test.ts`, `apps/web/playwright.config.ts`, `apps/web/e2e/admin.spec.ts`
- **Décisions et caveats** :
  - Toutes les chaînes UI proviennent de `useI18n()` (`en.json` / `fr.json`) avec bascule instantanée FR/EN dans l'interface.
- **Statut de vérification** : build OK / typecheck OK / tests 14/14 OK / lint OK

## [2026-11-26 01:01] Phase 7 : Docker, `docker-compose.yml`, CI/CD GitHub Actions & Documentation
- **Résumé des changements** :
  - Création du `docker/Dockerfile` multi-stage sous Node 22 Alpine avec cache pnpm, build du SDK (`@bloumeid/sdk` + copie de `public/sdk/v1/bloumeid.js`), `prisma generate`, `next build` (`output: "standalone"`), utilisateur non-root `nextjs` (UID 1001) et `HEALTHCHECK` sur `/api/health`.
  - Création de `docker/docker-entrypoint.sh` (attente `pg_isready`, exécution contrôlée de `prisma migrate deploy`, lancement non-bloquant de la synchro des feeds en arrière-plan, puis `exec node` en PID 1 propre).
  - Création de `docker-compose.yml` (`bloumeid-web`, `bloumeid-db` sous `postgres:17-alpine`, `bloumeid-redis` sous `valkey/valkey:8-alpine --appendonly yes`, réseau interne isolé `bloumeid_internal` et healthchecks `service_healthy`).
  - Rédaction de `.env.example` et du `README.md` complet (architecture, reverse-proxies Nginx/Caddy/Traefik avec `X-Forwarded-For` et `X-JA4-Fingerprint`, snippets dynamiques `${BLOUMEID_PUBLIC_URL}`, vérification serveur Node et licence GeoLite2 MaxMind).
  - Création des workflows GitHub Actions :
    - `.github/workflows/ci.yml` (matrice pnpm, services Postgres 17 & Valkey 8, vérification i18n et absence de `any`, couverture SDK >= 80 %, `publint`, `attw`, E2E Playwright, scan `gitleaks`).
    - `.github/workflows/release-sdk.yml` (Changesets, `npm publish --provenance --access public` via OIDC `id-token: write`, tag `sdk-vX.Y.Z` et GitHub Release).
    - `.github/workflows/docker-publish.yml` (multi-arch `linux/amd64` + `linux/arm64` vers `ghcr.io`, scan Trivy bloquant sur `CRITICAL`, SBOM et attestation de provenance).
    - `.github/workflows/deploy.yml` (déploiement automatique Staging `edge` sur `main`, déploiement Production sur tag `v*` protégé par l'environnement GitHub `production` avec sauvegarde `pg_dump`, `prisma migrate deploy`, healthcheck et rollback automatique).
    - `.github/workflows/history-check.yml` (vérifie que toute PR touchant `apps/`, `packages/` ou `prisma/` met à jour `HISTORY.md` + analyse SAST CodeQL) et `.github/dependabot.yml`.
- **Fichiers clés touchés** :
  - `docker/Dockerfile`, `docker/docker-entrypoint.sh`, `docker-compose.yml`, `.env.example`, `README.md`
  - `.github/workflows/{ci,release-sdk,docker-publish,deploy,history-check}.yml`, `.github/dependabot.yml`
- **Décisions et caveats** :
  - Le démon Docker Desktop n'étant pas démarré sur l'hôte Windows local (`npipe:////./pipe/dockerDesktopLinuxEngine` absent), la validation syntaxique et le test fonctionnel complet du serveur Next.js standalone, de `/api/health` et du bundle UMD sont exécutés directement via Node 22 + Vitest/Playwright en Phase 8.
- **Statut de vérification** : build OK / typecheck OK / tests 23/23 OK / lint OK

## [2026-11-26 01:02] Phase 8 : Vérification Finale de Sécurité, Audit Zéro `any` & Validation du Bundle UMD
- **Résumé des changements** :
  - Ajout de la suite d'audit de sécurité `apps/web/tests/security-audit.test.ts` vérifiant :
    1. L'absence totale de `any` explicite (`: any`, `as any`, `<any>`) dans l'intégralité du code source de `apps/web/src` et `packages/bloumeid/src`.
    2. Le rejet strict des origines CORS non autorisées (`403`) et des requêtes hors fenêtre temporelle anti-rejeu de `±5 minutes` (`400`) ou rejouées (`409`).
    3. Le chargement et l'exécution du bundle UMD (`public/sdk/v1/bloumeid.js`, 28.4 Ko < 150 Ko) dans un contexte navigateur isolé (`window.BloumeID`).
  - Exécution complète de `pnpm -r typecheck`, `pnpm -r lint`, `pnpm -r test` (26/26 tests passés : 9 dans `@bloumeid/sdk`, 17 dans `@bloumeid/web`) et `pnpm build`.
- **Fichiers clés touchés** :
  - `apps/web/tests/security-audit.test.ts`
  - `HISTORY.md`
- **Décisions et caveats** :
  - Toutes les actions réservées à validation humaine (section 9 : publication npm réelle hors CI, déploiement production SSH, secrets réels) ont été isolées dans `.env.example` et dans les workflows GitHub Actions protégés par approbation d'environnement.
- **Statut de vérification** : build OK / typecheck OK / tests 26/26 OK (SDK 9/9, Web 17/17) / lint OK

## [2026-11-26 01:30] Validation Live du Déploiement Docker (`docker compose up -d --build`)
- **Résumé des changements** :
  - Ajout de `.dockerignore` pour exclure les `node_modules` de l'hôte Windows lors de la copie du contexte Docker vers Node 22 Alpine.
  - Raffinement de `docker/Dockerfile` (`pnpm install --frozen-lockfile --prod=false`, conversion `CRLF -> LF` de `docker-entrypoint.sh`) et de `docker/docker-entrypoint.sh` (nettoyage du paramètre `?schema=public` de `DATABASE_URL` pour `pg_isready -d`, permettant une détection instantanée de PostgreSQL 17).
  - Test complet en conditions réelles avec `docker compose up -d --build` :
    - `bloumeid-db` (`postgres:17-alpine`) : `Up (healthy)`
    - `bloumeid-redis` (`valkey/valkey:8-alpine`) : `Up (healthy)`
    - `bloumeid-web` (`ghcr.io/bloume-sas/bloumeid:latest`) : `Up (healthy)`, migration `20261126000000_init` appliquée via `prisma migrate deploy`, synchronisation automatique de **54 133 CIDR** en mémoire (X4BNet VPN/Datacenter + Tor Bulk Exit List).
    - Smoke tests live réussis : `GET /api/health` (`200 OK`, `threatTrieCidrs: 54133`), `GET /sdk/v1/bloumeid.js` (`200 OK`), création d'un site en base PostgreSQL (`POST /api/admin/sites`), collecte d'empreinte signée (`POST /api/v1/fingerprint` avec détection live d'un nœud Tor `185.220.101.33` -> `isTor: true`), et vérification serveur (`GET /api/v1/requests/[requestId]` avec `bid_sec_`).
- **Fichiers clés touchés** :
  - `.dockerignore`
  - `docker/Dockerfile`
  - `docker/docker-entrypoint.sh`
  - `apps/web/package.json`
  - `HISTORY.md`
- **Statut de vérification** : docker compose build OK / 3 conteneurs healthy OK / prisma migrate deploy OK / smoke tests API live OK
