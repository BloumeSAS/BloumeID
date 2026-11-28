import zlib from "node:zlib";
import { describe, expect, it, vi } from "vitest";
import { computeAntiReplaySignature } from "@bloume/id";
import { APP_VERSION } from "../src/lib/version";
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
  evaluateClientHintsConsistency,
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
import { evaluateSecurityRules } from "../src/lib/engine/rules";
import {
  downloadAndUpdateGeoLite2,
  extractMmdbFromTarGzBuffer,
  isValidMmdbBuffer,
} from "../src/lib/engine/geoip";
import { dispatchSignedWebhook, shouldTriggerWebhook } from "../src/lib/engine/webhooks";
import { reconcileVisitorIdentity } from "../src/lib/engine/reconcile";
import {
  createSiteRecord,
  getDashboardMetrics,
  getReconciliationStore,
  listSites,
} from "../src/lib/engine/repository";
import { POST as fingerprintPOST } from "../src/app/api/v1/fingerprint/route";
import { POST as eventsPOST } from "../src/app/api/v1/events/route";
import { GET as verifyEventGET } from "../src/app/api/v1/events/[requestId]/route";
import { GET as verifyRequestGET } from "../src/app/api/v1/requests/[requestId]/route";
import { GET as getVisitorGET } from "../src/app/api/v1/visitors/[visitorId]/route";
import { GET as getVisitorVisitsGET } from "../src/app/api/v1/visitors/[visitorId]/visits/route";
import { GET as healthGET } from "../src/app/api/health/route";
import { POST as previewPOST } from "../src/app/api/v1/preview/route";
import { GET as sdkBundleGET } from "../src/app/sdk/v1/bloumeid.js/route";

function createFakeTarGzWithMmdb(fileName: string, content: Buffer): Buffer {
  const header = Buffer.alloc(512, 0);
  header.write(fileName, 0, "utf8");
  header.write(content.length.toString(8).padStart(11, "0") + "\0", 124, "utf8");
  const padding = Buffer.alloc((512 - (content.length % 512)) % 512, 0);
  const eof = Buffer.alloc(1024, 0);
  return zlib.gzipSync(Buffer.concat([header, content, padding, eof]));
}

describe("Backend Engine v1.0.0 — Snowflake, CIDR Trie, GeoLite2 Extractor, Rules Engine & Dual API v1", () => {
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

  it("extracts .mmdb binary streams from .tar.gz archives and evaluates custom security rules", () => {
    const sampleMmdb = Buffer.from("FAKE_MAXMIND_MMDB_PAYLOAD_V1");
    const tarGz = createFakeTarGzWithMmdb("GeoLite2-City_20261126/GeoLite2-City.mmdb", sampleMmdb);
    const extracted = extractMmdbFromTarGzBuffer(tarGz);
    expect(extracted?.equals(sampleMmdb)).toBe(true);

    const ruleRes = evaluateSecurityRules(
      [
        {
          publicId: "rule_1",
          sitePublicId: null,
          name: "Block Tor Exit Nodes",
          isEnabled: true,
          conditions: [{ field: "isTor", operator: "eq", value: true }],
          action: "block",
          priority: 10,
          hitCount: 0,
        },
      ],
      {
        sitePublicId: "site_1",
        visitorPublicId: "vis_1",
        dangerLevel: 3,
        isBot: false,
        isTor: true,
        isVpn: false,
        isDatacenter: false,
        isSpoofed: false,
        country: "DE",
        asnNumber: 24940,
        ipSubnet: "185.220.101.0/24",
      }
    );
    expect(ruleRes.action).toBe("block");
    expect(ruleRes.matchedRuleId).toBe("rule_1");
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

  it("extracts real IP, /24 subnet, validates wildcard CORS, JA4 and Sec-CH-UA Client Hints coherence", () => {
    const headers = new Headers({
      "cf-connecting-ip": "203.0.113.42",
      "x-forwarded-for": "10.0.0.1",
      "sec-ch-ua-platform": '"Windows"',
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

    const chBad = evaluateClientHintsConsistency(
      headers,
      "MacIntel"
    );
    expect(chBad.inconsistent).toBe(true);

    const ua = parseUserAgentSummary(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0"
    );
    expect(ua).toEqual({
      browser: "Chrome",
      os: "Windows",
      device: "Desktop",
    });
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

  it("executes 3-level identity reconciliation and both ThumbmarkJS + Fingerprint.com v1 API endpoints end-to-end", async () => {
    const healthRes = await healthGET();
    expect(healthRes.status).toBe(200);
    const healthBody = (await healthRes.json()) as {
      status: string;
      version: string;
      threatTrieCidrs: number;
    };
    expect(healthBody.status).toBe("ok");
    expect(healthBody.version).toBe(APP_VERSION);
    expect(healthBody.threatTrieCidrs).toBeGreaterThan(0);

    const sdkRes = await sdkBundleGET(new Request("http://localhost:3000/sdk/v1/bloumeid.js"));
    expect(sdkRes.status).toBe(200);
    expect(sdkRes.headers.get("etag")).toBeTruthy();

    // 0. Fresh repository has zero pre-seeded demo sites or demo events
    const initialSites = await listSites();
    const initialMetrics = await getDashboardMetrics("24h");
    expect(initialSites.some((s) => s.publicKey === "bid_pub_demo_cosmic_night_2026")).toBe(false);
    expect(
      initialMetrics.recentHighRiskEvents.some((e) => e.publicId === "req_73000000000000501")
    ).toBe(false);

    const testSite = await createSiteRecord({
      name: "Engine Test Site",
      domains: ["localhost", "app.bloume.io"],
    });
    const testPublicKey = testSite.publicKey;
    const testSecretKey = testSite.secretKeyPlain!;

    const timestamp = Date.now();
    const fullHashChrome = "f1".repeat(32);
    const fullHashFirefox = "f2".repeat(32);
    const sharedHardwareHash = "aa".repeat(32);

    const makeRequest = (nonce: string, fullHash: string, url = "http://localhost:3000/api/v1/fingerprint") => {
      const signature = computeAntiReplaySignature(
        testPublicKey,
        timestamp,
        nonce,
        fullHash,
        sharedHardwareHash
      );
      return new Request(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://app.bloume.io",
          "X-BloumeID-Key": testPublicKey,
          "X-Real-IP": "198.51.100.25",
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/131.0.0.0",
        },
        body: JSON.stringify({
          timestamp,
          nonce,
          signature,
          fullHash,
          hardwareHash: sharedHardwareHash,
          durationMs: 14,
          linkedId: "user_99",
          tag: { env: "test" },
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
      visitorFound: boolean;
      confidence: { score: number; revision: string };
      info: { crossBrowserMatched: boolean };
    };
    expect(body1.visitorId).toMatch(/^vis_/);
    expect(body1.visitorFound).toBe(false);
    expect(body1.confidence.score).toBe(0.95);
    expect(body1.confidence.revision).toBe(APP_VERSION);
    expect(body1.info.crossBrowserMatched).toBe(false);

    // 2. Second visit via Fingerprint.com /api/v1/events endpoint -> Level 1 (Same visitor, confidence 0.99, visitorFound: true)
    const res2 = await eventsPOST(makeRequest("nonce_visit_0002", fullHashChrome, "http://localhost:3000/api/v1/events"));
    const body2 = (await res2.json()) as typeof body1;
    expect(body2.visitorId).toBe(body1.visitorId);
    expect(body2.visitorFound).toBe(true);
    expect(body2.confidence.score).toBe(0.99);

    // 3. Third visit from another browser (different fullHash) but same hardwareHash + /24 subnet -> Level 2 (Cross-Browser match, confidence 0.88)
    const res3 = await fingerprintPOST(makeRequest("nonce_visit_0003", fullHashFirefox));
    const body3 = (await res3.json()) as typeof body1;
    expect(body3.visitorId).toBe(body1.visitorId);
    expect(body3.confidence.score).toBe(0.88);
    expect(body3.info.crossBrowserMatched).toBe(true);

    // 4. Replay with same nonce must fail with 409
    const replayRes = await fingerprintPOST(makeRequest("nonce_visit_0003", fullHashFirefox));
    expect(replayRes.status).toBe(409);

    // 5. Verify request via ThumbmarkJS/BloumeID endpoint (/api/v1/requests/[requestId])
    const verifyRes = await verifyRequestGET(
      new Request(`http://localhost:3000/api/v1/requests/${body3.requestId}`, {
        headers: { Authorization: `Bearer ${testSecretKey}` },
      }),
      { params: Promise.resolve({ requestId: body3.requestId }) }
    );
    expect(verifyRes.status).toBe(200);

    // 6. Verify request via Fingerprint.com Server API (/api/v1/events/[requestId])
    const fpEventRes = await verifyEventGET(
      new Request(`http://localhost:3000/api/v1/events/${body3.requestId}`, {
        headers: { "Auth-API-Key": testSecretKey },
      }),
      { params: Promise.resolve({ requestId: body3.requestId }) }
    );
    expect(fpEventRes.status).toBe(200);
    const fpEventBody = (await fpEventRes.json()) as {
      products: { identification: { data: { visitorId: string } } };
    };
    expect(fpEventBody.products.identification.data.visitorId).toBe(body1.visitorId);

    // 7. Get visitor & Fingerprint.com visitor visits history (/api/v1/visitors/[visitorId]/visits)
    const visitorRes = await getVisitorGET(
      new Request(`http://localhost:3000/api/v1/visitors/${body1.visitorId}`, {
        headers: { Authorization: `Bearer ${testSecretKey}` },
      }),
      { params: Promise.resolve({ visitorId: body1.visitorId }) }
    );
    expect(visitorRes.status).toBe(200);

    const visitsRes = await getVisitorVisitsGET(
      new Request(`http://localhost:3000/api/v1/visitors/${body1.visitorId}/visits?limit=10`, {
        headers: { "Auth-API-Key": testSecretKey },
      }),
      { params: Promise.resolve({ visitorId: body1.visitorId }) }
    );
    expect(visitsRes.status).toBe(200);
    const visitsBody = (await visitsRes.json()) as { visitorId: string; visits: unknown[] };
    expect(visitsBody.visitorId).toBe(body1.visitorId);
    expect(visitsBody.visits.length).toBeGreaterThanOrEqual(3);

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

  it("validates MMDB magic header and falls back across GeoLite2 mirrors", async () => {
    const invalidBuf = Buffer.from("<html>404 Not Found</html>");
    expect(isValidMmdbBuffer(invalidBuf, 10)).toBe(false);

    const validMmdbStub = Buffer.concat([
      Buffer.alloc(1024, 0x01),
      Buffer.from([0xab, 0xcd, 0xef]),
      Buffer.from("MaxMind.com"),
    ]);
    expect(isValidMmdbBuffer(validMmdbStub, 1024)).toBe(true);

    const fsMod = await import("node:fs");
    const osMod = await import("node:os");
    const pathMod = await import("node:path");
    const tmpGeoDir = fsMod.mkdtempSync(pathMod.join(osMod.tmpdir(), "bloumeid-geoip-"));

    let attempt = 0;
    const mockFetch: typeof fetch = async (input) => {
      attempt += 1;
      const url = String(input);
      if (url.includes("github.com")) {
        return new Response("Forbidden", { status: 403 });
      }
      return new Response(new Uint8Array(validMmdbStub), { status: 200 });
    };

    const res = await downloadAndUpdateGeoLite2({
      customDir: tmpGeoDir,
      fetchImpl: mockFetch,
      minBytes: 1024,
    });
    expect(attempt).toBeGreaterThanOrEqual(4);
    expect(res.cityUpdated).toBe(true);
    expect(res.asnUpdated).toBe(true);
    expect(res.errors.length).toBeGreaterThanOrEqual(2);
    expect(fsMod.existsSync(pathMod.join(tmpGeoDir, "GeoLite2-City.mmdb"))).toBe(true);
    expect(fsMod.existsSync(pathMod.join(tmpGeoDir, "GeoLite2-ASN.mmdb"))).toBe(true);

    fsMod.rmSync(tmpGeoDir, { recursive: true, force: true });
  });

  it("enriches landing live inspector via POST /api/v1/preview with real IP & GeoIP without DB writes", async () => {
    const res = await previewPOST(
      new Request("http://localhost:3000/api/v1/preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Forwarded-For": "185.159.156.42, 10.0.0.1",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0.0.0",
        },
        body: JSON.stringify({
          fullHash: "cd".repeat(32),
          hardwareHash: "eb".repeat(32),
          durationMs: 42,
          tag: "landing_live_inspector",
          components: {
            antiSpoof: { isBot: false, isSpoofed: false, isIncognito: false },
          },
        }),
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ip: string;
      confidence: { revision: string };
      ipLocation: {
        city: { name: string | null };
        country: { code: string | null; name: string | null };
        asn: { asn: string | null; name: string | null };
      };
    };
    expect(body.ip).toBe("185.159.156.42");
    expect(body.confidence.revision).toBe(APP_VERSION);
    expect(body.ipLocation.country.code).toBe("FR");
    expect(body.ipLocation.city.name).toBe("Paris");
    expect(body.ipLocation.asn.asn).toBe("AS212238");
  });
});
