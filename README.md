# BloumeID v1.0.0 — Self-Hosted Fingerprinting, Threat Intelligence & Visitor Identity

**BloumeID v1.0.0** (by **Bloume SAS**) is a self-hosted, open-source visitor identification, anti-spoofing, bot detection, and network threat intelligence platform. It combines a zero-dependency browser & server SDK (`@bloume/id` v1.0.0) with a Next.js 16 control plane, an in-memory Patricia/Radix CIDR threat trie, automatic dual-mode GeoLite2 `.mmdb` management, a Custom Security Rules Engine, and 100% drop-in **Dual API compatibility** for both **ThumbmarkJS Pro** and **Fingerprint.com (`@fingerprintjs/fingerprintjs-pro`)**.

---

## Architecture Overview

```
bloumeid/
├── apps/web/                         # Next.js 16 (App Router, standalone) — Clean Slate Pro Admin, REST API v1 & UMD CDN
├── packages/bloumeid/                # @bloume/id v1.0.0 (tsup: ESM, CJS, UMD global window.BloumeID & window.FingerprintJS)
├── packages/config/                  # Shared strict TypeScript & ESLint flat configs
├── Dockerfile                        # Root multi-stage Node 22 Alpine Dockerfile (Coolify 1-Click compatible)
├── docker/                           # Docker build mirror & PID-1 entrypoint (automatic prisma migrate deploy)
├── docker-compose.yml                # Option 1: All-in-One Self-Hosted Stack (bloumeid-web + PostgreSQL 17 + Valkey 8)
├── docker-compose.external-db.yml    # Option 2: External DB & Redis Stack (bloumeid-web only)
├── .github/workflows/                # ci.yml, release-sdk.yml, docker-publish.yml, deploy.yml, history-check.yml
├── .changeset/                       # Automated versioning & changelog management for @bloume/id
├── AGENTS.md                         # Non-negotiable engineering & security governance rules
├── HISTORY.md                        # Append-only execution & architectural decision log
└── .env.example                      # Documented environment configuration template
```

---

## Core Capabilities (v1.0.0)

1. **`@bloume/id` v1.0.0 (72 Deterministic Signals & Anti-Spoof Probes)**:
   - **72 Hardware, Graphics & Browser Signals**: Canvas 2D (winding rule, geometry & Unicode/Emoji subpixel `TextMetrics`), WebGL 1/2 (vendor, renderer, unmasked GPU, 17 extended parameters, shader precision formats & deterministic 3D pixel hash), WebGPU adapter limits & feature count, `OfflineAudioContext` compressor dynamics, 85+ OS font DOM metrics, CSS `@media` hardware query matrix (`pointer`, `hover`, `color-gamut`, `hdr`, `forced-colors`, `prefers-reduced-motion`), Media codecs (`videoCapabilities`, `audioCapabilities`, `enumerateDevices`), Keyboard layout map (`navigator.keyboard.getLayoutMap`), `Intl` & DST offset consistency, high-entropy `userAgentData`, storage quota, `speechSynthesis`, JS engine math constants (`V8` / `SpiderMonkey` / `JavaScriptCore`), WebRTC ICE candidates, and `navigator.connection`.
   - **Anti-Spoof & Bot Probes**: `navigator.webdriver`, Playwright/Puppeteer/Selenium/CDP globals, `Function.prototype.toString` native prototype tampering detection on Canvas/WebGL/Audio/Navigator getters, VM/Software GPU renderer detection (`SwiftShader`, `llvmpipe`, `Mesa OffScreen`, `VirtualBox`, `VMware`), `outerWidth === 0` headless check, `Error.stack` engine vs `User-Agent` consistency, Web Worker Blob vs Main Thread comparison, and Canvas/Audio double-render noise injection detection.
   - **Dual API Drop-In Compatibility**:
     - **ThumbmarkJS Pro API**: `new BloumeID({ apiKey, endpoint, options })` $\rightarrow$ `await tm.get()`
     - **Fingerprint.com (`@fingerprintjs/fingerprintjs-pro`) API**: `FingerprintJS.load({ apiKey, endpoint })` $\rightarrow$ `await fp.get({ extendedResult: true, linkedId, tag })`
2. **3-Level Visitor Identity Reconciliation**:
   - **Level 1 (`confidence: 0.99`)**: Exact `fullHash` match on the same site.
   - **Level 2 (`confidence: 0.88`, `crossBrowserMatched: true`)**: Identical browser-invariant `hardwareHash` + `/24` IPv4 (or `/48` IPv6) `ipSubnet` within a configurable 30-day window.
   - **Level 3 (`confidence: 0.95`)**: New Snowflake `vis_<snowflake>` identity.
3. **Automatic Dual-Mode GeoLite2 `.mmdb` Downloader & In-Memory CIDR Threat Trie (< 1 ms, 0 External Per-Request API Calls)**:
   - **Mode A (Official MaxMind)**: If `MAXMIND_LICENSE_KEY` is set, downloads the official MaxMind `.tar.gz` archives and extracts `GeoLite2-City.mmdb` and `GeoLite2-ASN.mmdb` in memory via Node `zlib.gunzipSync`.
   - **Mode B (Zero-Config Free Open-Source Fallback)**: When `MAXMIND_LICENSE_KEY` is omitted, automatically downloads `GeoLite2-City.mmdb` and `GeoLite2-ASN.mmdb` from the open-source mirror (`P3TERX/GeoLite.mmdb`) into `/app/data/geoip/` and hot-reloads the `maxmind` readers without restarting.
   - **In-Memory Threat Feeds**: X4BNet VPN (`ipv4`), X4BNet Datacenter (`datacenter/ipv4`), Tor Bulk Exit List, and ASN keyword classifier.
4. **Custom Security Rules Engine & Pro Admin Console (`Clean Slate` Theme)**:
   - Per-site or global rules (`min_danger`, `flag_bot`, `flag_tor`, `flag_vpn`, `flag_datacenter`, `flag_spoofed`, `country_in`, `asn_in`) returning `allow | challenge | block | flag`.
   - Cap-style stacked traffic timeline, Top Countries & Top ASNs leaderboards, Live Events Audit Log with 5s polling & CSV/JSON export, Visitor Trust/Block/Merge tools, and Interactive Live IP Lookup Tester in `/settings`.

---

## Coolify 1-Click & Modular Docker Deployment Guide

BloumeID v1.0.0 supports **three modular deployment topologies** out of the box. On container startup, `/usr/local/bin/docker-entrypoint.sh` automatically waits for PostgreSQL, executes `prisma migrate deploy`, and launches the Next.js 16 standalone server.

### Option 1: All-in-One Self-Hosted Stack (`docker-compose.yml`)
Deploys `bloumeid-web` alongside self-hosted `postgres:17-alpine` and `valkey/valkey:8-alpine` with persistent volumes.

- **In Coolify**: Create a new **Docker Compose** resource pointing to your repository and set Compose file to `docker-compose.yml`.
- **Via CLI**:
  ```bash
  cp .env.example .env
  docker compose up -d --build
  ```

### Option 2: External DB & Redis Stack (`docker-compose.external-db.yml`)
Deploys only the `bloumeid-web` container and connects to your existing managed PostgreSQL and Redis/Valkey instances (e.g., Coolify Managed PostgreSQL + Coolify Managed Redis/Dragonfly/Valkey, Supabase, Neon, AWS RDS).

- **In Coolify**: Create a new **Docker Compose** resource, set Compose file to `docker-compose.external-db.yml`, and configure `ADMIN_MASTER_KEY`, `DATABASE_URL`, `REDIS_URL`, and `BLOUMEID_PUBLIC_URL` in Coolify's Environment Variables tab.
- **Via CLI**:
  ```bash
  docker compose -f docker-compose.external-db.yml up -d --build
  ```

### Option 3: Standalone Root `Dockerfile` Buildpack
If you use Coolify's **Dockerfile** buildpack (or Railway / Render / Fly.io), point it directly to the root `./Dockerfile`. Mount a persistent volume to `/app/data` so downloaded GeoLite2 `.mmdb` databases persist across container rebuilds.

---

## Dual SDK Integration Guide (`@bloume/id` v1.0.0)

### 1. ThumbmarkJS Pro Mode
```typescript
import { BloumeID } from "@bloume/id";

const bloumeid = new BloumeID({
  apiKey: process.env.NEXT_PUBLIC_BLOUMEID_PUBLIC_KEY,
  endpoint: process.env.NEXT_PUBLIC_BLOUMEID_PUBLIC_URL,
});

const result = await bloumeid.get({ linkedId: "user_42" });
console.log(result.visitorId, result.thumbmark, result.info.dangerLevel, result.info.ruleAction);
```

### 2. Fingerprint.com (`@fingerprintjs/fingerprintjs-pro`) Drop-in Mode
```typescript
import FingerprintJS from "@bloume/id";

const fpPromise = FingerprintJS.load({
  apiKey: process.env.NEXT_PUBLIC_BLOUMEID_PUBLIC_KEY!,
  endpoint: process.env.NEXT_PUBLIC_BLOUMEID_PUBLIC_URL!,
});

const fp = await fpPromise;
const result = await fp.get({
  extendedResult: true,
  linkedId: "account_99",
  tag: { plan: "enterprise" },
});

console.log(
  result.visitorId,      // "vis_..."
  result.requestId,      // "req_..."
  result.visitorFound,   // true | false
  result.confidence,     // { score: 0.99, revision: "1.0.0" }
  result.incognito,      // boolean
  result.ipLocation,     // { city, country, continent, latitude, longitude, timezone }
  result.firstSeenAt,    // { global, subscription }
  result.lastSeenAt      // { global, subscription }
);
```

### 3. HTML `<script>` Tag (Global `window.BloumeID` & `window.FingerprintJS`)
```html
<script src="https://id.yourdomain.com/sdk/v1/bloumeid.js"></script>
<script>
  // ThumbmarkJS syntax:
  const tm = new window.BloumeID({ apiKey: "bid_pub_...", endpoint: "https://id.yourdomain.com" });
  tm.get().then((res) => console.log(res.visitorId, res.requestId));

  // Or Fingerprint.com syntax:
  window.FingerprintJS.load({ apiKey: "bid_pub_...", endpoint: "https://id.yourdomain.com" })
    .then((fp) => fp.get({ extendedResult: true }))
    .then((res) => console.log(res.visitorId, res.ipLocation));
</script>
```

### 4. Server-Side Verification & REST API (`bid_sec_...`)
- **ThumbmarkJS / BloumeID Server SDK**:
  ```typescript
  import { BloumeIDServer } from "@bloume/id/server";

  const server = new BloumeIDServer({
    secretKey: process.env.BLOUMEID_SECRET_KEY!,
    endpoint: process.env.BLOUMEID_PUBLIC_URL!,
  });

  const verified = await server.verifyRequest(requestId);
  if (verified.dangerLevel >= 3 || verified.ruleAction === "block") {
    throw new Error("Blocked high-risk request");
  }
  ```
- **Fingerprint.com Server REST Endpoints**:
  - `POST /api/v1/events` (Client collection alias)
  - `GET /api/v1/events/:requestId` (Returns `{ products: { identification, botd, ipInfo, vpn, incognito, tamper, highActivity, suspectScore } }`)
  - `GET /api/v1/visitors/:visitorId/visits` (Returns `{ visitorId, visits: [...] }`)

---

## Local Monorepo Development & Quality Gates

```bash
pnpm install
pnpm --filter @bloume/id build
pnpm --filter @bloumeid/web prisma:generate
pnpm -r typecheck
pnpm -r lint
pnpm -r test
pnpm build
```
