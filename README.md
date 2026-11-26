# BloumeID — Self-Hosted Fingerprinting, Threat Intelligence & Visitor Identity

**BloumeID** (by **Bloume SAS**) is a self-hosted, privacy-respecting visitor identification, anti-spoofing, bot detection, and network threat intelligence platform. It combines a zero-dependency browser & server SDK (`@bloumeid/sdk`) with a Next.js 16 control plane, an in-memory Patricia/Radix CIDR threat trie, and a 3-tier cross-browser identity reconciliation engine.

---

## Architecture Overview

```
bloumeid/
├── apps/web/              # Next.js 16 (App Router, standalone) — Admin Console, REST API v1 & UMD CDN
├── packages/bloumeid/     # @bloumeid/sdk (tsup: ESM, CJS, UMD global window.BloumeID, .d.ts)
├── packages/config/       # Shared strict TypeScript & ESLint flat configs
├── docker/                # Multi-stage Node 22 Alpine Dockerfile & PID-1 entrypoint
├── docker-compose.yml     # Production stack (bloumeid-web, PostgreSQL 17, Valkey 8)
├── .github/workflows/     # ci.yml, release-sdk.yml, docker-publish.yml, deploy.yml, history-check.yml
├── .changeset/            # Automated versioning & changelog management for @bloumeid/sdk
├── AGENTS.md              # Non-negotiable engineering & security governance rules
├── HISTORY.md             # Append-only execution & architectural decision log
└── .env.example           # Documented environment configuration template
```

### Core Capabilities
1. **`@bloumeid/sdk` (48+ Deterministic Collectors & Anti-Spoof Probes)**:
   - **Collectors**: Canvas 2D (geometry, text & winding), WebGL 1/2 (vendor, renderer, unmasked GPU, extensions, shader precision formats), WebGPU adapter limits, `OfflineAudioContext` compressor dynamics, hardware & screen HDR/gamut, 85+ OS font DOM metrics, `Intl` & timezone, `navigator.languages`, high-entropy `userAgentData`, storage quota estimates, `speechSynthesis`, JS engine math constants (`V8` / `SpiderMonkey` / `JavaScriptCore`), WebRTC ICE candidates (disable via `exclude: ['webrtc']`), and `navigator.connection`.
   - **Anti-Spoof & Bot Probes**: `navigator.webdriver`, Playwright/Puppeteer/Selenium/CDP globals (`$cdc_`, `$wdc_`), malformed `window.chrome`, inconsistent `Permissions.query`, Web Worker Blob vs Main Thread navigator comparison, Canvas/Audio double-render noise detection (Brave aggressive, Multilogin, Dolphin, AdsPower), and incognito/private storage quota heuristics.
   - **100% ThumbmarkJS Pro Compatible API**: `new BloumeID({ apiKey, endpoint, options })`, `get()`, `getFingerprint()`, `getFingerprintData()`, `setOption()`.
2. **3-Level Visitor Identity Reconciliation**:
   - **Level 1 (`confidence: 0.99`)**: Exact `fullHash` match on the same site.
   - **Level 2 (`confidence: 0.88`, `crossBrowserMatched: true`)**: Identical browser-invariant `hardwareHash` + `/24` IPv4 (or `/48` IPv6) `ipSubnet` within a configurable 30-day window.
   - **Level 3 (`confidence: 0.95`)**: New Snowflake `vis_<snowflake>` identity.
3. **In-Memory Patricia/Radix CIDR Threat Trie & Velocity Scoring (`dangerLevel` 0–5)**:
   - Automatic ingestion of **X4BNet VPN (`ipv4`)**, **X4BNet Datacenter (`datacenter/ipv4`)**, and **Tor Bulk Exit List**.
   - Keyword ASN classifier (OVH, Hetzner, DigitalOcean, AWS, GCP, Azure, Scaleway, Vultr, Linode, M247, Leaseweb, Mullvad, etc.).
   - Optional automatic loading of MaxMind **GeoLite2** `.mmdb` databases placed in `/app/data/geoip/`.
   - Redis velocity anomaly checks (`>5 visitorIds` per IP in 10 min; `>5 countries` per visitor in 1 hour) and TLS `X-JA4-Fingerprint` vs `User-Agent` coherence verification.

---

## Security & Architectural Trade-offs

- **Snowflake Public Identifiers Only**: Internal PostgreSQL auto-increment integer IDs (`id`) are never exposed in any API response, URL, or React prop. All external identifiers use prefixed 64-bit Snowflakes (`site_`, `vis_`, `req_`, `feed_`) with `WORKER_ID` isolation (`0–1023`), or prefixed API keys (`bid_pub_`, `bid_sec_`).
- **Client Anti-Replay Signature vs. Server Authentication**:
  - Because a public key (`bid_pub_`) is shipped to the browser, a client-side HMAC signature cannot prove secret key possession against a determined attacker who extracts the key.
  - Instead, the client signs `(timestamp, nonce, fullHash, hardwareHash)` to guarantee **anti-replay and payload integrity**: the server rejects any payload outside a `±5 minute` window or any `nonce` already consumed in Redis/Valkey.
  - Collection authenticity relies on `bid_pub_` + strict per-site CORS `Origin` validation (supporting exact domains and `*.domain.tld` wildcards) + sliding-window IP/Site rate limiting + TLS JA4 correlation.
  - Strong cryptographic proof is enforced server-to-server via `bid_sec_` (stored as a SHA-256 hash and verified with `crypto.timingSafeEqual`) in `BloumeIDServer.verifyRequest()` / `getVisitor()`, and on outgoing webhooks via `X-BloumeID-Signature: sha256=<hmac>`.

---

## Quick Start (Docker Compose)

1. **Copy and configure `.env`**:
   ```bash
   cp .env.example .env
   # Edit .env and set a strong ADMIN_MASTER_KEY and your BLOUMEID_PUBLIC_URL
   ```

2. **Start the production stack (Next.js 16 standalone + PostgreSQL 17 + Valkey 8)**:
   ```bash
   docker compose up -d --build
   ```

3. **Verify healthcheck**:
   ```bash
   curl -fsS "${BLOUMEID_PUBLIC_URL:-http://localhost:3000}/api/health"
   ```

4. **Access the Admin Console**:
   Open `${BLOUMEID_PUBLIC_URL}/login` (default `http://localhost:3000/login`) and unlock with your `ADMIN_MASTER_KEY`.

---

## Local Monorepo Development

```bash
pnpm install
pnpm --filter @bloumeid/sdk build
pnpm --filter @bloumeid/web prisma:generate
pnpm dev
```

Run quality checks across all workspaces:
```bash
pnpm -r typecheck
pnpm -r lint
pnpm -r test:coverage
pnpm build
```

---

## Reverse Proxy Configuration (`X-Forwarded-For` & `X-JA4-Fingerprint`)

Set `TRUSTED_PROXIES="true"` in `.env` when running behind Traefik, Nginx, Caddy, or Cloudflare.

### 1. Nginx
```nginx
server {
    listen 443 ssl http2;
    server_name id.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        # Optional: if using an edge proxy or module exporting JA4 TLS fingerprints
        proxy_set_header X-JA4-Fingerprint $http_x_ja4_fingerprint;
    }
}
```

### 2. Caddy
```caddyfile
id.example.com {
    reverse_proxy 127.0.0.1:3000 {
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-JA4-Fingerprint {http.request.header.X-JA4-Fingerprint}
    }
}
```

### 3. Traefik (Dynamic Labels)
```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.bloumeid.rule=Host(`id.example.com`)"
  - "traefik.http.routers.bloumeid.entrypoints=websecure"
  - "traefik.http.routers.bloumeid.tls.certresolver=letsencrypt"
  - "traefik.http.services.bloumeid.loadbalancer.server.port=3000"
```

---

## SDK Integration Guide

All integration snippets use your dynamic `${BLOUMEID_PUBLIC_URL}` environment variable.

### 1. HTML `<script>` (UMD Global Bundle)
```html
<script src="${BLOUMEID_PUBLIC_URL}/sdk/v1/bloumeid.js"></script>
<script>
  const client = new window.BloumeID({
    apiKey: "bid_pub_YOUR_SITE_KEY",
    endpoint: "${BLOUMEID_PUBLIC_URL}",
    options: {
      exclude: [],
      timeout: 5000
    }
  });

  client.get().then((result) => {
    console.log("Visitor ID:", result.visitorId);
    console.log("Thumbmark:", result.thumbmark);
    console.log("Request ID:", result.requestId);
    console.log("Danger Level (0-5):", result.info.dangerLevel);
  });
</script>
```

### 2. npm / ESM (`@bloumeid/sdk`)
```bash
pnpm add @bloumeid/sdk
```

```typescript
import { BloumeID } from "@bloumeid/sdk";

const bloumeid = new BloumeID({
  apiKey: process.env.NEXT_PUBLIC_BLOUMEID_PUBLIC_KEY,
  endpoint: process.env.NEXT_PUBLIC_BLOUMEID_PUBLIC_URL,
  options: {
    exclude: ["webrtc"], // optional collector exclusion
    cacheLifetimeMs: 60_000,
  },
});

const { visitorId, thumbmark, requestId, confidence, info } = await bloumeid.get();
```

### 3. Server-Side Node.js Verification (`@bloumeid/sdk/server`)
Verify a client's `requestId` or inspect a `visitorId` from your backend using your secret key (`bid_sec_`):

```typescript
import { BloumeIDServer } from "@bloumeid/sdk/server";

const bloumeServer = new BloumeIDServer({
  secretKey: process.env.BLOUMEID_SECRET_KEY!, // bid_sec_...
  endpoint: process.env.BLOUMEID_PUBLIC_URL!,
});

// 1. Verify a specific fingerprint event
const verification = await bloumeServer.verifyRequest(clientRequestId);
if (!verification.verified || verification.dangerLevel >= 4 || verification.flags.isBot) {
  throw new Error("Blocked high-risk or automated request");
}

// 2. Retrieve a visitor's cross-browser profile & history
const visitor = await bloumeServer.getVisitor(verification.visitorId);
console.log(visitor.visitCount, visitor.maxDangerLevel, visitor.tags);
```

---

## MaxMind GeoLite2 Databases & Licensing

BloumeID automatically detects and loads `.mmdb` databases placed inside `/app/data/geoip/` (mapped to `./data/geoip/` on the host via `docker-compose.yml`):
- `GeoLite2-City.mmdb` (Country ISO code & city resolution)
- `GeoLite2-ASN.mmdb` (Autonomous System Number & ISP/Hosting organization resolution)

> **License Notice**: GeoLite2 databases are distributed by MaxMind under the [GeoLite2 End User License Agreement](https://www.maxmind.com/en/geolite2/eula). You must create a free MaxMind account to download `.mmdb` files and never commit `.mmdb` binaries to Git (enforced by `.gitignore`). This product includes GeoLite2 data created by MaxMind, available from [https://www.maxmind.com](https://www.maxmind.com).
