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
  - `packages/bloumeid` : Package npm publiable `@bloume/id` (compilé avec `tsup` en ESM, CJS, UMD global `window.BloumeID`, et déclarations `.d.ts`). **Zéro dépendance runtime** (`dependencies` vide).
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


---

## 7. Tags, Releases & Vérification des Workflows GitHub Actions
- **Création systématique de Tag & Release** : Après chaque push significatif sur `main`, l'agent DOIT créer un tag Git versionné (`vX.Y.Z`) et publier la GitHub Release correspondante (sur `BloumeSAS/BloumeID` et, si le SDK a changé, sur `BloumeSAS/bloumeid-sdk`).
- **Vérification obligatoire des Workflows** : L'agent DOIT vérifier l'état de tous les workflows GitHub Actions (`CI`, `sync-sdk-repo.yml`, `release-sdk.yml`, `publish.yml`) et s'assurer qu'ils sont tous verts avant de clôturer la tâche.

---

## 8. Workflow Git Automatique Obligatoire (Chaque Modification)
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

## 9. Versioning Dynamique & Bump SemVer Automatique
- **Source de vérité unique** : `apps/web/src/lib/version.ts` (`APP_VERSION` / `APP_VERSION_TAG`) lit dynamiquement `apps/web/package.json`. Il est **interdit de coder en dur `"1.0.0"`** dans les composants UI, l'API (`/api/health`), les métadonnées ou les dictionnaires i18n (`fr.json` / `en.json`).
- **Bump SemVer & README Auto-Sync Obligatoire** : Avant chaque commit/merge, exécuter `pnpm bump:version <patch|minor|major> [--all]` afin que l'UI, l'API, `package.json` et les `README.md` (`README.md` racine et `packages/bloumeid/README.md` avec `--all`) affichent **toujours** la version exacte à jour :
  - `patch` (`1.0.x`) : fix, ajustement CSS/UI mineur, traduction i18n, documentation.
  - `minor` (`1.x.0`) : nouvelle fonctionnalité (`feat`), refonte de page ou d'interface, ajout d'endpoints rétrocompatibles.
  - `major` (`x.0.0`) : breaking change majeur d'architecture, de schéma API ou de base de données.

---

## 10. Gouvernance Multi-Repos (`BloumeSAS/BloumeID` + `BloumeSAS/bloumeid-sdk`)
- **Double Contrôle Git Obligatoire** :
  - Le dépôt principal (`BloumeSAS/BloumeID`, racine) et le dépôt SDK (`BloumeSAS/bloumeid-sdk`, `packages/bloumeid/`) sont deux dépôts Git distincts imbriqués localement.
  - Sur `BloumeSAS/BloumeID`, `packages/bloumeid/` ne doit suivre **exclusivement que `packages/bloumeid/README.md`** (`packages/bloumeid/*` + `!packages/bloumeid/README.md` dans `.gitignore`). Toujours vérifier avec `git ls-files packages/bloumeid`.
  - À chaque modification touchant le SDK, exécuter d'abord le **Workflow Git Automatique Complet** (`checkout main` $\rightarrow$ `pull --rebase` $\rightarrow$ `checkout -b` $\rightarrow$ bump `--all` + build + tests $\rightarrow$ `commit` $\rightarrow$ `push` $\rightarrow$ `merge --no-ff` sur `main` $\rightarrow$ `push origin main` $\rightarrow$ suppression de branche) dans **`packages/bloumeid` (`BloumeSAS/bloumeid-sdk`)**, puis dans **`BloumeID` (`BloumeSAS/BloumeID`)**.

---

## 11. Sécurité Continue : GitHub Code Scanning & Pull Requests `dependabot[bot]`
- **Vérification & Correction Obligatoire du Code Scanning** : Avant de clôturer toute tâche significative (ou après chaque push sur `main`), l'agent DOIT vérifier les alertes ouvertes sur `https://github.com/BloumeSAS/BloumeID/security/code-scanning` (`gh api repos/BloumeSAS/BloumeID/code-scanning/alerts?state=open`) et **corriger immédiatement** toute alerte légitime (CodeQL, Trivy, Gitleaks) dans le cycle Git en cours.
- **Traitement Systématique des PRs `dependabot[bot]`** : L'agent DOIT également vérifier les Pull Requests ouvertes par `dependabot[bot]` (`gh pr list --author "app/dependabot" --state open`), auditer leur compatibilité (notamment Node.js LTS, Prisma, Next.js et Docker), réparer ou approuver/fusionner les mises à jour sûres, et fermer proprement avec explication toute PR incompatible (ex. version non-LTS).

---

## Studio Vidéo & Motion Graphics Obligatoire (BloumeID)
1. **Orchestration obligatoire des 7 Skills (`motion-graphics/`)** : Dès qu'une création ou mise à jour de vidéo est demandée pour **BloumeID**, tout agent ou développeur DOIT utiliser le studio local `motion-graphics/` et combiner systématiquement les **7 skills spécialisés** (`bloumeid-studio`, `explainer-default`, `explainer-high-energy`, `explainer-engaging`, `motion-broll`, `object-separation`, `sound-effects`), synchronisés avec `C:\Users\super\.claude\skills\`.
2. **Utilisation obligatoire des 14 éléments SFX (`sound-effects/sfx/*`) & Audio** : Chaque vidéo DOIT mixer une musique énergique libre de droits auto-duckée (`-18 dB`) avec le catalogue typé (`motion-graphics/src/audio/sfx-catalog.ts` généré par `index-sfx-bank.mjs`) exploitant les **13 banques SFX (`ambience`, `click`, `ding`, `glitch`, `impact`, `kit`, `pop`, `riser`, `tick`, `transition`, `typing`, `ui-blip`, `whoosh`) + `manifest.json`** avec rotation anti-répétition.
3. **Charte, Durée, Signature & Accélération Matérielle strictes** :
   - **Logo officiel sans fond** (`motion-graphics/public/brand/logo-transparent.png`) obligatoire en intro, filigrane HUD, miniature et outro.
   - **Signature permanente obligatoire en bas à droite (`<BloumeSasWatermark />`)** : Afficher sur **100 % des frames** (`16:9` et `9:16`) le badge vitré Clean Slate contenant à gauche le logo **Bloume SAS sans fond** (`motion-graphics/public/brand/bloume-sas-logo-transparent.png`, `24×24`) suivi à droite du texte **`By Bloume SAS`**.
   - **Capture réelle obligatoire sur instance locale strictement à jour** : Avant toute capture Playwright (`motion-graphics/scripts/capture-local-app.mjs`) de l'application sur `http://localhost:3000`, synchroniser `main`, rebuilder (`pnpm --filter @bloume/id build && pnpm build` / `docker compose`), vérifier `GET /api/health` === version exacte de `package.json`, puis nettoyer toute donnée de démo temporaire après capture.
   - **Thème Clean Slate** (`#090D16` / `#0F172A`, `#111827`, accents `#6366F1` / `#06B6D4` / `#10B981`, polices `Inter` + `JetBrains Mono`).
   - **Durée stricte entre 1 min (`60 s`) et 2 min (`120 s`)** à `60 fps` avec rétention visuelle (`5–10 s` par chapitre).
   - **Accélération GPU prioritaire (`h264_nvenc` + rendu Chromium ANGLE/WebGL)** couplée au parallélisme **multi-CPU**, et export **exclusivement au format `.mp4`** (`H.264 High yuv420p`, `+faststart`, AAC `320 kbps` `48 kHz` — interdiction formelle de `.mov`, `.webm`, `.mkv` ou `.avi`).
4. **Pack de Sortie Complet Systématique & Exclusion Git** : Chaque production doit générer un dossier dédié `motion-graphics/renders/<type>-<slug>-<YYYYMMDD>/` contenant impérativement **YouTube `16:9` (`.mp4`) + Short `9:16` (`.mp4`) + Miniature `1280×720` (`.png` + `.jpg` < 2 Mo)** + `project.json` + `script.md`. Ne jamais commiter ni pousser `motion-graphics/`, `renders/`, `*.mp4`, `*.wav` ou `*.mp3` dans `BloumeSAS/BloumeID`.
