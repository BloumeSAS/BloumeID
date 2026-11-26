<div align="center">

# BloumeID v1.0.0

**Plateforme Self-Hosted de Fingerprinting (104+ Signaux), Anti-Spoofing & Threat Intelligence**

[![Version](https://img.shields.io/badge/version-1.0.0-635bff?style=for-the-badge)](https://github.com/BloumeSAS/BloumeID)
[![License](https://img.shields.io/badge/license-MIT-10b981?style=for-the-badge)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=nextdotjs)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178c6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org)
[![npm @bloume/id](https://img.shields.io/badge/npm-%40bloume%2Fid-cb3837?style=for-the-badge&logo=npm)](https://www.npmjs.com/package/@bloume/id)
[![Docker Ready](https://img.shields.io/badge/Docker-Ready-2496ed?style=for-the-badge&logo=docker)](Dockerfile)

[Documentation](#-intégration-du-sdk-bloumeid) • [Déploiement Coolify](#-option-1--déploiement-1-clic-sur-coolify) • [Package npm `@bloume/id`](https://www.npmjs.com/package/@bloume/id) • [Signaler un bug](https://github.com/BloumeSAS/BloumeID/issues)

</div>

---

## Pourquoi choisir BloumeID ?

**BloumeID** (par **Bloume SAS**) est l'alternative open-source et auto-hébergée conçue pour remplacer à la fois **Fingerprint.com (FingerprintJS Pro)** et **ThumbmarkJS Pro** sans aucun coût par requête ni dépendance cloud tierce :

- **104+ Signaux Déterministes & Sondes Anti-Spoof** : Canvas 2D + sous-pixels Emoji, WebGL 1/2 + pixel hash 3D, WebGPU, OfflineAudioContext, 85+ polices OS, matrice CSS Media, codecs multimédia, détection de hooks `Function.prototype.toString`, GPU virtuels (`SwiftShader`, `llvmpipe`, `VMware`), et bots (`Playwright`, `Puppeteer`, `Selenium`, CDP).
- **Dual API Drop-In** : Compatible nativement avec `new BloumeID().get()` (ThumbmarkJS) **et** `FingerprintJS.load().then(fp => fp.get())` (Fingerprint.com).
- **Auto-Sync GeoLite2 & Arbre CIDR Radix (54 000+ plages)** : Résolution Pays, Ville, ASN, VPN, Tor et Datacenter en `< 1 ms` en mémoire.
- **Console Admin PRO (`Clean Slate` Light & Dark)** : Carte mondiale choroplèthe 176 pays, classements FAI/ASN, Rule Engine (`allow` / `challenge` / `block` / `flag`), Assistant de Migration IA (`/migrate`), Smart Signals, Health, Security & Webhooks HMAC optionnels.

---

## Tableau Comparatif

| Capacité / Architecture | **BloumeID v1.0.0** | ThumbmarkJS (OSS / Pro) | Fingerprint.com (Pro) | CreepJS (OSS) |
| :--- | :---: | :---: | :---: | :---: |
| **100 % Gratuit & Self-Hosted (MIT)** | ✅ Oui | ⚠️ SaaS Payant | ❌ SaaS ($99–$2000+/m) | ✅ OSS (Sans backend) |
| **Dual API (ThumbmarkJS + Fingerprint.com)** | ✅ Natif | ❌ ThumbmarkJS seul | ❌ Fingerprint seul | ❌ JSON custom |
| **104+ Signaux Matériel, WebGL2, WebGPU, Audio** | ✅ 104+ signaux | ⚠️ ~35 signaux | ✅ Oui | ✅ Oui |
| **Réconciliation Cross-Browser & Incognito** | ✅ 3 Niveaux | ⚠️ SaaS Payant | ⚠️ SaaS Payant | ❌ Non |
| **GeoLite2 Auto-Sync + Trie CIDR VPN/Tor (<1ms)** | ✅ Inclus | ❌ Non | ⚠️ SaaS Payant | ❌ Non |
| **Rule Engine, Webhooks Optionnels & Migration IA** | ✅ Inclus | ❌ Non | ⚠️ SaaS Payant | ❌ Non |

---

## Architecture Technique

```
Navigateur (@bloume/id UMD ou npm)
        │  Payload signé HMAC-SHA256 (anti-rejeu ±5min + nonce Redis)
        ▼
Reverse Proxy (Nginx / Caddy / Traefik / Cloudflare) ──► X-JA4-Fingerprint + Real IP
        │
        ▼
Next.js 16 Control Plane (apps/web)
  ├── Trie CIDR Radix en mémoire (54k+ VPN / Tor / Datacenter) + GeoLite2 .mmdb
  ├── Moteur de Réconciliation 3 Niveaux (fullHash -> hardwareHash+/24 -> Snowflake vis_)
  ├── Rule Engine (allow / challenge / block / flag) + Webhooks HMAC Optionnels
  ├── Valkey / Redis 8 (Rate limiting glissant, Nonces, Vélocité)
  └── PostgreSQL 17 + Prisma ORM
```

---

## Installation & Déploiement Rapide

### Option 1 : Déploiement 1-Clic sur Coolify
1. Créez une nouvelle ressource **Docker Compose** dans Coolify pointant vers `https://github.com/BloumeSAS/BloumeID`.
2. Choisissez :
   - `docker-compose.yml` : Stack tout-en-un (`bloumeid-web` + `PostgreSQL 17` + `Valkey 8`).
   - `docker-compose.external-db.yml` : Application seule connectée à vos bases PostgreSQL et Redis externes.
   - `Dockerfile` : Buildpack Dockerfile racine.
3. Configurez `ADMIN_MASTER_KEY`, `ADMIN_USERNAME` et `BLOUMEID_PUBLIC_URL`, puis déployez.

### Option 2 : Docker Compose Local
```bash
git clone https://github.com/BloumeSAS/BloumeID.git
cd BloumeID
cp .env.example .env
docker compose up -d --build
```

### Variables d'Environnement (`.env`)

| Variable | Description | Défaut |
| :--- | :--- | :--- |
| `ADMIN_MASTER_KEY` | Clé secrète d'accès à la console `/login` | `bloumeid_dev_master_key_2026` |
| `ADMIN_USERNAME` | Nom d'administrateur affiché dans la Top Navbar | `Jules` |
| `DATABASE_URL` | Chaîne de connexion PostgreSQL 17 | `postgresql://bloumeid:...@bloumeid-db:5432/bloumeid` |
| `REDIS_URL` | URL Valkey / Redis 8 | `redis://bloumeid-redis:6379` |
| `BLOUMEID_PUBLIC_URL` | URL publique de votre instance | `http://localhost:3000` |
| `MAXMIND_LICENSE_KEY` | Clé MaxMind optionnelle (sinon miroir open-source auto) | `""` |
| `NPM_TOKEN` | Jeton npm optionnel pour `pnpm release:sdk` | `""` |

---

## Intégration du SDK `@bloume/id`

```bash
pnpm add @bloume/id
```

### Mode ThumbmarkJS Pro
```typescript
import { BloumeID } from "@bloume/id";

const client = new BloumeID({
  apiKey: "bid_pub_YOUR_SITE_KEY",
  endpoint: process.env.NEXT_PUBLIC_BLOUMEID_PUBLIC_URL,
});

const result = await client.get();
console.log(result.visitorId, result.requestId, result.info.dangerLevel);
```

### Mode Fingerprint.com (`@fingerprintjs/fingerprintjs-pro`)
```typescript
import FingerprintJS from "@bloume/id";

const fp = await FingerprintJS.load({
  apiKey: "bid_pub_YOUR_SITE_KEY",
  endpoint: process.env.NEXT_PUBLIC_BLOUMEID_PUBLIC_URL,
});

const result = await fp.get({ extendedResult: true, linkedId: "user_42" });
console.log(result.visitorId, result.ipLocation, result.incognito);
```

### Vérification Serveur (`@bloume/id/server`)
```typescript
import { BloumeIDServer } from "@bloume/id/server";

const server = new BloumeIDServer({
  secretKey: process.env.BLOUMEID_SECRET_KEY!,
  endpoint: process.env.BLOUMEID_PUBLIC_URL!,
});

const verified = await server.verifyRequest(requestId);
if (verified.dangerLevel >= 3 || verified.flags.isBot) {
  throw new Error("Blocked high-risk request");
}
```

---

## Licence & Crédits

Distribué sous licence **MIT** par **Bloume SAS** ([bloume.fr](https://bloume.fr)) — [https://github.com/BloumeSAS/BloumeID](https://github.com/BloumeSAS/BloumeID).
