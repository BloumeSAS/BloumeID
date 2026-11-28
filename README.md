<div align="center">

<img src="apps/web/public/brand/logo.png" alt="BloumeID Logo" width="104" />

# BloumeID v1.10.8

**Plateforme Open-Source Self-Hosted de Fingerprinting (104 Signaux), Anti-Spoofing & Threat Intelligence**

[![Version](https://img.shields.io/badge/version-v1.10.8-635bff?style=for-the-badge)](https://github.com/BloumeSAS/BloumeID/releases)
[![SDK @bloume/id](https://img.shields.io/badge/SDK_%40bloume%2Fid-v1.3.1-cb3837?style=for-the-badge&logo=npm)](https://www.npmjs.com/package/@bloume/id)
[![License](https://img.shields.io/badge/license-MIT-10b981?style=for-the-badge)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=nextdotjs)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178c6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org)
[![Docker & Coolify](https://img.shields.io/badge/Docker_%26_Coolify-Ready-2496ed?style=for-the-badge&logo=docker)](docker/Dockerfile)

[Avantages Clés](#-pourquoi-choisir-bloumeid-) • [Comparatif](#-tableau-comparatif-technique) • [Architecture](#-architecture--flux-de-données) • [Déploiement Coolify & Docker](#-déploiement-rapide-coolify--docker-compose) • [SDK `@bloume/id`](#-intégration-du-sdk-bloumeid) • [Multi-Repos](#-structure-multi-repos)

</div>

---

## Pourquoi choisir BloumeID ?

**BloumeID** (développé par **[Bloume SAS](https://bloume.fr)**) est l'alternative open-source et auto-hébergée conçue pour remplacer **Fingerprint.com Pro** et **ThumbmarkJS Pro** sans coût par requête ni dépendance SaaS tierce :

- **104 Signaux Déterministes & Sondes Anti-Spoof** : Canvas 2D + sous-pixels Emoji, WebGL 1/2 + pixel hash 3D, WebGPU, OfflineAudioContext, 85+ polices OS, matrice CSS Media, codecs multimédia, détection de hooks `Function.prototype.toString`, GPU virtuels (`SwiftShader`, `llvmpipe`, `VMware`), et bots (`Playwright`, `Puppeteer`, `Selenium`, CDP).
- **Zéro Coût par Requête** : 100 % illimité sur votre propre infrastructure (`PostgreSQL 17` + `Valkey / Redis 8`).
- **Compatibilité Native Dual-API** : Drop-in replacement pour **`ThumbmarkJS`** (`new BloumeID().get()`) **et** **`Fingerprint.com`** (`FingerprintJS.load().then(fp => fp.get())`).
- **GeoLite2 + Trie CIDR Radix (54 000+ plages)** : Résolution Pays, Ville, ASN, VPN, Proxy, Tor et Datacenter en `< 1 ms` en mémoire, avec synchronisation automatique.
- **Rule Engine SOC & Webhooks HMAC** : Règles dynamiques (`allow` / `challenge` / `block` / `flag`) et alertes temps réel signées `X-BloumeID-Signature` (HMAC-SHA256) avec protection anti-SSRF.
- **Console Admin PRO (`Clean Slate` Light & Dark)** : Carte choroplèthe 176 pays, classements FAI/ASN, pagination serveur unifiée, journal d'audit Snowflake (`site_`, `vis_`, `req_`), assistant de migration IA (`/migrate`).

---

## Tableau Comparatif Technique

| Capacité / Architecture | **BloumeID v1.10.8** | Fingerprint.com Pro | ThumbmarkJS Pro |
| :--- | :---: | :---: | :---: |
| **Licence & Hébergement** | ✅ **MIT / 100 % Self-Hosted** | ❌ SaaS Propriétaire | ⚠️ SaaS Payant |
| **Coût par requête** | ✅ **0 € (Illimité)** | ❌ $99 – $2 000+ / mois | ❌ Payant au volume |
| **Signaux collectés** | ✅ **104 signaux + Anti-Spoof** | ✅ ~100+ signaux | ⚠️ ~35 signaux |
| **Compatibilité API** | ✅ **ThumbmarkJS + Fingerprint.com** | ❌ Fingerprint.com seul | ❌ ThumbmarkJS seul |
| **Réconciliation Cross-Browser** | ✅ **3 Niveaux (`vis_` Snowflake)** | ✅ Inclus (SaaS) | ⚠️ Payant |
| **GeoLite2 + 54k CIDR VPN/Tor/DC** | ✅ **Auto-Sync & Trie `< 1 ms`** | ⚠️ Inclus (SaaS) | ❌ Non inclus |
| **Rule Engine SOC & Webhooks HMAC** | ✅ **Inclus + Anti-SSRF** | ⚠️ Plan Enterprise | ❌ Non inclus |

---

## Architecture & Flux de Données

```text
┌─────────────────────────────────────┐
│  Navigateur Client (@bloume/id)     │  104 signaux + Anti-Spoof (< 40 Ko, 0 dep)
│  UMD / ESM / CJS                    │  Payload signé HMAC-SHA256 (±5 min + nonce)
└──────────────────┬──────────────────┘
                   │ POST /api/v1/fingerprint (CORS strict par site)
                   ▼
┌─────────────────────────────────────┐
│  Reverse Proxy (Traefik / Nginx)    │  Injection Real IP + X-JA4-Fingerprint (TLS)
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  BloumeID Control Plane — Next.js 16 Standalone (apps/web)  │
│  ├── Valkey / Redis 8 : Rate-limit glissant, Nonces, Vélocité│
│  ├── Trie CIDR Radix  : 54 000+ plages VPN / Tor / Datacenter│
│  ├── MaxMind GeoLite2 : Pays, Ville, ASN en mémoire          │
│  ├── Réconciliation   : fullHash → hardwareHash+/24 → vis_   │
│  ├── Rule Engine SOC  : allow / challenge / block / flag     │
│  └── PostgreSQL 17    : Prisma ORM + Index composites        │
└─────────────────────────────────────────────────────────────┘
```

---

## Déploiement Rapide (Coolify & Docker Compose)

### Option 1 — Déploiement 1-Clic sur Coolify
1. Créez une ressource **Docker Compose** dans Coolify pointant vers `https://github.com/BloumeSAS/BloumeID`.
2. Sélectionnez `docker-compose.yml` (stack complète `bloumeid-web` + `PostgreSQL 17` + `Valkey 8`) ou `docker-compose.external-db.yml` (PostgreSQL externe uniquement, `Valkey 8` inclus et géré localement).
3. Renseignez `ADMIN_MASTER_KEY`, `ADMIN_USERNAME`, `BLOUMEID_PUBLIC_URL` (et `DATABASE_URL` si vous utilisez `docker-compose.external-db.yml`), puis cliquez sur **Deploy**.

### Option 2 — Docker Compose Local
```bash
git clone https://github.com/BloumeSAS/BloumeID.git
cd BloumeID
cp .env.example .env
docker compose up -d --build
```

### Variables d'Environnement (`.env`)

| Variable | Description | Défaut / Exemple |
| :--- | :--- | :--- |
| `ADMIN_MASTER_KEY` | Clé secrète d'accès à la console `/login` (comparée en temps constant) | `bloumeid_dev_master_key_2026` |
| `ADMIN_USERNAME` | Nom affiché dans l'en-tête d'administration | `admin` |
| `DATABASE_URL` | Chaîne de connexion PostgreSQL 17 | `postgresql://bloumeid:...@bloumeid-db:5432/bloumeid` |
| `REDIS_URL` | URL Valkey / Redis 8 | `redis://bloumeid-redis:6379` |
| `BLOUMEID_PUBLIC_URL` | URL publique de votre instance BloumeID | `https://id.votre-domaine.fr` |
| `MAXMIND_LICENSE_KEY` | Clé MaxMind optionnelle (sinon miroir open-source automatique) | `""` |
| `WORKER_ID` | Identifiant de nœud Snowflake (`0`–`1023`) | `1` |

---

## Intégration du SDK `@bloume/id`

```bash
pnpm add @bloume/id
# ou
npm install @bloume/id
```

### Mode ThumbmarkJS (`new BloumeID()`)
```typescript
import { BloumeID } from "@bloume/id";

const client = new BloumeID({
  apiKey: "bid_pub_YOUR_SITE_KEY",
  endpoint: "https://id.votre-domaine.fr/api/v1/fingerprint",
});

const result = await client.get({ linkedId: "user_42", tag: { plan: "pro" } });
console.log(result.visitorId, result.requestId, result.info.dangerLevel);
```

### Mode Fingerprint.com (`FingerprintJS.load()`)
```typescript
import FingerprintJS from "@bloume/id";

const fp = await FingerprintJS.load({
  apiKey: "bid_pub_YOUR_SITE_KEY",
  endpoint: "https://id.votre-domaine.fr/api/v1/fingerprint",
});

const result = await fp.get({ extendedResult: true, linkedId: "user_42" });
console.log(result.visitorId, result.ipLocation, result.incognito);
```

### Balise `<script>` UMD (Sans bundler)
```html
<script src="https://id.votre-domaine.fr/sdk/v1/bloumeid.js"></script>
<script>
  const client = new window.BloumeID({
    apiKey: "bid_pub_YOUR_SITE_KEY",
    endpoint: "https://id.votre-domaine.fr/api/v1/fingerprint",
  });
  client.get().then((res) => console.log(res.visitorId, res.info.dangerLevel));
</script>
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

## Structure Multi-Repos

Ce projet s'articule autour de deux dépôts GitHub distincts :

| Dépôt | Rôle | Lien |
| :--- | :--- | :--- |
| **`BloumeSAS/BloumeID`** | Control Plane Next.js 16, API REST v1, Moteur SOC, Docker & Coolify | [github.com/BloumeSAS/BloumeID](https://github.com/BloumeSAS/BloumeID) |
| **`BloumeSAS/bloumeid-sdk`** | Code source du SDK npm `@bloume/id` (cloné localement dans `packages/bloumeid/`) | [github.com/BloumeSAS/bloumeid-sdk](https://github.com/BloumeSAS/bloumeid-sdk) |
| **Package npm `@bloume/id`** | Distribution publique ESM / CJS / UMD | [npmjs.com/package/@bloume/id](https://www.npmjs.com/package/@bloume/id) |

> **Développement local complet :**
> ```bash
> git clone https://github.com/BloumeSAS/BloumeID.git
> cd BloumeID
> git clone https://github.com/BloumeSAS/bloumeid-sdk.git packages/bloumeid
> pnpm install
> ```

---

## Licence & Crédits

Distribué sous licence **MIT** — © 2026 **Dev by [Bloume SAS](https://bloume.fr)**.
