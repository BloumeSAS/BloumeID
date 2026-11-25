# AGENTS.md — Règles de Gouvernance Non Négociables (BloumeID)

Ce document définit les règles strictes applicables à tous les agents IA et développeurs humains travaillant sur le dépôt **BloumeID** (Bloume SAS).

---

## 1. Protocole de Session
- **Lecture obligatoire** : Avant de modifier ou créer le moindre fichier, tout agent ou développeur DOIT lire `AGENTS.md` et `HISTORY.md` dans leur intégralité.
- **Journalisation** : Après chaque phase ou étape significative, `HISTORY.md` DOIT être mis à jour (mode append-only) avec la date, le résumé des changements, les fichiers clés touchés, les décisions/caveats et le statut de vérification (`build`, `typecheck`, `tests`, `lint`).
- **Exécution séquentielle** : Une phase ne peut être considérée terminée que lorsque le typecheck, le linter, les tests et le build sont intégralement verts.

---

## 2. Architecture du Monorepo
- **Gestionnaire de paquets** : `pnpm` (workspaces).
- **Applications & Packages** :
  - `apps/web` : Application Next.js 16 (App Router, `output: "standalone"`), hébergeant le panneau d'administration, l'API REST publique/interne, le moteur de réconciliation & threat intelligence, et la distribution du bundle UMD (`/sdk/v1/bloumeid.js`).
  - `packages/bloumeid` : Package npm publiable `@bloumeid/sdk` (compilé avec `tsup` en ESM, CJS, UMD global `window.BloumeID`, et déclarations `.d.ts`). **Zéro dépendance runtime** (`dependencies` vide).
- **Configuration partagée** : TypeScript strict et ESLint partagés à l'échelle du workspace.

---

## 3. Sécurité & Cryptographie
- **Identifiants publics Snowflake uniquement** : Aucun `id` entier auto-incrémenté (PostgreSQL) ne doit jamais être exposé dans une API, une URL, un log client ou une prop React. Seuls les `publicId` préfixés sont exposés :
  - `site_<snowflake>` : Identifiant de site
  - `vis_<snowflake>` : Identifiant de visiteur
  - `req_<snowflake>` : Identifiant d'événement / requête fingerprint
  - `bid_pub_<token>` : Clé d'API publique (collecte client)
  - `bid_sec_<token>` : Clé d'API secrète (vérification serveur, stockée hashée SHA-256 en base)
- **Comparaison en temps constant** : Toute vérification de secret (`ADMIN_MASTER_KEY`, clés secrètes `bid_sec_`, signatures HMAC de webhooks ou cookies) DOIT utiliser `crypto.timingSafeEqual` sur des buffers de même longueur.
- **Rate Limiting** : Limitation de débit en fenêtre glissante via Redis/Valkey sur l'authentification admin (`/api/admin/auth/login`) et sur l'endpoint public `/api/v1/fingerprint`.
- **CORS strict par site** : Validation dynamique de l'en-tête `Origin` par rapport à la liste `domains` du site associé à la clé publique `bid_pub_` (support des domaines exacts et wildcards `*.domaine.tld`).
- **Signature anti-rejeu (Compromis architectural documenté)** :
  - Côté navigateur, la clé publique `bid_pub_` est par définition visible par le client. Une signature HMAC calculée dans le navigateur ne constitue donc **pas** une preuve cryptographique d'authenticité contre un attaquant dédié, mais un mécanisme d'**intégrité et d'anti-rejeu** (payload signé avec timestamp + nonce aléatoire à usage unique stocké dans Redis avec TTL court, rejetant toute requête hors fenêtre temporelle de ±5 minutes ou tout nonce déjà consommé).
  - L'authenticité côté collecte repose sur le couple (`bid_pub_`, validation stricte `Origin` CORS, rate-limiting IP/Site, et corrélation réseau/TLS JA4).
  - La preuve cryptographique forte est réservée aux appels serveur-à-serveur via la clé secrète `bid_sec_` (`BloumeIDServer.verifyRequest` / `getVisitor`) et aux webhooks sortants signés avec `X-BloumeID-Signature` (HMAC-SHA256 avec `webhookSecret`).
- **Validation des entrées** : Toutes les routes d'API (`POST`, `PATCH`, `PUT`, `GET` query params) doivent valider leurs entrées avec **Zod**.

---

## 4. Qualité du Code & Internationalisation (i18n)
- **TypeScript Strict** : `strict: true` partout. **Zéro `any`** autorisé dans le code source. Les types partagés de l'application sont centralisés dans `src/types/`.
- **Zéro chaîne UI en dur** : Toutes les chaînes de caractères affichées dans l'interface utilisateur doivent provenir des dictionnaires `apps/web/src/i18n/dictionaries/en.json` et `apps/web/src/i18n/dictionaries/fr.json`. Un test automatisé vérifie la parité exacte des clés entre `en.json` et `fr.json` ainsi que l'absence de texte en dur.

---

## 5. Design System & UI
- **Composants** : `shadcn/ui` exclusivement, thème **Cosmic Night** (dark mode par défaut, palette violet profond / indigo cosmique).
- **Typographie** :
  - Sans-serif : `Inter` (`--font-sans`)
  - Monospace : `JetBrains Mono` (`--font-mono`) — obligatoire pour tous les hashes, adresses IP, numéros ASN, clés API et identifiants Snowflake, systématiquement accompagnés d'un bouton de copie rapide.
  - Serif : Pile système `Georgia, "Times New Roman", serif` (`--font-serif` dans `globals.css`, Georgia n'étant pas une police Google Fonts).

---

## 6. Base de Données & Opérations Critiques
- **Zéro reset destructif** : Interdiction formelle d'exécuter `prisma migrate reset`, `prisma db push --force-reset` ou `DROP` sur une base partagée ou de production.
- **Migrations versionnées** : Les schémas sont gérés via des migrations commitées dans `prisma/migrations/`. En production, `prisma migrate deploy` est exécuté de manière contrôlée après sauvegarde (`pg_dump`) et validation humaine sur l'environnement GitHub `production`.
- **Actions soumises à validation humaine explicite** :
  1. Migration ou suppression de données en production.
  2. Publication npm réelle hors workflow CI (`npm publish`) ou poussée de tags de release.
  3. Déploiement en production, rotation de secrets réels ou modification des règles de protection GitHub.

