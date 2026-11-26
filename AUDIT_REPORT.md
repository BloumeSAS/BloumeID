# BloumeID v1.0.0 — Security, Performance & Optimization Audit Report

**Date:** 2026-11-26  
**Scope:** `apps/web`, `packages/bloumeid` (`@bloume/id`), `prisma/`, `docker-compose.yml`, `next.config.ts`

---

## 1. Security Findings

| Severity | Area | Finding | Remediation |
|---|---|---|---|
| **HIGH** | Webhooks (`webhooks.ts`, `api/admin/sites`) | No SSRF validation on `webhookUrl` (allows `127.0.0.1`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.169.254`, `::1`, `fc00::/7`, `localhost`, or non-HTTPS in prod). | Add `validateWebhookUrl()` blocking private/loopback/link-local/metadata IPs & enforcing `https:` in production before saving or dispatching. |
| **HIGH** | Public API (`/api/v1/fingerprint`, `/api/v1/events`) | Unbounded `request.json()` body size and unbounded `components` object depth/size (DoS / PostgreSQL `Json` bloat risk). | Enforce strict `<= 64 KB` raw body limit (`413 Payload Too Large`) and bounded `components` depth (`<= 6`) & key count (`<= 64`). |
| **HIGH** | Auth & Middleware (`src/middleware.ts`) | `PROTECTED_PATHS` missing `/get-started`, `/webhooks`, `/releases`, `/smart-signals`, `/health`, `/security`, `/usage`, `/migrate`; `/api/admin/*` not guarded at edge middleware level. | Update `PROTECTED_PATHS` + `matcher` to cover all dashboard routes and enforce edge cookie/key check on `/api/admin/*` (excluding `/api/admin/auth/login` & `/logout`). |
| **MEDIUM** | HTTP Headers (`next.config.ts`) | Missing strict security headers (`CSP`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `HSTS`). | Configure `headers()` in `next.config.ts` for all routes. |
| **MEDIUM** | GeoLite2 Extractor (`geoip.ts`) | `extractMmdbFromTarGzBuffer` does not reject Tar-Slip paths (`..`, leading `/`) or cap downloaded archive size. | Reject unsafe tar entry paths and enforce max download size (`<= 100 MB`). |
| **MEDIUM** | IP Extraction (`network.ts`) | `extractRealClientIp` does not validate IPv4/IPv6 syntax on proxy headers (`CF-Connecting-IP`, `X-Real-IP`, `X-Forwarded-For`). | Validate extracted IP with `net.isIP()` before trusting it. |
| **LOW** | Docker (`docker-compose.yml`) | Single bridge network exposes DB/Redis to outbound bridge traffic. | Split into `bloumeid_backend` (`internal: true` for DB/Redis) and `bloumeid_public`. |

---

## 2. Performance & Optimization Findings

| Severity | Area | Finding | Remediation |
|---|---|---|---|
| **HIGH** | Client SDK (`packages/bloumeid`) | Async collectors run sequentially without per-collector timeout or immutable hardware memoization. | Parallelize async collectors with `Promise.allSettled` + `300 ms` timeout and memoize immutable hardware components (`< 2 ms` repeat `get()`). |
| **HIGH** | PostgreSQL (`prisma/schema.prisma`) | Missing composite indexes `(siteId, createdAt)` and `(siteId, dangerLevel, createdAt)` on `FingerprintEvent`. | Add additive migration `20261126171500_perf_composite_indexes`. |
| **MEDIUM** | Redis (`redis.ts`) | Separate round-trips for rate-limit, nonce dedup, and velocity tracking. | Batch velocity `SADD`/`SCARD`/`EXPIRE` via `client.pipeline()`. |
