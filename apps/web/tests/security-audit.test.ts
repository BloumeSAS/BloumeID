import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { describe, expect, it } from "vitest";
import { POST as fingerprintPOST } from "../src/app/api/v1/fingerprint/route";
import { createSiteRecord } from "../src/lib/engine/repository";

describe("Phase 8 — Final Security Audit, Zero-'any' Check & UMD Bundle Execution", () => {
  it("verifies zero explicit 'any' across all TypeScript source files in apps/web and packages/bloumeid", () => {
    const roots = [
      path.resolve(__dirname, "../src"),
      path.resolve(__dirname, "../../../packages/bloumeid/src"),
    ];

    const collectTsFiles = (dir: string): string[] => {
      if (!fs.existsSync(dir)) return [];
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const files: string[] = [];
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          files.push(...collectTsFiles(full));
        } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".test.ts")) {
          files.push(full);
        }
      }
      return files;
    };

    const allFiles = roots.flatMap(collectTsFiles);
    expect(allFiles.length).toBeGreaterThan(20);

    for (const file of allFiles) {
      const content = fs.readFileSync(file, "utf8");
      const hasExplicitAny = /:\s*any\b|as\s+any\b|<any>/m.test(content);
      expect(hasExplicitAny, `Explicit 'any' forbidden in ${file}`).toBe(false);
    }
  });

  it("blocks disallowed CORS origins and expired anti-replay timestamps on POST /api/v1/fingerprint", async () => {
    const testSite = await createSiteRecord({
      name: "Security Audit Site",
      domains: ["localhost", "app.bloume.io"],
    });
    const disallowedCorsRes = await fingerprintPOST(
      new Request("http://localhost:3000/api/v1/fingerprint", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://untrusted-phishing-domain.org",
          "X-BloumeID-Key": testSite.publicKey,
        },
        body: JSON.stringify({}),
      })
    );
    expect(disallowedCorsRes.status).toBe(403);

    const expiredTimestampRes = await fingerprintPOST(
      new Request("http://localhost:3000/api/v1/fingerprint", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://app.bloume.io",
          "X-BloumeID-Key": testSite.publicKey,
        },
        body: JSON.stringify({
          timestamp: Date.now() - 10 * 60 * 1000, // 10 minutes old (> 5 min window)
          nonce: "nonce_expired_12345",
          signature: "a".repeat(64),
          fullHash: "b".repeat(64),
          hardwareHash: "c".repeat(64),
          components: {},
        }),
      })
    );
    expect(expiredTimestampRes.status).toBe(400);
  });

  it("loads and executes the compiled UMD bundle (public/sdk/v1/bloumeid.js) in a browser-like VM context", async () => {
    const umdPath = path.resolve(__dirname, "../public/sdk/v1/bloumeid.js");
    expect(fs.existsSync(umdPath)).toBe(true);
    const code = fs.readFileSync(umdPath, "utf8");
    expect(code.length).toBeGreaterThan(1000);
    expect(code.length).toBeLessThan(150 * 1024);

    const sandboxWindow: Record<string, unknown> = {
      navigator: {
        userAgent: "Mozilla/5.0 Chrome/131.0.0.0",
        language: "fr-FR",
        languages: ["fr-FR", "en-US"],
        hardwareConcurrency: 8,
        maxTouchPoints: 0,
        platform: "Win32",
        vendor: "Google Inc.",
        cookieEnabled: true,
      },
      screen: {
        width: 1920,
        height: 1080,
        availWidth: 1920,
        availHeight: 1040,
        colorDepth: 24,
        pixelDepth: 24,
      },
      TextEncoder,
      Uint8Array,
      Uint32Array,
      DataView,
      ArrayBuffer,
      Intl,
      Date,
      Math,
      Error,
      Promise,
      setTimeout,
      clearTimeout,
    };
    sandboxWindow.window = sandboxWindow;
    sandboxWindow.globalThis = sandboxWindow;

    const context = vm.createContext(sandboxWindow);
    vm.runInContext(code, context);

    const exportedGlobal = sandboxWindow.BloumeID as
      | { BloumeID?: new (cfg?: unknown) => { getFingerprint: () => Promise<string> } }
      | (new (cfg?: unknown) => { getFingerprint: () => Promise<string> });

    const Ctor =
      typeof exportedGlobal === "function"
        ? exportedGlobal
        : exportedGlobal?.BloumeID;

    expect(typeof Ctor).toBe("function");
    const instance = new Ctor!({ options: { exclude: ["webrtc", "audio", "webgpu"] } });
    const fp = await instance.getFingerprint();
    expect(fp).toHaveLength(64);
  });

  it("blocks SSRF webhook URLs targeting loopback, private, and cloud metadata IPs", async () => {
    const { validateWebhookUrl } = await import("../src/lib/engine/webhooks");
    expect(validateWebhookUrl("http://127.0.0.1:8080/hook").valid).toBe(false);
    expect(validateWebhookUrl("http://169.254.169.254/latest/meta-data/").valid).toBe(false);
    expect(validateWebhookUrl("http://10.0.0.5/internal").valid).toBe(false);
    expect(validateWebhookUrl("http://192.168.1.10/admin").valid).toBe(false);
    expect(validateWebhookUrl("http://localhost:3000/api").valid).toBe(false);
    expect(validateWebhookUrl("https://[::1]/hook").valid).toBe(false);
    expect(validateWebhookUrl("https://[::ffff:127.0.0.1]/hook").valid).toBe(false);
    expect(validateWebhookUrl("https://[::ffff:169.254.169.254]/latest/meta-data/").valid).toBe(false);
    expect(validateWebhookUrl("https://[fe80::1]/hook").valid).toBe(false);
    expect(validateWebhookUrl("https://224.0.0.1/hook").valid).toBe(false);
    expect(validateWebhookUrl("https://hooks.bloume.fr/webhook").valid).toBe(true);
  });

  it("neutralizes CSV formula injection and skips path-traversal tar entries safely", async () => {
    const { sanitizeCsvCell } = await import("../src/lib/security");
    const { extractMmdbFromTarGzBuffer } = await import("../src/lib/engine/geoip");
    const zlib = await import("node:zlib");

    expect(sanitizeCsvCell("=CMD|' /C calc'!A0")).toBe("'=CMD|' /C calc'!A0");
    expect(sanitizeCsvCell("+1+2")).toBe("'+1+2");
    expect(sanitizeCsvCell('@SUM(1,2)')).toBe(`"'@SUM(1,2)"`);
    expect(sanitizeCsvCell('Paris, FR')).toBe('"Paris, FR"');

    // Build tar archive with traversal payload first, valid .mmdb entry second
    const makeHeader = (name: string, size: number): Buffer => {
      const h = Buffer.alloc(512, 0);
      h.write(name, 0, "utf8");
      h.write(size.toString(8).padStart(11, "0"), 124, "utf8");
      return h;
    };
    const badPayload = Buffer.from("EVIL", "utf8");
    const badDataBlock = Buffer.concat([badPayload, Buffer.alloc(512 - badPayload.length, 0)]);
    const goodPayload = Buffer.from("MMDB_OK", "utf8");
    const goodDataBlock = Buffer.concat([goodPayload, Buffer.alloc(512 - goodPayload.length, 0)]);

    const tarBuf = Buffer.concat([
      makeHeader("../evil.mmdb", badPayload.length),
      badDataBlock,
      makeHeader("GeoLite2/GeoLite2-City.mmdb", goodPayload.length),
      goodDataBlock,
      Buffer.alloc(1024, 0),
    ]);
    const gz = zlib.gzipSync(tarBuf);
    const extracted = extractMmdbFromTarGzBuffer(gz);
    expect(extracted?.toString("utf8")).toBe("MMDB_OK");
  });

  it("rejects oversized (> 64 KB) JSON payloads on POST /api/v1/fingerprint with 413", async () => {
    const { POST } = await import("../src/app/api/v1/fingerprint/route");
    const testSite = await createSiteRecord({
      name: "Oversize Test Site",
      domains: ["localhost"],
    });
    const bigString = "x".repeat(70 * 1024);

    const req = new Request("http://localhost:3000/api/v1/fingerprint", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
        "X-BloumeID-Key": testSite.publicKey,
      },
      body: JSON.stringify({ bigString }),
    });

    const res = await POST(req);
    expect(res.status).toBe(413);
  });

  it("blocks unauthenticated requests across /api/admin/* and enforces Open Redirect & Prototype Pollution guards", async () => {
    const { GET: sitesListGET } = await import("../src/app/api/admin/sites/route");
    const { GET: siteByIdGET } = await import("../src/app/api/admin/sites/[siteId]/route");
    const { GET: visitorsGET } = await import("../src/app/api/admin/visitors/route");
    const { GET: rulesGET } = await import("../src/app/api/admin/rules/route");
    const { GET: settingsGET } = await import("../src/app/api/admin/settings/route");
    const { sanitizeInternalRedirect, isJsonPayloadSafe } = await import("../src/lib/security");
    const { POST: previewPOST } = await import("../src/app/api/v1/preview/route");

    expect((await sitesListGET(new Request("http://localhost:3000/api/admin/sites"))).status).toBe(401);
    expect(
      (
        await siteByIdGET(new Request("http://localhost:3000/api/admin/sites/site_123"), {
          params: Promise.resolve({ siteId: "site_123" }),
        })
      ).status
    ).toBe(401);
    expect((await visitorsGET(new Request("http://localhost:3000/api/admin/visitors"))).status).toBe(401);
    expect((await rulesGET(new Request("http://localhost:3000/api/admin/rules"))).status).toBe(401);
    expect((await settingsGET(new Request("http://localhost:3000/api/admin/settings"))).status).toBe(401);

    // Open Redirect prevention
    expect(sanitizeInternalRedirect("https://evil.example.com")).toBe("/dashboard");
    expect(sanitizeInternalRedirect("//evil.example.com")).toBe("/dashboard");
    expect(sanitizeInternalRedirect("/\\evil.example.com")).toBe("/dashboard");
    expect(sanitizeInternalRedirect("/sites")).toBe("/sites");
    expect(sanitizeInternalRedirect("/guides")).toBe("/guides");

    // Prototype Pollution guard
    const pollutedObj = JSON.parse('{"__proto__":{"isAdmin":true},"components":{}}') as unknown;
    expect(isJsonPayloadSafe(pollutedObj)).toBe(false);

    const pollutedRes = await previewPOST(
      new Request("http://localhost:3000/api/v1/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: '{"__proto__":{"isAdmin":true},"fullHash":"aaaaaaaaaaaaaaaa","hardwareHash":"bbbbbbbbbbbbbbbb"}',
      })
    );
    expect(pollutedRes.status).toBe(400);
  });

  it("enforces strict public vs secret key separation, HTTP security headers & SDK server ID validation", async () => {
    const { GET: verifyRequestGET } = await import("../src/app/api/v1/requests/[requestId]/route");
    const { GET: getVisitorGET } = await import("../src/app/api/v1/visitors/[visitorId]/route");
    const { BloumeIDServer } = await import("@bloume/id/server");
    const nextConfig = (await import("../next.config")).default;

    const testSite = await createSiteRecord({
      name: "Privilege Sep Site",
      domains: ["localhost"],
    });

    // Public key bid_pub_ MUST be rejected on secret endpoints
    const reqWithPubKey = await verifyRequestGET(
      new Request("http://localhost:3000/api/v1/requests/req_73000000000000501", {
        headers: { Authorization: `Bearer ${testSite.publicKey}` },
      }),
      { params: Promise.resolve({ requestId: "req_73000000000000501" }) }
    );
    expect(reqWithPubKey.status).toBe(401);

    const visWithPubKey = await getVisitorGET(
      new Request("http://localhost:3000/api/v1/visitors/vis_73000000000000101", {
        headers: { Authorization: `Bearer ${testSite.publicKey}` },
      }),
      { params: Promise.resolve({ visitorId: "vis_73000000000000101" }) }
    );
    expect(visWithPubKey.status).toBe(401);

    // HTTP Security headers configured
    const headerRules = await nextConfig.headers?.();
    const allHeaders = headerRules?.[0]?.headers ?? [];
    const headerNames = allHeaders.map((h) => h.key);
    expect(headerNames).toContain("X-Frame-Options");
    expect(headerNames).toContain("X-Content-Type-Options");
    expect(headerNames).toContain("Content-Security-Policy");
    expect(headerNames).toContain("Referrer-Policy");
    expect(headerNames).toContain("Permissions-Policy");

    // SDK server client rejects traversal / invalid Snowflake IDs
    const sdkServer = new BloumeIDServer({ secretKey: "bid_sec_test_key_123456" });
    await expect(sdkServer.verifyRequest("req_123/../admin")).rejects.toThrow();
    await expect(sdkServer.getVisitor("vis_123?admin=1")).rejects.toThrow();
  });

  it("handles NaN query params, rejects visitor self-merge and enforces numeric gte rules safely", async () => {
    const { GET: eventsGET } = await import("../src/app/api/admin/events/route");
    const { PATCH: visitorsPATCH } = await import("../src/app/api/admin/visitors/route");
    const { POST: rulesPOST } = await import("../src/app/api/admin/rules/route");
    const { computePaginationMeta } = await import("../src/lib/pagination");
    const { evaluateSecurityRules } = await import("../src/lib/engine/rules");
    const { getConfiguredMasterKey } = await import("../src/lib/auth");

    const masterKey = getConfiguredMasterKey();

    // NaN query param on admin/events must not crash or return NaN
    const nanEventsRes = await eventsGET(
      new Request("http://localhost:3000/api/admin/events?minDanger=notanumber", {
        headers: { "X-Admin-Master-Key": masterKey },
      })
    );
    expect(nanEventsRes.status).toBe(200);

    // Pagination helper NaN safety
    const meta = computePaginationMeta(Number.NaN, Number.NaN, 10);
    expect(meta.page).toBe(1);
    expect(meta.pageSize).toBe(1);
    expect(meta.totalPages).toBe(10);

    // Reject self-merge on visitor PATCH
    const selfMergeRes = await visitorsPATCH(
      new Request("http://localhost:3000/api/admin/visitors", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Master-Key": masterKey,
        },
        body: JSON.stringify({
          publicId: "vis_123456",
          mergeSourceVisitorId: "vis_123456",
        }),
      })
    );
    expect(selfMergeRes.status).toBe(400);

    // Prototype pollution rejected on admin/rules POST
    const pollutedRuleRes = await rulesPOST(
      new Request("http://localhost:3000/api/admin/rules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Master-Key": masterKey,
        },
        body: '{"__proto__":{"polluted":true},"name":"Bad","action":"block","conditions":[]}',
      })
    );
    expect(pollutedRuleRes.status).toBe(400);

    // Numeric `gte` rule must reject empty/non-numeric thresholds rather than coercing "" -> 0
    const ruleEval = evaluateSecurityRules(
      [
        {
          publicId: "rule_nan_test",
          sitePublicId: null,
          name: "Invalid gte",
          action: "block",
          priority: 1,
          isEnabled: true,
          hitCount: 0,
          conditions: [{ field: "dangerLevel", operator: "gte", value: "" }],
        },
      ],
      {
        sitePublicId: "site_1",
        visitorPublicId: "vis_1",
        isTor: false,
        isVpn: false,
        isDatacenter: false,
        isBot: false,
        isSpoofed: false,
        dangerLevel: 0,
        country: "FR",
        asnNumber: 3215,
        ipSubnet: "198.51.100.0/24",
      }
    );
    expect(ruleEval.action).toBe("allow");
  });
});

