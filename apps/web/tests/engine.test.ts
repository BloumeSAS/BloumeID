import { describe, expect, it, vi } from "vitest";
import { computeAntiReplaySignature } from "@bloumeid/sdk";
import {
  SnowflakeGenerator,
  constantTimeEqual,
  generateApiKey,
  generateSnowflakeId,
  hashSecretKey,
  verifyHmacSha256,
  signHmacSha256,
} from "../src/lib/engine/snowflake";
import {
  CidrRadixTrie,
  classifyAsnOrganization,
} from "../src/lib/engine/cidr-trie";
import {
  evaluateJa4Consistency,
  extractIpSubnet,
  extractRealClientIp,
  isOriginAllowedForSite,
  parseUserAgentSummary,
} from "../src/lib/engine/network";
import {
  checkSlidingWindowRateLimit,
  consumeAntiReplayNonce,
  memoryCache,
  recordAndCheckVelocity,
} from "../src/lib/engine/redis";
import { computeDangerScore } from "../src/lib/engine/scoring";
import { dispatchSignedWebhook, shouldTriggerWebhook } from "../src/lib/engine/webhooks";
import { reconcileVisitorIdentity } from "../src/lib/engine/reconcile";
import {
  DEMO_PUBLIC_KEY,
  DEMO_SECRET_KEY,
  getReconciliationStore,
} from "../src/lib/engine/repository";
import { POST as fingerprintPOST } from "../src/app/api/v1/fingerprint/route";
import { GET as verifyRequestGET } from "../src/app/api/v1/requests/[requestId]/route";
import { GET as getVisitorGET } from "../src/app/api/v1/visitors/[visitorId]/route";
import { GET as healthGET } from "../src/app/api/health/route";
import { GET as sdkBundleGET } from "../src/app/sdk/v1/bloumeid.js/route";

describe("Phase 5 — Backend Engine, Snowflake, CIDR Trie, Scoring & API v1", () => {
  it("generates monotonic Snowflake IDs with WORKER_ID and constant-time comparisons", () => {
    const gen1 = new SnowflakeGenerator(42);
    const id1 = gen1.nextId("vis");
    const id2 = gen1.nextId("vis");
    expect(id1).toMatch(/^vis_\d+$/);
    expect(id1).not.toBe(id2);
    expect(generateSnowflakeId("site")).toMatch(/^site_\d+$/);
    expect(generateApiKey("bid_pub")).toMatch(/^bid_pub_/);
    expect(generateApiKey("bid_sec")).toMatch(/^bid_sec_/);

    expect(constantTimeEqual("secret_master_123", "secret_master_123")).toBe(true);
    expect(constantTimeEqual("secret_master_123", "secret_master_124")).toBe(false);
    expect(constantTimeEqual("short", "longer_secret")).toBe(false);

    const sig = signHmacSha256("whsec_1", '{"ok":true}');
    expect(verifyHmacSha256("whsec_1", '{"ok":true}', sig)).toBe(true);
    expect(verifyHmacSha256("whsec_1", '{"ok":false}', sig)).toBe(false);
    expect(hashSecretKey("bid_sec_1")).toHaveLength(64);
  });

  it("performs O(32) CIDR lookups in Patricia/Radix Trie and classifies Datacenter/VPN ASNs", () => {
    const trie = new CidrRadixTrie();
    expect(trie.insert("185.220.101.0/24", "tor")).toBe(true);
    expect(trie.insert("51.38.0.0/16", "datacenter")).toBe(true);
    expect(trie.insert("193.138.218.0/24", "vpn")).toBe(true);
    expect(trie.insert("# comment line", "vpn")).toBe(false);

    expect(trie.size()).toBe(3);
    expect(trie.lookup("185.220.101.45").has("tor")).toBe(true);
    expect(trie.lookup("51.38.129.10").has("datacenter")).toBe(true);
    expect(trie.lookup("193.138.218.99").has("vpn")).toBe(true);
    expect(trie.lookup("8.8.8.8").size).toBe(0);

    expect(classifyAsnOrganization("OVH SAS")).toEqual({ isDatacenter: true, isVpn: false });
    expect(classifyAsnOrganization("Hetzner Online GmbH")).toEqual({
      isDatacenter: true,
      isVpn: false,
    });
    expect(classifyAsnOrganization("Mullvad VPN AB")).toEqual({
      isDatacenter: false,
      isVpn: true,
    });
  });

  it("extracts real IP, /24 subnet, validates wildcard CORS and checks JA4 coherence", () => {
    const headers = new Headers({
      "cf-connecting-ip": "203.0.113.42",
      "x-forwarded-for": "10.0.0.1",
    });
    expect(extractRealClientIp(headers, "true")).toBe("203.0.113.42");
    expect(extractIpSubnet("203.0.113.42")).toBe("203.0.113.0/24");

    const allowed = ["app.bloume.io", "*.customer.fr", "localhost"];
    expect(isOriginAllowedForSite("https://app.bloume.io", allowed)).toBe(true);
    expect(isOriginAllowedForSite("https://shop.customer.fr", allowed)).toBe(true);
    expect(isOriginAllowedForSite("https://evil-customer.fr", allowed)).toBe(false);

    const ja4Bad = evaluateJa4Consistency(
      "t13d0310_00_aabbcc",
      "Mozilla/5.0 Chrome/131.0.0.0 Safari/537.36"
    );
    expect(ja4Bad.inconsistent).toBe(true);

    const ua = parseUserAgentSummary(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0"
    );
    expect(ua).toEqual({ browser: "Chrome", os: "Windows", device: "Desktop" });
  });

  it("enforces sliding-window rate limits, single-use anti-replay nonces and velocity anomalies", async () => {
    memoryCache.clear();
    const r1 = await checkSlidingWindowRateLimit({
      key: "login:test_ip",
      windowSeconds: 60,
      maxRequests: 2,
    });
    const r2 = await checkSlidingWindowRateLimit({
      key: "login:test_ip",
      windowSeconds: 60,
      maxRequests: 2,
    });
    const r3 = await checkSlidingWindowRateLimit({
      key: "login:test_ip",
      windowSeconds: 60,
      maxRequests: 2,
    });
    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
    expect(r3.allowed).toBe(false);

    expect(await consumeAntiReplayNonce("site_1", "nonce_abc_1")).toBe(true);
    expect(await consumeAntiReplayNonce("site_1", "nonce_abc_1")).toBe(false);

    for (let i = 1; i <= 6; i++) {
      const vel = await recordAndCheckVelocity({
        ipAddress: "198.51.100.77",
        visitorPublicId: `vis_${i}`,
        country: `C${i}`,
      });
      if (i === 6) {
        expect(vel.ipVelocityAnomaly).toBe(true);
      }
    }
  });

  it("computes dangerLevel 0-5 and signs outgoing webhooks with exponential retry", async () => {
    const clean = computeDangerScore({
      isBot: false,
      isSpoofed: false,
      isTor: false,
      isVpn: false,
      isDatacenter: false,
      isProxy: false,
      isIncognito: false,
      ja4Inconsistent: false,
      ipVelocityAnomaly: false,
      geoVelocityAnomaly: false,
    });
    expect(clean.dangerLevel).toBe(0);

    const critical = computeDangerScore({
      isBot: true,
      isSpoofed: true,
      isTor: true,
      isVpn: false,
      isDatacenter: true,
      isProxy: false,
      isIncognito: true,
      ja4Inconsistent: true,
      ipVelocityAnomaly: true,
      geoVelocityAnomaly: false,
    });
    expect(critical.dangerLevel).toBe(5);

    expect(
      shouldTriggerWebhook({
        webhookUrl: "https://example.com/hook",
        dangerLevel: 3,
        riskThreshold: 3,
        isBot: false,
      })
    ).toBe(true);

    const mockFetch = vi
      .fn()
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));

    const delivery = await dispatchSignedWebhook({
      webhookUrl: "https://example.com/hook",
      webhookSecret: "whsec_test_123",
      baseDelayMs: 5,
      fetchImpl: mockFetch,
      payload: {
        event: "threat.detected",
        timestamp: new Date().toISOString(),
        siteId: "site_1",
        requestId: "req_1",
        visitorId: "vis_1",
        thumbmark: "a".repeat(64),
        hardwareHash: "b".repeat(64),
        dangerLevel: 4,
        confidence: 0.99,
        flags: {
          isBot: true,
          isSpoofed: false,
          isVpn: false,
          isTor: false,
          isDatacenter: false,
          isProxy: false,
          isIncognito: false,
          crossBrowserMatched: false,
        },
        network: {
          ipAddress: "185.220.101.1",
          asnNumber: 24940,
          asnOrg: "Hetzner",
          country: "DE",
        },
      },
    });
    expect(delivery.delivered).toBe(true);
    expect(delivery.attempts).toBe(2);
  });

  it("executes 3-level identity reconciliation and public API endpoints end-to-end", async () => {
    const healthRes = await healthGET();
    expect(healthRes.status).toBe(200);
    const healthBody = (await healthRes.json()) as { status: string; threatTrieCidrs: number };
    expect(healthBody.status).toBe("ok");
    expect(healthBody.threatTrieCidrs).toBeGreaterThan(0);

    const sdkRes = await sdkBundleGET(new Request("http://localhost:3000/sdk/v1/bloumeid.js"));
    expect(sdkRes.status).toBe(200);
    expect(sdkRes.headers.get("etag")).toBeTruthy();

    // Test POST /api/v1/fingerprint Level 3 (new visitor), Level 1 (same fullHash), Level 2 (cross-browser same hardwareHash + subnet)
    const timestamp = Date.now();
    const fullHashChrome = "f1".repeat(32);
    const fullHashFirefox = "f2".repeat(32);
    const sharedHardwareHash = "aa".repeat(32);

    const makeRequest = (nonce: string, fullHash: string) => {
      const signature = computeAntiReplaySignature(
        DEMO_PUBLIC_KEY,
        timestamp,
        nonce,
        fullHash,
        sharedHardwareHash
      );
      return new Request("http://localhost:3000/api/v1/fingerprint", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://app.bloume.io",
          "X-BloumeID-Key": DEMO_PUBLIC_KEY,
          "X-Real-IP": "198.51.100.25",
          "User-Agent": "Mozilla/5.0 (Macintosh) Chrome/131.0.0.0",
        },
        body: JSON.stringify({
          timestamp,
          nonce,
          signature,
          fullHash,
          hardwareHash: sharedHardwareHash,
          durationMs: 14,
          components: {
            antiSpoof: { isBot: false, isSpoofed: false, isIncognito: false },
          },
        }),
      });
    };

    // 1. First visit -> Level 3 (New Visitor, confidence 0.95)
    const res1 = await fingerprintPOST(makeRequest("nonce_visit_0001", fullHashChrome));
    expect(res1.status).toBe(200);
    const body1 = (await res1.json()) as {
      visitorId: string;
      requestId: string;
      confidence: { score: number };
      info: { crossBrowserMatched: boolean };
    };
    expect(body1.visitorId).toMatch(/^vis_/);
    expect(body1.confidence.score).toBe(0.95);
    expect(body1.info.crossBrowserMatched).toBe(false);

    // 2. Second visit with identical fullHash -> Level 1 (Same visitor, confidence 0.99)
    const res2 = await fingerprintPOST(makeRequest("nonce_visit_0002", fullHashChrome));
    const body2 = (await res2.json()) as typeof body1;
    expect(body2.visitorId).toBe(body1.visitorId);
    expect(body2.confidence.score).toBe(0.99);
    expect(body2.info.crossBrowserMatched).toBe(false);

    // 3. Third visit from another browser (different fullHash) but same hardwareHash + /24 subnet -> Level 2 (Cross-Browser match, confidence 0.88)
    const res3 = await fingerprintPOST(makeRequest("nonce_visit_0003", fullHashFirefox));
    const body3 = (await res3.json()) as typeof body1;
    expect(body3.visitorId).toBe(body1.visitorId);
    expect(body3.confidence.score).toBe(0.88);
    expect(body3.info.crossBrowserMatched).toBe(true);

    // 4. Replay with same nonce must fail with 409
    const replayRes = await fingerprintPOST(makeRequest("nonce_visit_0003", fullHashFirefox));
    expect(replayRes.status).toBe(409);

    // 5. Verify request and visitor with secret key (bid_sec_)
    const verifyRes = await verifyRequestGET(
      new Request(`http://localhost:3000/api/v1/requests/${body3.requestId}`, {
        headers: { Authorization: `Bearer ${DEMO_SECRET_KEY}` },
      }),
      { params: Promise.resolve({ requestId: body3.requestId }) }
    );
    expect(verifyRes.status).toBe(200);
    const verifiedBody = (await verifyRes.json()) as {
      verified: boolean;
      visitorId: string;
      flags: { crossBrowserMatched: boolean };
    };
    expect(verifiedBody.verified).toBe(true);
    expect(verifiedBody.visitorId).toBe(body1.visitorId);
    expect(verifiedBody.flags.crossBrowserMatched).toBe(true);

    const visitorRes = await getVisitorGET(
      new Request(`http://localhost:3000/api/v1/visitors/${body1.visitorId}`, {
        headers: { Authorization: `Bearer ${DEMO_SECRET_KEY}` },
      }),
      { params: Promise.resolve({ visitorId: body1.visitorId }) }
    );
    expect(visitorRes.status).toBe(200);
    const visitorBody = (await visitorRes.json()) as { visitCount: number };
    expect(visitorBody.visitCount).toBe(3);

    // Direct unit check on reconcileVisitorIdentity
    const store = getReconciliationStore();
    const rec = await reconcileVisitorIdentity(store, {
      siteInternalId: 1,
      fullHash: fullHashChrome,
      hardwareHash: sharedHardwareHash,
      ipSubnet: "198.51.100.0/24",
      dangerLevel: 0,
      isSpoofed: false,
    });
    expect(rec.matchType).toBe("exact_full_hash");
  });
});

