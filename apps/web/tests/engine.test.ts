import zlib from "node:zlib";
import { describe, expect, it, vi } from "vitest";
import { computeAntiReplaySignature, encryptFingerprintEnvelope } from "@bloume/id";
import { BloumeIDServer } from "@bloume/id/server";
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
  badAsnCount,
  classifyAsnOrganization,
  lookupBadAsn,
} from "../src/lib/engine/cidr-trie";
import { THREAT_FEEDS, syncAllThreatFeeds } from "../src/lib/engine/feeds";
import {
  evaluateClientHintsConsistency,
  evaluateJa4Consistency,
  extractIpSubnet,
  extractRealClientIp,
  isOriginAllowedForSite,
  parseUserAgentSummary,
  resolveOrSynthesizeJa4,
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
  findSiteByPublicKey,
  getDashboardMetrics,
  getReconciliationStore,
  listFingerprintEventsPaginated,
  listSites,
  listVisitorsPaginated,
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

  it("performs O(32) IPv4 and O(128) IPv6 CIDR lookups in Patricia/Radix Trie and classifies Datacenter/VPN ASNs", () => {
    const trie = new CidrRadixTrie();
    expect(trie.insert("185.220.101.0/24", "tor")).toBe(true);
    expect(trie.insert("2a0b:f4c2::/48", "tor")).toBe(true);
    expect(trie.insert("2001:67c:289c:1::42", "tor")).toBe(true);
    expect(trie.insert("51.38.0.0/16", "datacenter")).toBe(true);
    expect(trie.insert("193.138.218.0/24", "vpn")).toBe(true);
    expect(trie.insert("# comment line", "vpn")).toBe(false);

    expect(trie.size()).toBe(5);
    expect(trie.lookup("185.220.101.45").has("tor")).toBe(true);
    expect(trie.lookup("::ffff:185.220.101.45").has("tor")).toBe(true);
    expect(trie.lookup("2a0b:f4c2::cafe").has("tor")).toBe(true);
    expect(trie.lookup("2001:67c:289c:1::42").has("tor")).toBe(true);
    expect(trie.lookup("2001:4860:4860::8888").size).toBe(0);
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

    // 1. First visit -> Level 3 (New Visitor, confidence 0.95) & minimal zero-leak public response + sealedResult
    const res1 = await fingerprintPOST(makeRequest("nonce_visit_0001", fullHashChrome));
    expect(res1.status).toBe(200);
    const body1 = (await res1.json()) as Record<string, unknown> & {
      visitorId: string;
      requestId: string;
      visitorFound: boolean;
      thumbmark: string;
      confidence: { score: number; revision: string };
      sealedResult: string;
    };
    expect(body1.visitorId).toMatch(/^vis_/);
    expect(body1.visitorFound).toBe(false);
    expect(body1.thumbmark).toBe(fullHashChrome);
    expect(body1.confidence.score).toBe(0.95);
    expect(body1.confidence.revision).toBe(APP_VERSION);
    expect(body1.sealedResult).toMatch(/^v1\./);
    expect(body1.info).toBeUndefined();
    expect(body1.components).toBeUndefined();
    expect(body1.ip).toBeUndefined();
    expect(body1.ipLocation).toBeUndefined();

    const serverClient = new BloumeIDServer({ secretKey: testSecretKey });
    const unsealed1 = serverClient.unsealResult(body1.sealedResult);
    expect(unsealed1.flags.crossBrowserMatched).toBe(false);
    expect(unsealed1.network.ja4Hash).toMatch(/^t13d1516/);

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
    const unsealed3 = serverClient.unsealResult(body3.sealedResult);
    expect(unsealed3.flags.crossBrowserMatched).toBe(true);

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
    const internalSite = await findSiteByPublicKey(testPublicKey);
    expect(internalSite).not.toBeNull();
    const rec = await reconcileVisitorIdentity(store, {
      siteInternalId: internalSite!.id,
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
      const parsedUrl = new URL(String(input));
      if (parsedUrl.hostname === "github.com") {
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

  it("handles v2 AES-256-GCM transport, ±60s replay protection, Tor Browser IPv6 signature, Chrome 158 parser & non-null JA4", async () => {
    const testSite = await createSiteRecord({
      name: "Encrypted v2 & Tor Test Site",
      domains: ["localhost", "app.bloume.io"],
    });
    const serverClient = new BloumeIDServer({ secretKey: testSite.secretKeyPlain! });
    const origin = "https://app.bloume.io";
    const fullHash = "9a".repeat(32);
    const hardwareHash = "8b".repeat(32);

    const ts = Date.now();
    const nonce = `nonce_v2_tor_${ts}`;
    const envelope = await encryptFingerprintEnvelope({
      publicKey: testSite.publicKey,
      ts,
      nonce,
      origin,
      payload: {
        fullHash,
        hardwareHash,
        durationMs: 22,
        components: {
          webgl: { vendor: "Mozilla", renderer: "Mozilla" },
          timezoneIntl: { timezone: "Atlantic/Reykjavik", timezoneOffsetMinutes: 0 },
          webrtc: { available: false },
          speech: { voiceCount: 0 },
          mediaCodecs: { audioInputCount: 0 },
          canvas: { doubleRenderConsistent: false },
          hardware: { globalPrivacyControl: true, deviceMemory: 0, platform: "Win32" },
          userAgentData: {
            userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/158.0.0.0",
            platform: "Windows",
            platformVersion: "15.0.0",
            brands: [{ brand: "Google Chrome", version: "158" }],
          },
          antiSpoof: { isBot: false, isSpoofed: true, isIncognito: true, isTorBrowser: true },
        },
      },
    });
    expect(envelope).not.toBeNull();

    const torReq = new Request("http://localhost:3000/api/v1/fingerprint", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: origin,
        "X-BloumeID-Key": testSite.publicKey,
        "X-Real-IP": "2a0b:f4c2::99",
        "Sec-CH-UA": '"Google Chrome";v="158"',
        "Sec-CH-UA-Platform": '"Windows"',
        "Sec-CH-UA-Platform-Version": '"15.0.0"',
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/158.0.0.0",
      },
      body: JSON.stringify(envelope),
    });

    const okRes = await fingerprintPOST(torReq);
    expect(okRes.status).toBe(200);
    const okJson = (await okRes.json()) as {
      visitorId: string;
      requestId: string;
      thumbmark: string;
      sealedResult: string;
    };
    expect(okJson.thumbmark).toBe(fullHash);
    expect(okJson.sealedResult).toMatch(/^v1\./);

    const verified = serverClient.unsealResult(okJson.sealedResult);
    expect(verified.flags.isTor).toBe(true);
    expect(verified.dangerLevel).toBe(5);
    expect(verified.network.ja4Hash).toMatch(/^t13d1516h2_/);
    expect(verified.browser?.name).toBe("Chrome");
    expect(verified.browser?.version).toBe("158.0");
    expect(verified.browser?.os).toBe("Windows");
    expect(verified.browser?.osVersion).toBe("11");

    // Replaying exact encrypted v2 payload must return 409 Conflict
    const replayRes = await fingerprintPOST(
      new Request("http://localhost:3000/api/v1/fingerprint", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: origin,
          "X-BloumeID-Key": testSite.publicKey,
        },
        body: JSON.stringify(envelope),
      })
    );
    expect(replayRes.status).toBe(409);

    // Expired >60s v2 timestamp must return 400
    const oldTs = Date.now() - 90 * 1000;
    const oldEnv = await encryptFingerprintEnvelope({
      publicKey: testSite.publicKey,
      ts: oldTs,
      nonce: `nonce_old_${oldTs}`,
      origin,
      payload: { fullHash, hardwareHash, components: {} },
    });
    const expiredRes = await fingerprintPOST(
      new Request("http://localhost:3000/api/v1/fingerprint", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: origin,
          "X-BloumeID-Key": testSite.publicKey,
        },
        body: JSON.stringify(oldEnv),
      })
    );
    expect(expiredRes.status).toBe(400);

    // Real site counts (requests24h / requests30d) & real avgCollectionMs in dashboard metrics
    const sitesAfter = await listSites();
    const matchedSite = sitesAfter.find((s) => s.publicId === testSite.publicId);
    expect(matchedSite?.requests24h).toBeGreaterThanOrEqual(1);
    expect(matchedSite?.requests30d).toBeGreaterThanOrEqual(1);

    const siteMetrics = await getDashboardMetrics("24h", testSite.publicId);
    expect(siteMetrics.totalEvents).toBeGreaterThanOrEqual(1);
    expect(siteMetrics.avgCollectionMs).toBeGreaterThanOrEqual(22);
  });

  it("syncs 15 CIDR/ASN threat feeds including AWS/GCP JSON, Spamhaus DROP, IPv6 VPN/Tor and Bad-ASN CSV", async () => {
    expect(THREAT_FEEDS.length).toBeGreaterThanOrEqual(15);

    const mockFeedFetch: typeof fetch = async (input) => {
      const parsed = new URL(String(input));
      if (parsed.hostname === "ip-ranges.amazonaws.com") {
        return new Response(
          JSON.stringify({
            prefixes: [{ ip_prefix: "3.10.0.0/16" }],
            ipv6_prefixes: [{ ipv6_prefix: "2600:1f00::/24" }],
          }),
          { status: 200 }
        );
      }
      if (parsed.hostname === "www.gstatic.com" && parsed.pathname === "/ipranges/cloud.json") {
        return new Response(
          JSON.stringify({
            prefixes: [{ ipv4Prefix: "35.190.0.0/16" }, { ipv6Prefix: "2600:1900::/28" }],
          }),
          { status: 200 }
        );
      }
      if (parsed.hostname === "onionoo.torproject.org") {
        return new Response(
          JSON.stringify({ relays: [{ r: true, a: ["[2a0b:f4c2::7]:9001"] }] }),
          { status: 200 }
        );
      }
      if (
        parsed.hostname === "raw.githubusercontent.com" &&
        parsed.pathname === "/brianhama/bad-asn-list/master/bad-asn-list.csv"
      ) {
        return new Response('ASN,Entity\n199999,"Bulletproof Host Test"', { status: 200 });
      }
      if (parsed.hostname === "www.spamhaus.org" && parsed.pathname === "/drop/drop.txt") {
        return new Response("1.10.16.0/20 ; SBL999\n", { status: 200 });
      }
      if (parsed.hostname === "www.spamhaus.org" && parsed.pathname === "/drop/dropv6.txt") {
        return new Response("2a06:a005::/32 ; SBL998\n", { status: 200 });
      }
      return new Response("198.18.0.0/24\n", { status: 200 });
    };

    const syncRes = await syncAllThreatFeeds(mockFeedFetch);
    expect(syncRes.feeds.length).toBe(THREAT_FEEDS.length);
    expect(syncRes.totalCidrs).toBeGreaterThanOrEqual(6);
    expect(badAsnCount()).toBeGreaterThanOrEqual(1);
    expect(lookupBadAsn(199999)).toBe("Bulletproof Host Test");
  });

  it("canonicalizes compressed IPv6 / IPv4-mapped /24 subnets, catches Linux/Android Client Hints spoofing and stabilizes JA4 synthesis", () => {
    expect(extractIpSubnet("2001::1")).toBe("2001:0:0::/48");
    expect(extractIpSubnet("::ffff:7f00:1")).toBe("127.0.0.0/24");

    // Linux platform claimed in Sec-CH-UA vs Windows navigator.platform -> spoof
    expect(
      evaluateClientHintsConsistency(
        new Headers({ "sec-ch-ua-platform": '"Linux"' }),
        "Win32"
      ).inconsistent
    ).toBe(true);

    // Android Chrome legitimately reports Linux armv8l in navigator.platform
    expect(
      evaluateClientHintsConsistency(
        new Headers({ "sec-ch-ua-platform": '"Android"' }),
        "Linux armv8l"
      ).inconsistent
    ).toBe(false);

    // Ephemeral proxy/cookie headers must not alter synthesized JA4 hash
    const h1 = new Headers({
      "sec-ch-ua": '"Chromium";v="158"',
      "sec-ch-ua-platform": '"Windows"',
      accept: "*/*",
      "user-agent": "Chrome/158",
    });
    const h2 = new Headers({
      "sec-ch-ua": '"Chromium";v="158"',
      "sec-ch-ua-platform": '"Windows"',
      accept: "*/*",
      "user-agent": "Chrome/158",
      cookie: "session=secret",
      "cf-ray": "abc123-CDG",
    });
    expect(resolveOrSynthesizeJa4(h1)).toBe(resolveOrSynthesizeJa4(h2));
  });

  it("returns empty paginated results cleanly without injecting stale fallback records", async () => {
    const emptyEvents = await listFingerprintEventsPaginated({
      query: "__nonexistent_bloume_query_xyz__",
      page: 1,
      pageSize: 25,
    });
    expect(emptyEvents.items).toEqual([]);
    expect(emptyEvents.pagination.totalItems).toBe(0);

    const emptyVisitors = await listVisitorsPaginated({
      query: "__nonexistent_bloume_query_xyz__",
      page: 1,
      pageSize: 25,
    });
    expect(emptyVisitors.items).toEqual([]);
    expect(emptyVisitors.pagination.totalItems).toBe(0);
  });

  it("matches hex IPv4-mapped IPv6 addresses against IPv4 CIDR rules and swaps threat feeds atomically", async () => {
    const trie = new CidrRadixTrie();
    trie.insert("185.220.101.0/24", "tor");
    expect(trie.lookup("::ffff:b9dc:6521").has("tor")).toBe(true);

    // Trigger syncAllThreatFeeds and verify staging swap leaves globalThreatTrie populated mid-flight
    const { globalThreatTrie } = await import("../src/lib/engine/cidr-trie");
    globalThreatTrie.insert("198.51.100.0/24", "proxy");
    let sizeDuringFetch = 0;
    await syncAllThreatFeeds(async () => {
      sizeDuringFetch = Math.max(sizeDuringFetch, globalThreatTrie.size());
      return new Response("192.0.2.0/24\n", { status: 200 });
    });
    expect(sizeDuringFetch).toBeGreaterThan(0);
  });

  it("rejects empty or /0 wildcard CIDR prefixes without poisoning benign IPs", () => {
    const trie = new CidrRadixTrie();
    expect(trie.insert("198.51.100.1/", "tor")).toBe(false);
    expect(trie.insert("0.0.0.0/0", "vpn")).toBe(false);
    expect(trie.insert("2001:db8::/", "datacenter")).toBe(false);
    expect(trie.insert("198.51.100.0/24/extra", "proxy")).toBe(false);
    expect(trie.size()).toBe(0);
    expect(trie.lookup("8.8.8.8").size).toBe(0);
  });

  it("returns deterministic threat feed IDs and aggregates dashboard metrics cleanly", async () => {
    const { getDashboardMetrics, listThreatFeedStatuses } = await import("../src/lib/engine/repository");
    const first = await listThreatFeedStatuses();
    const second = await listThreatFeedStatuses();
    expect(first.map((f) => f.publicId)).toEqual(second.map((f) => f.publicId));

    const metrics = await getDashboardMetrics("24h");
    expect(metrics.totalEvents).toBeGreaterThanOrEqual(0);
    expect(metrics.uniqueVisitors).toBeLessThanOrEqual(metrics.totalEvents);

    const { listSites } = await import("../src/lib/engine/repository");
    const sites = await listSites();
    for (const s of sites) {
      expect(s.requests24h ?? 0).toBeGreaterThanOrEqual(0);
      expect(s.requests30d ?? 0).toBeGreaterThanOrEqual(s.requests24h ?? 0);
    }
  });

  it("reconciles Level 1 and Level 2 visitors cleanly without unnecessary full-array copies", async () => {
    const { createSiteRecord, getReconciliationStore, recordFingerprintEvent } = await import(
      "../src/lib/engine/repository"
    );
    const { reconcileVisitorIdentity } = await import("../src/lib/engine/reconcile");
    const site = await createSiteRecord({ name: "Reconcile Perf Site", domains: ["localhost"] });
    const store = getReconciliationStore();
    const first = await reconcileVisitorIdentity(store, {
      siteInternalId: 999999,
      fullHash: "hash_lvl1_perf_test_0001",
      hardwareHash: "hw_lvl2_perf_test_0001",
      ipSubnet: "198.51.100.0/24",
      dangerLevel: 0,
      isSpoofed: false,
    });
    await recordFingerprintEvent({
      publicId: "req_perf_test_001",
      siteId: 999999,
      visitorId: first.visitorInternalId,
      fullHash: "hash_lvl1_perf_test_0001",
      hardwareHash: "hw_lvl2_perf_test_0001",
      ipAddress: "198.51.100.10",
      ipSubnet: "198.51.100.0/24",
      ja4Hash: null,
      asnNumber: null,
      asnOrg: null,
      country: null,
      city: null,
      isVpn: false,
      isProxy: false,
      isTor: false,
      isDatacenter: false,
      isBot: false,
      isSpoofed: false,
      isIncognito: false,
      crossBrowserMatched: false,
      dangerLevel: 0,
      confidence: 0.95,
      browser: "Chrome",
      os: "Windows",
      device: "Desktop",
      userAgent: "TestAgent",
      origin: "http://localhost",
      components: {} as never,
    });
    expect(site.publicId).toMatch(/^site_/);
    const second = await reconcileVisitorIdentity(store, {
      siteInternalId: 999999,
      fullHash: "hash_lvl1_perf_test_0001",
      hardwareHash: "hw_lvl2_perf_test_0001",
      ipSubnet: "198.51.100.0/24",
      dangerLevel: 0,
      isSpoofed: false,
    });
    expect(second.visitorPublicId).toBe(first.visitorPublicId);
    expect(second.matchType).toBe("exact_full_hash");
  });
});
