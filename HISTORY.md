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

## [2026-11-26 02:28] BloumeID v1.0.0 — Phase 1 : Clean Slate Theme, Responsive Admin Shell & Landing Page
- **Résumé des changements** :
  - Passage de toutes les versions de packages (`package.json`, `apps/web/package.json`, `packages/bloumeid/package.json`) à **`1.0.0`**.
  - Intégration du thème **Clean Slate** (`https://tweakcn.com/r/themes/clean-slate.json`) dans `apps/web/src/app/globals.css` avec support complet du **Light Mode** et du **Dark Mode**, tout en préservant `--font-sans` (`Inter`), `--font-mono` (`JetBrains Mono`) et `--font-serif` (`Georgia, "Times New Roman", serif`).
  - Mise à jour de `I18nProvider` (`apps/web/src/i18n/provider.tsx`) pour gérer la bascule persistante Light/Dark (`theme`, `toggleTheme`), le sélecteur global de site (`selectedSiteId`) et le sélecteur de période (`1h`, `24h`, `7d`, `30d`, `90d`).
  - Refonte 100 % responsive de `DashboardShell` (`apps/web/src/components/dashboard-shell.tsx`) : sidebar repliable sur Desktop (`lg:`), barre supérieure sticky avec tiroir `Sheet` sur Mobile/Tablette (`< lg`), sélecteur de site global, sélecteur de période et indicateur temps réel du moteur Threat Intel.
  - Refonte de la Landing Page (`apps/web/src/app/page.tsx`) pour **BloumeID v1.0.0** avec widget de scan live, matrice comparative 4 colonnes (**BloumeID v1.0.0 vs. ThumbmarkJS vs. Fingerprint.com vs. CreepJS**) et onglets d'intégration Dual API + Coolify Docker.
- **Fichiers clés touchés** :
  - `package.json`, `apps/web/package.json`, `packages/bloumeid/package.json`
  - `apps/web/src/app/globals.css`, `apps/web/src/i18n/provider.tsx`, `apps/web/src/i18n/dictionaries/{en,fr}.json`
  - `apps/web/src/components/dashboard-shell.tsx`, `apps/web/src/app/page.tsx`
- **Statut de vérification** : Phase 1 prête pour Phase 2 (SDK v1.0.0 70+ signaux & Dual API)

## [2026-11-26 02:33] BloumeID v1.0.0 — Phase 2 : SDK 70+ Signaux, Sondes Prototypes/VM & Dual API (`ThumbmarkJS` + `Fingerprint.com`)
- **Résumé des changements** :
  - Extension de `@bloumeid/sdk` (`v1.0.0`) à **72 signaux déterministes** dans `packages/bloumeid/src/collectors.ts` :
    - **WebGL étendu** : `MAX_TEXTURE_SIZE`, `MAX_VIEWPORT_DIMS`, `MAX_VERTEX_UNIFORM_VECTORS`, `ALIASED_LINE_WIDTH_RANGE`, précision des shaders et `pixelRenderHash` déterministe.
    - **WebGPU profond** : `adapter.info` (`vendor`, `architecture`, `device`), `adapter.features` triées et limites (`maxTextureDimension2D`, `maxBindGroups`).
    - **Canvas Winding & Sous-pixels Unicode/Emoji `TextMetrics`** : `actualBoundingBoxAscent`/`Descent` sur `🇺🇳`, `👨‍👩‍👧‍👦`, `﷽`, `🏴‍☠️`, `🧘🏽‍♂️`.
    - **Matrice CSS Media & Préférences** (`collectCssMediaMatrix`) : `prefers-color-scheme`, `prefers-reduced-motion`, `prefers-contrast`, `forced-colors`, `dynamic-range: high`, `color-gamut`, `any-pointer`, `any-hover`, `globalPrivacyControl`.
    - **Codecs Multimédia & Périphériques** (`collectMediaCodecs`) : compteurs `enumerateDevices()` (`audioinput`, `videoinput`, `audiooutput`), matrice `canPlayType` (AV1, HEVC, VP9, Opus, FLAC) et `navigator.keyboard.getLayoutMap()`.
  - Extension des sondes anti-spoof (`packages/bloumeid/src/probes.ts`) : détection de GPU logiciel / VM (`SwiftShader`, `llvmpipe`, `VirtualBox`, `VMware`, `Parallels`, `QEMU`), inspection des hooks sur les prototypes natifs via `Function.prototype.toString` (`Navigator.prototype.userAgent`, `HTMLCanvasElement.prototype.toDataURL`, `AudioBuffer.prototype.getChannelData`, `WebGLRenderingContext.prototype.getParameter`), géométrie `outerWidth === 0`, cohérence `Error.stack` vs `User-Agent` et cohérence DST `Intl` vs `getTimezoneOffset()`.
  - **Double compatibilité d'API** (`packages/bloumeid/src/index.ts`) :
    - Mode **ThumbmarkJS Pro** : `new BloumeID({ apiKey, endpoint, options })` -> `get()`, `getFingerprint()`, `getFingerprintData()`.
    - Mode **Fingerprint.com (`@fingerprintjs/fingerprintjs-pro`)** : `FingerprintJS.load({ apiKey, endpoint, region })` et `BloumeID.load()` -> `agent.get({ extendedResult: true, linkedId, tag })`, retournant `visitorId`, `requestId`, `visitorFound`, `confidence: { score, revision: "1.0.0" }`, `incognito`, `browserName`, `browserVersion`, `os`, `osVersion`, `device`, `ip`, `ipLocation`, `firstSeenAt`, `lastSeenAt`, `thumbmark` et `info`.
- **Fichiers clés touchés** :
  - `packages/bloumeid/src/{types,collectors,probes,index,umd,index.test}.ts`
  - `apps/web/public/sdk/v1/bloumeid.js` (36.52 Ko brut < 150 Ko)
- **Statut de vérification** : build OK (UMD 36.5 Ko) / typecheck OK / tests 8/8 OK / lint OK

## [2026-11-26 02:39] BloumeID v1.0.0 — Phase 3 : Auto GeoLite2 Downloader, Migration Prisma Additive & API Fingerprint.com
- **Résumé des changements** :
  - Implémentation du téléchargeur/extracteur automatique double-mode MaxMind GeoLite2 `.mmdb` dans `apps/web/src/lib/engine/geoip.ts` :
    - **Mode A (`official_maxmind`)** : télécharge les archives `.tar.gz` officielles via `MAXMIND_LICENSE_KEY` et extrait les binaires `.mmdb` en mémoire via `zlib.gunzipSync` + parseur d'en-têtes POSIX tar 512 octets.
    - **Mode B (`open_mirror`)** : télécharge automatiquement sans configuration les fichiers `GeoLite2-City.mmdb` et `GeoLite2-ASN.mmdb` depuis un miroir communautaire open-source si aucune clé de licence n'est fournie, avec rechargement à chaud des lecteurs `maxmind`.
  - Ajout de la migration Prisma additive `apps/web/prisma/migrations/20261126023000_v1_rules_webhooks_dual_api/migration.sql` : modèles `SecurityRule` et `WebhookDelivery`, colonnes `trustStatus` / `mergedIntoId` sur `Visitor`, et `latitude` / `longitude` / `ruleAction` / `matchedRuleId` / `linkedId` / `tag` sur `FingerprintEvent`.
  - Implémentation du moteur de règles `apps/web/src/lib/engine/rules.ts` (`allow`, `challenge`, `block`, `flag`) et vérification `Sec-CH-UA-Platform` (`evaluateClientHintsConsistency`).
  - Ajout des endpoints Server API compatibles Fingerprint.com : `POST /api/v1/events`, `GET /api/v1/events/[requestId]` (schéma `products.identification`, `botd`, `vpn`, `tor`, `tampering`, `suspectScore`) et `GET /api/v1/visitors/[visitorId]/visits`.
- **Fichiers clés touchés** :
  - `apps/web/prisma/schema.prisma`, `apps/web/prisma/migrations/20261126023000_v1_rules_webhooks_dual_api/migration.sql`
  - `apps/web/src/lib/engine/{geoip,feeds,rules,network,repository}.ts`
  - `apps/web/src/app/api/v1/{fingerprint,events}/**`, `apps/web/src/app/api/v1/visitors/[visitorId]/visits/route.ts`
  - `apps/web/src/app/api/admin/{events,rules,dashboard,sites,visitors,settings}/route.ts`
- **Statut de vérification** : Endpoints & schéma Prisma prêts pour les pages Admin Phase 4

## [2026-11-26 02:45] Phase 14 : Cap-Style Deep Analytics & Complete Pro Admin Panel (v1.0.0)
- Résumé des changements :
  - `/dashboard` : Graphique chronologique empilé Cap-style (Clean vs Suspicious vs Blocked/Malicious), 8 cartes KPI, classements Top Countries (drapeau, code ISO, barre de progression, score de risque moyen) et Top ASNs (numéro ASN monospace copiable, organisation, pourcentage de trafic risqué), et répartition Navigateurs/OS.
  - `/events` : Journal d'audit temps réel avec bascule Live Polling (5 s), filtres multicritères (Site, Danger, Pays, ASN, Action, Recherche `req_`/`vis_`/IP), export CSV/JSON et tiroir d'inspection forensique (`Sheet`).
  - `/rules` : Interface complète du moteur de règles de sécurité personnalisées (`allow`, `challenge`, `block`, `flag`) avec priorité, compteur d'activations (`hitCount`) et suppression.
  - `/visitors` & `/visitors/[visitorId]` : Statut de confiance (`Neutral` / `Trusted` / `Blocked`), boutons d'action rapide (Trust, Block, Reset) et outil de fusion d'identités (`Merge Visitor IDs`).
  - `/sites` : Badges de volume `requests24h` / `requests30d`, tableau des livraisons de webhooks récentes (`WebhookDelivery`) et onglet d'intégration `Fingerprint.com Mode`.
  - `/playground` : Sélecteur bi-mode permettant d'exécuter en direct le SDK en mode `ThumbmarkJS Pro` ou `Fingerprint.com (FingerprintJS Pro)`.
  - `/settings` : Gestionnaire GeoLite2 avec bouton de téléchargement/mise à jour immédiate et testeur interactif de résolution IP en direct (`Live IP Lookup Tester`).
- Fichiers clés touchés : `apps/web/src/app/(dashboard)/dashboard/page.tsx`, `apps/web/src/app/(dashboard)/events/page.tsx`, `apps/web/src/app/(dashboard)/rules/page.tsx`, `apps/web/src/app/(dashboard)/visitors/page.tsx`, `apps/web/src/app/(dashboard)/visitors/[visitorId]/page.tsx`, `apps/web/src/app/(dashboard)/sites/page.tsx`, `apps/web/src/app/(dashboard)/playground/page.tsx`, `apps/web/src/app/(dashboard)/settings/page.tsx`.
- Décisions et caveats :
  - 100 % des chaînes UI proviennent des dictionnaires `en.json` et `fr.json`.
- Statut de vérification : UI & routes prêtes pour validation globale

## [2026-11-26 02:51] Phase 15 : Modular Coolify Docker Deployments & Final Verification (v1.0.0)
- Résumé des changements :
  - Création du `Dockerfile` à la racine du dépôt (compatible Coolify 1-Click Dockerfile Buildpack) en complément de `docker/Dockerfile`.
  - Mise à jour de `docker-compose.yml` (Option 1 : pile tout-en-un auto-hébergée `bloumeid-web` + `postgres:17-alpine` + `valkey/valkey:8-alpine` avec prise en charge optionnelle de `MAXMIND_LICENSE_KEY`).
  - Création de `docker-compose.external-db.yml` (Option 2 : déploiement modulaire `bloumeid-web` seul connecté à des instances PostgreSQL et Redis/Valkey externes gérées par Coolify ou cloud).
  - Mise à jour de `.env.example` et de `README.md` avec le guide complet de déploiement Coolify 1-Click (3 topologies) et la documentation Dual API (`ThumbmarkJS Pro` + `Fingerprint.com`).
  - Mise à jour des suites de tests `apps/web/tests/admin.test.ts` et `apps/web/tests/engine.test.ts` pour couvrir `/api/v1/events`, `/api/v1/events/[requestId]`, `/api/v1/visitors/[visitorId]/visits`, `/api/admin/events`, `/api/admin/rules`, l'extracteur `.tar.gz` GeoLite2, le testeur IP interactif et la vérification `useI18n()` sur les 10 pages.
  - Reconstruction et redémarrage de la pile Docker live (`docker compose up -d --build`) : migration additive `20261126023000_v1_rules_webhooks_dual_api` appliquée automatiquement par `prisma migrate deploy`, `GET /api/health` retourne `200 OK` (`version: "1.0.0"`).
- Fichiers clés touchés : `Dockerfile`, `docker-compose.yml`, `docker-compose.external-db.yml`, `.env.example`, `README.md`, `apps/web/tests/admin.test.ts`, `apps/web/tests/engine.test.ts`, `HISTORY.md`.
- Décisions et caveats :
  - L'ensemble du monorepo cible strictement la version `1.0.0`.
- Statut de vérification : build OK / typecheck OK / tests 26/26 (8 SDK + 18 Web) / lint OK / Docker Live Stack `1.0.0` OK

## [2026-11-26 03:09] Phase 16 : UI/UX Polish, Categorized Sidebar & TryCap-Style 2x2 Analytics Grid
- Résumé des changements :
  - Correction de la barre de navigation de la page d'accueil (`apps/web/src/app/page.tsx`) : badges `whitespace-nowrap`, espacement `gap-4` et liens sur une seule ligne (`whitespace-nowrap`), ainsi que correction de la disposition des cartes du scanner live (`flex-wrap items-start justify-between gap-2`) pour éliminer tout chevauchement entre les titres et les badges.
  - Refonte complète de la barre latérale d'administration (`apps/web/src/components/dashboard-shell.tsx`) :
    - Bouton de réduction flottant positionné sur la bordure droite (`-right-3 top-5`) afin de ne jamais chevaucher l'icône du logo en mode réduit (`w-[72px]`).
    - Organisation structurée par catégories (`Analytique & Télémétrie`, `Identité & Protection`, `Plateforme & Infra`) avec séparateurs propres en mode icônes.
  - Refonte de la grille analytique `/dashboard` (`apps/web/src/app/(dashboard)/dashboard/page.tsx` et `apps/web/src/lib/engine/repository.ts`) sur le modèle de **TryCap (`trycap.dev`)** :
    - Carte **Localisation (`Location`)** : Bascule interactive entre la **Vue Liste** (drapeaux, barres de progression horizontales ombrées derrière chaque ligne, compteurs formatés `2k` et pourcentages) et la **Vue Carte Mondiale SVG (`World Map`)** avec régions et points chauds lumineux.
    - Carte **Réseaux (`Networks` — FAI / ASN)** : Classement des opérateurs et hébergeurs (`Orange S.A.`, `Free SAS`, `Bouygues Telecom SA`, `SFR`, `Mullvad VPN`, `Sunrise GmbH`, `Hetzner`, `M247`, `Free Mobile`, `PacketHub`, `OVH`, `Vodafone`) avec logos/badges colorés, barres de remplissage horizontales, étiquettes `VPN/DC`, recherche instantanée (`Search`) et pourcentages.
    - Carte **Plateformes (`Platform`)** : Graphique en anneau (`Donut PieChart`) avec légende détaillée (`Mobile`, `Ordinateur`, `Tablette`), volumes et parts en `%`.
    - Carte **Systèmes (`OS`) & Navigateurs (`Browsers`)** : Barres horizontales ombrées avec icônes (`iOS`, `Windows`, `Android`, `macOS`, `Linux`, `iPadOS`) et sélecteur intégré `OS / Navigateurs`.
- Fichiers clés touchés : `apps/web/src/app/page.tsx`, `apps/web/src/components/dashboard-shell.tsx`, `apps/web/src/app/(dashboard)/dashboard/page.tsx`, `apps/web/src/lib/engine/repository.ts`, `apps/web/src/lib/engine/geoip.ts`, `apps/web/src/types/index.ts`, `apps/web/src/i18n/dictionaries/en.json`, `apps/web/src/i18n/dictionaries/fr.json`, `HISTORY.md`.
- Statut de vérification : build OK / typecheck OK / tests 26/26 / lint OK / Docker Live Stack reconstruite et active

## [2026-11-26 03:22] Phase 17 : Authentic Natural Earth 110m World Map Choropleth & Inline SVG Country Flags
- Résumé des changements :
  - Remplacement de la carte schématique par la véritable topologie mondiale **Natural Earth 110m (`world-atlas`)** comprenant **176 vrais polygones de pays** projetés en SVG haute précision (`apps/web/src/components/world-map-data.ts` et `apps/web/src/components/world-map.tsx`).
  - Coloration choroplèthe par intensité de trafic (exactement comme `trycap.dev` : France en bleu lumineux `#60a5fa`, pays actifs en dégradés `#3b82f6` / `#2563eb`, autres pays en `#1e293b` avec frontières `#0f172a` et infobulle interactive au survol avec drapeau, nom du pays, volume et `%`).
  - Création du composant `CountryFlag` (`apps/web/src/components/ui/country-flag.tsx`) dessinant de vrais drapeaux vectoriels SVG (`FR`, `CH`, `US`, `DE`, `NL`, `GB`, `CA`, `IT`, `MA`, `PT`, `IN`, `BE`, `SN`, `ES`) au lieu des emojis Unicode qui s'affichent sous forme de lettres `FR FR` sous Windows.
  - Ajout des vraies icônes vectorielles de systèmes d'exploitation (`Apple iOS/macOS/iPadOS`, `Windows`, `Android`, `Linux`) dans la carte `Systèmes (OS)`.
- Fichiers clés touchés : `apps/web/src/components/world-map-data.ts`, `apps/web/src/components/world-map.tsx`, `apps/web/src/components/ui/country-flag.tsx`, `apps/web/src/app/(dashboard)/dashboard/page.tsx`, `HISTORY.md`.
- Statut de vérification : build OK / typecheck OK / tests 26/26 / lint OK / Docker Live Stack reconstruite et active
